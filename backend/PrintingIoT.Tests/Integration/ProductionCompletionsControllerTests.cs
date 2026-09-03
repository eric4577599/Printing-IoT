using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// 完工實績端點整合測試(S3 / F2,對應 AC-01、AC-02、AC-06、AC-07、AC-08、AC-17)。
/// 以獨立的 InMemory 資料庫執行真實 HTTP 管線,不連任何真實資料庫。
/// </summary>
public class ProductionCompletionsControllerTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _dbName = "ProductionCompletions-" + Guid.NewGuid();

    public ProductionCompletionsControllerTests()
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("environment", "Testing");
            // 工廠日參數在測試中固定,避免受執行環境的 appsettings 覆寫影響
            builder.UseSetting("Factory:TimeZone", "Asia/Taipei");
            builder.UseSetting("Factory:DayBoundaryHour", "8");

            builder.ConfigureServices(services =>
            {
                var descriptors = services.Where(
                    d => d.ServiceType == typeof(DbContextOptions<PrintingContext>) ||
                         d.ServiceType == typeof(DbContextOptions) ||
                         d.ServiceType == typeof(PrintingContext)).ToList();

                foreach (var d in descriptors) services.Remove(d);

                services.AddDbContext<PrintingContext>(options => options.UseInMemoryDatabase(_dbName));
            });
        });

        _client = _factory.CreateClient();
    }

    /// <summary>
    /// 取得測試用資料庫上下文(以獨立 scope 讀取,避免與請求 scope 混用)。
    /// 輸入:無;輸出:scope 與其 PrintingContext。
    /// </summary>
    private (IServiceScope scope, PrintingContext context) CreateContext()
    {
        var scope = _factory.Services.CreateScope();
        return (scope, scope.ServiceProvider.GetRequiredService<PrintingContext>());
    }

    /// <summary>
    /// 組出一份合法的 POST 請求本體(camelCase,對齊 F2 的請求形狀)。
    /// 輸入:clientRecordId 冪等鍵、completedAt ISO 時間、orderId 可選工單 Id。
    /// 輸出:可直接送出的匿名物件。
    /// </summary>
    private static object MakePayload(
        string clientRecordId = "1756900000000",
        string completedAt = "2026-09-03T16:41:12.000Z",
        Guid? orderId = null) => new
        {
            clientRecordId,
            orderId,
            orderNumber = "ORD-2026-000123",
            deviceId = "MACHINE_01",
            @operator = "王小明",
            shift = "C",
            targetQty = 5000,
            goodQty = 4820,
            prepTimeMinutes = 12.5,
            runTimeMinutes = 96.0,
            stopTimeMinutes = 18.0,
            avgSpeed = 52,
            shortageReason = "",
            completedAt,
            defects = new[] { new { code = "A01", reason = "壓扁", qty = 120 } },
            stops = new[]
            {
                new { code = "001", reason = "送紙歪斜", startedAt = "2026-09-03T23:10:00.000Z", durationMinutes = 6.5 },
            },
        };

    // AC-01:合法本體 → 201,資料庫出現 1 筆主表 + 對應筆數的子表列
    [Fact]
    public async Task PostCompletion_ValidBody_Returns201AndPersistsRows()
    {
        var response = await _client.PostAsJsonAsync("/api/production/completions", MakePayload());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.GetProperty("duplicated").GetBoolean());
        Assert.Equal(120, body.GetProperty("defectQty").GetInt32());
        Assert.Equal(1, body.GetProperty("stopCount").GetInt32());
        Assert.Equal(94.6m, body.GetProperty("availabilityRate").GetDecimal());
        Assert.Equal(96.4m, body.GetProperty("performanceRate").GetDecimal());
        Assert.Equal(97.6m, body.GetProperty("qualityRate").GetDecimal());
        Assert.Equal(89.0m, body.GetProperty("oee").GetDecimal());

        var (scope, context) = CreateContext();
        using (scope)
        {
            Assert.Equal(1, await context.ProductionCompletions.CountAsync());
            Assert.Equal(1, await context.ProductionDefects.CountAsync());
            Assert.Equal(1, await context.ProductionStops.CountAsync());
        }
    }

    // AC-02:同一 clientRecordId 連送兩次 → 第二次 200 且 duplicated,資料庫仍只有 1 筆、子表不重複
    [Fact]
    public async Task PostCompletion_SameClientRecordIdTwice_IsIdempotent()
    {
        var first = await _client.PostAsJsonAsync("/api/production/completions", MakePayload("DUP-001"));
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        var second = await _client.PostAsJsonAsync("/api/production/completions", MakePayload("DUP-001"));
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        var body = await second.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("duplicated").GetBoolean());

        var (scope, context) = CreateContext();
        using (scope)
        {
            Assert.Equal(1, await context.ProductionCompletions.CountAsync());
            Assert.Equal(1, await context.ProductionDefects.CountAsync());
            Assert.Equal(1, await context.ProductionStops.CountAsync());
        }
    }

    // AC-06a:goodQty 為負 → 400、訊息為表列正體中文、資料庫零新增
    [Fact]
    public async Task PostCompletion_NegativeGoodQty_Returns400AndWritesNothing()
    {
        var payload = new
        {
            clientRecordId = "BAD-001",
            goodQty = -1,
            targetQty = 5000,
        };

        var response = await _client.PostAsJsonAsync("/api/production/completions", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.GetProperty("success").GetBoolean());
        Assert.Equal("良品數不可為負", body.GetProperty("error").GetString());

        var (scope, context) = CreateContext();
        using (scope) Assert.Equal(0, await context.ProductionCompletions.CountAsync());
    }

    // AC-06b:clientRecordId 空白 → 400、訊息為表列正體中文、資料庫零新增
    [Fact]
    public async Task PostCompletion_BlankClientRecordId_Returns400AndWritesNothing()
    {
        var payload = new { clientRecordId = "   ", goodQty = 100, targetQty = 100 };

        var response = await _client.PostAsJsonAsync("/api/production/completions", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("用戶端紀錄編號不可為空", body.GetProperty("error").GetString());

        var (scope, context) = CreateContext();
        using (scope) Assert.Equal(0, await context.ProductionCompletions.CountAsync());
    }

    // AC-06c:本體為 null → 400、資料庫零新增
    [Fact]
    public async Task PostCompletion_NullBody_Returns400()
    {
        var content = new StringContent("null", Encoding.UTF8, "application/json");

        var response = await _client.PostAsync("/api/production/completions", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var (scope, context) = CreateContext();
        using (scope) Assert.Equal(0, await context.ProductionCompletions.CountAsync());
    }

    // AC-07:from / to 只回工廠日落在區間內(含端點)的紀錄,依 ProductionDate 再 CompletedAt 遞減排序
    [Fact]
    public async Task GetCompletions_FiltersByProductionDateInclusive_AndSortsDescending()
    {
        // 工廠日 09-02(台北 09-03 00:41 → 前一日)
        await _client.PostAsJsonAsync("/api/production/completions", MakePayload("R-0902", "2026-09-02T16:41:00.000Z"));
        // 工廠日 09-03(台北 09-04 00:41)
        await _client.PostAsJsonAsync("/api/production/completions", MakePayload("R-0903a", "2026-09-03T16:41:00.000Z"));
        // 工廠日 09-03(台北 09-03 14:00,同日但較早完工)
        await _client.PostAsJsonAsync("/api/production/completions", MakePayload("R-0903b", "2026-09-03T06:00:00.000Z"));
        // 工廠日 09-04
        await _client.PostAsJsonAsync("/api/production/completions", MakePayload("R-0904", "2026-09-04T06:00:00.000Z"));

        var rows = await _client.GetFromJsonAsync<List<JsonElement>>(
            "/api/production/completions?from=2026-09-03&to=2026-09-04");

        Assert.NotNull(rows);
        var ids = rows!.Select(r => r.GetProperty("clientRecordId").GetString()).ToList();

        // 09-02 那筆被區間排除
        Assert.DoesNotContain("R-0902", ids);
        // 端點含在內:09-03 兩筆與 09-04 一筆
        Assert.Equal(new[] { "R-0904", "R-0903a", "R-0903b" }, ids);
    }

    // AC-07 補強:pageSize > 500 夾到 500(不會一次撈爆)
    [Fact]
    public async Task GetCompletions_PageSizeAboveLimit_ClampedTo500()
    {
        for (var i = 0; i < 3; i++)
            await _client.PostAsJsonAsync("/api/production/completions", MakePayload($"PAGE-{i}"));

        var clamped = await _client.GetFromJsonAsync<List<JsonElement>>("/api/production/completions?pageSize=99999");
        Assert.Equal(3, clamped!.Count);

        // pageSize=1 時每頁只有一列,可據此確認分頁真的生效
        var firstPage = await _client.GetFromJsonAsync<List<JsonElement>>("/api/production/completions?page=1&pageSize=1");
        var secondPage = await _client.GetFromJsonAsync<List<JsonElement>>("/api/production/completions?page=2&pageSize=1");
        Assert.Single(firstPage!);
        Assert.Single(secondPage!);
        Assert.NotEqual(
            firstPage![0].GetProperty("clientRecordId").GetString(),
            secondPage![0].GetProperty("clientRecordId").GetString());
    }

    // AC-08:GET/{id} 回單筆且含明細;不存在的 id → 404
    [Fact]
    public async Task GetCompletionById_ReturnsDetails_AndNotFoundForMissingId()
    {
        var created = await _client.PostAsJsonAsync("/api/production/completions", MakePayload("DETAIL-001"));
        var createdBody = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = createdBody.GetProperty("id").GetGuid();

        var single = await _client.GetFromJsonAsync<JsonElement>($"/api/production/completions/{id}");

        Assert.Equal("DETAIL-001", single.GetProperty("clientRecordId").GetString());

        var defects = single.GetProperty("defects");
        Assert.Equal(1, defects.GetArrayLength());
        Assert.Equal("A01", defects[0].GetProperty("code").GetString());
        Assert.Equal(120, defects[0].GetProperty("qty").GetInt32());

        var stops = single.GetProperty("stops");
        Assert.Equal(1, stops.GetArrayLength());
        Assert.Equal("001", stops[0].GetProperty("code").GetString());

        var missing = await _client.GetAsync($"/api/production/completions/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    // AC-17:工廠日由後端算(不是 UTC 取日)
    //   台北 09-04 00:41(UTC 09-03 16:41)→ 09-03
    //   台北 09-04 07:59(UTC 09-03 23:59)→ 09-03(舊寫法 toISOString 會得到 09-03,但台北 08:00 之後就會分歧)
    //   台北 09-04 08:00(UTC 09-04 00:00)→ 09-04(舊寫法會錯成 09-04 的前一日邏輯不同)
    [Theory]
    [InlineData("2026-09-03T16:41:00.000Z", "2026-09-03")]
    [InlineData("2026-09-03T23:59:00.000Z", "2026-09-03")]
    [InlineData("2026-09-04T00:00:00.000Z", "2026-09-04")]
    public async Task PostCompletion_ResolvesFactoryProductionDate(string completedAt, string expectedDate)
    {
        var clientRecordId = "TZ-" + completedAt;

        var response = await _client.PostAsJsonAsync(
            "/api/production/completions", MakePayload(clientRecordId, completedAt));

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(expectedDate, body.GetProperty("productionDate").GetString());

        var (scope, context) = CreateContext();
        using (scope)
        {
            var row = await context.ProductionCompletions.SingleAsync(c => c.ClientRecordId == clientRecordId);
            Assert.Equal(DateOnly.Parse(expectedDate), row.ProductionDate);
        }
    }

    // 端點層的工單狀態推進:orderId 指向存在的工單 → 該工單變 Completed 且回 orderStatusUpdated
    [Fact]
    public async Task PostCompletion_WithExistingOrder_MarksOrderCompleted()
    {
        Guid orderId;
        var (seedScope, seedContext) = CreateContext();
        using (seedScope)
        {
            var order = new Order { OrderNumber = "ORD-HTTP", CustomerName = "客戶A", Quantity = 5000 };
            seedContext.Orders.Add(order);
            await seedContext.SaveChangesAsync();
            orderId = order.Id;
        }

        var response = await _client.PostAsJsonAsync(
            "/api/production/completions", MakePayload("ORDER-LINK", orderId: orderId));

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("orderStatusUpdated").GetBoolean());

        var (scope, context) = CreateContext();
        using (scope)
        {
            var reloaded = await context.Orders.SingleAsync(o => o.Id == orderId);
            Assert.Equal(OrderStatus.Completed, reloaded.Status);
            Assert.NotNull(reloaded.CompletedAt);
        }
    }

    // GET /api/settings/factory-time 回傳前端算工廠日所需的同一組參數(F4)
    [Fact]
    public async Task GetFactoryTimeSettings_ReturnsTimeZoneAndBoundary()
    {
        var body = await _client.GetFromJsonAsync<JsonElement>("/api/settings/factory-time");

        Assert.Equal(8, body.GetProperty("dayBoundaryHour").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("timeZone").GetString()));
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }
}
