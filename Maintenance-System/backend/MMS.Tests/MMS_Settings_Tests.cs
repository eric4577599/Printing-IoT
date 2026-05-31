using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MMS.Core.Entities;
using MMS.Infrastructure.Data;
using System.Net.Http.Json;

namespace MMS.Tests;

/// <summary>
/// 以 InMemory DB 取代 Postgres,讓設定模組可在 CI 全情境測試下執行。
/// </summary>
public class MmsWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram> where TProgram : class
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("environment", "Testing");

        builder.ConfigureServices(services =>
        {
            var descriptors = services.Where(
                d => d.ServiceType == typeof(DbContextOptions<MmsDbContext>) ||
                     d.ServiceType == typeof(DbContextOptions) ||
                     d.ServiceType == typeof(MmsDbContext)).ToList();
            foreach (var d in descriptors) services.Remove(d);

            services.AddDbContext<MmsDbContext>(options =>
            {
                options.UseInMemoryDatabase("MmsInMemoryDbForTesting");
                options.EnableSensitiveDataLogging();
            });
        });
    }
}

public record ErpPush(string Key, string MachineCode, string? Value);

public class MMS_Settings_Tests : IClassFixture<MmsWebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public MMS_Settings_Tests(MmsWebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ScenarioSettings_Cascade_Inherit_Vs_LocalOverride_FullFlow()
    {
        // 1. 建立兩筆設定:一筆繼承 ERP、一筆本地覆寫
        var inherit = new MaintenanceSetting
        {
            Key = "PreventiveIntervalDays", DisplayName = "預防保養週期",
            MachineCode = "M-01", Unit = "days",
            Source = SettingSource.InheritErp
        };
        var local = new MaintenanceSetting
        {
            Key = "AlertThreshold", DisplayName = "告警門檻",
            MachineCode = "M-01", Unit = "count",
            Source = SettingSource.LocalOverride, LocalValue = "5"
        };

        var inheritCreated = await PostSetting(inherit);
        var localCreated = await PostSetting(local);

        // 2. 初始狀態:繼承項尚無 ERP 值 → EffectiveValue 為 null;本地項 → "5"
        Assert.Null(inheritCreated.EffectiveValue);
        Assert.Equal("5", localCreated.EffectiveValue);

        // 3. ERP 推送 Key→Value:兩個 Key 各推一筆
        var pushes = new List<ErpPush>
        {
            new("PreventiveIntervalDays", "M-01", "30"),
            new("AlertThreshold", "M-01", "99") // 對本地覆寫項不應生效
        };
        var syncRes = await _client.PostAsJsonAsync("/api/settings/erp-sync", pushes);
        syncRes.EnsureSuccessStatusCode();

        // 4. 驗證 cascade:
        //    繼承項 EffectiveValue = ERP 值 "30"
        var inheritAfter = await GetSetting(inheritCreated.Id);
        Assert.Equal("30", inheritAfter.ErpValue);
        Assert.Equal("30", inheritAfter.EffectiveValue);
        //    本地覆寫項:ErpValue 雖被快取為 "99",但 EffectiveValue 仍是本地 "5"
        var localAfter = await GetSetting(localCreated.Id);
        Assert.Equal("99", localAfter.ErpValue);
        Assert.Equal("5", localAfter.EffectiveValue);

        // 5. 切換來源:把繼承項改為本地覆寫並給本地值 → EffectiveValue 改吃本地
        inheritAfter.Source = SettingSource.LocalOverride;
        inheritAfter.LocalValue = "14";
        var put = await _client.PutAsJsonAsync($"/api/settings/{inheritAfter.Id}", inheritAfter);
        put.EnsureSuccessStatusCode();
        var switched = await GetSetting(inheritAfter.Id);
        Assert.Equal("14", switched.EffectiveValue);     // 本地值優先
        Assert.Equal("30", switched.ErpValue);            // ERP 快取仍保留

        // 6. 反向切回繼承 → 又吃 ERP 值 "30"
        switched.Source = SettingSource.InheritErp;
        var put2 = await _client.PutAsJsonAsync($"/api/settings/{switched.Id}", switched);
        put2.EnsureSuccessStatusCode();
        var backToInherit = await GetSetting(switched.Id);
        Assert.Equal("30", backToInherit.EffectiveValue);

        // 7. 清理
        foreach (var id in new[] { inheritCreated.Id, localCreated.Id })
        {
            var del = await _client.DeleteAsync($"/api/settings/{id}");
            del.EnsureSuccessStatusCode();
        }
        var finalList = await _client.GetFromJsonAsync<List<MaintenanceSetting>>("/api/settings");
        Assert.NotNull(finalList);
        Assert.DoesNotContain(finalList!, x => x.Id == inheritCreated.Id || x.Id == localCreated.Id);
    }

    [Fact]
    public async Task ErpSync_OnlyMatchesSameKeyAndMachine()
    {
        // 同 Key 不同機台,ERP 推送只命中相符的那台
        var m1 = await PostSetting(new MaintenanceSetting
        { Key = "Vibration", MachineCode = "M-01", Source = SettingSource.InheritErp });
        var m2 = await PostSetting(new MaintenanceSetting
        { Key = "Vibration", MachineCode = "M-02", Source = SettingSource.InheritErp });

        var res = await _client.PostAsJsonAsync("/api/settings/erp-sync",
            new List<ErpPush> { new("Vibration", "M-01", "7.5") });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<SyncResult>();
        Assert.Equal(1, body!.Updated);

        Assert.Equal("7.5", (await GetSetting(m1.Id)).EffectiveValue);
        Assert.Null((await GetSetting(m2.Id)).EffectiveValue);

        await _client.DeleteAsync($"/api/settings/{m1.Id}");
        await _client.DeleteAsync($"/api/settings/{m2.Id}");
    }

    private record SyncResult(int Updated);

    private async Task<MaintenanceSetting> PostSetting(MaintenanceSetting s)
    {
        var res = await _client.PostAsJsonAsync("/api/settings", s);
        if (!res.IsSuccessStatusCode)
        {
            var content = await res.Content.ReadAsStringAsync();
            throw new Exception($"Create setting failed {res.StatusCode}: {content}");
        }
        var created = await res.Content.ReadFromJsonAsync<MaintenanceSetting>();
        Assert.NotNull(created);
        return created!;
    }

    private async Task<MaintenanceSetting> GetSetting(Guid id)
    {
        var got = await _client.GetFromJsonAsync<MaintenanceSetting>($"/api/settings/{id}");
        Assert.NotNull(got);
        return got!;
    }
}
