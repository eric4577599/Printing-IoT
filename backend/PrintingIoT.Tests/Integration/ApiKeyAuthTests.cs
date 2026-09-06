using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PrintingIoT.API.Authentication;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.DTOs.Auth;
using PrintingIoT.Core.Entities.Auth;
using PrintingIoT.Core.Security;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// S7 機器對機器憑證整合測試(AC-S7-10 ~ AC-S7-25)。
///
/// 驗證三件事:① ERP 帶 X-Api-Key 推得了單;② 撤銷 / 到期 / 偽造的金鑰推不了;
/// ③ 金鑰的權限**只到推單端點為止**,不會變成打開整個系統的萬用鑰匙。
/// </summary>
public class ApiKeyAuthTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly string _dbName = "ApiKeyAuthTests-" + Guid.NewGuid();

    public ApiKeyAuthTests()
    {
        _factory = AuthTestFactory.Create(_dbName);
    }

    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// 在測試資料庫植入一支金鑰。
    /// 輸入:是否啟用、到期時間、角色(預設 ERP_SERVICE);
    /// 輸出:明文金鑰與其資料列 Id;
    /// 邏輯:走與正式路徑同一支 ApiKeyGenerator,避免測試自造格式而測不到真實行為。
    /// </summary>
    private async Task<(string PlainKey, Guid Id)> SeedKeyAsync(
        bool isActive = true, DateTime? expiresAt = null, string? role = null)
    {
        var (plainKey, prefix, hash) = ApiKeyGenerator.Generate();

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();

        var entity = new ApiKey
        {
            Name = "測試 ERP 金鑰",
            Prefix = prefix,
            KeyHash = hash,
            Role = role ?? AppRoles.ErpService,
            IsActive = isActive,
            ExpiresAt = expiresAt
        };
        context.ApiKeys.Add(entity);
        await context.SaveChangesAsync();

        return (plainKey, entity.Id);
    }

    /// <summary>
    /// 建立帶 X-Api-Key 標頭的客戶端。
    /// 輸入:明文金鑰(null 表示不帶標頭);輸出:HttpClient。
    /// </summary>
    private HttpClient KeyClient(string? plainKey)
    {
        var client = _factory.CreateClient();
        if (plainKey != null)
            client.DefaultRequestHeaders.Add(ApiKeyAuthenticationDefaults.HeaderName, plainKey);
        return client;
    }

    private static List<OrderDto> Payload(string number) => new()
    {
        new OrderDto { OrderNumber = number, CustomerName = "客戶A", TargetLength = 1000m, Quantity = 500 }
    };

    // AC-S7-10:有效金鑰 → 推單成功並實際寫入資料庫(S5 之後 ERP 推不了單的正解)
    [Fact]
    public async Task PushOrders_WithValidApiKey_Succeeds_AndPersists()
    {
        var (plainKey, _) = await SeedKeyAsync();

        var response = await KeyClient(plainKey).PostAsJsonAsync("/api/erp/push-orders", Payload("KEY-001"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErpPushResponseDto>();
        Assert.True(body!.Success);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();
        Assert.Equal(1, await context.Orders.CountAsync(o => o.OrderNumber == "KEY-001"));
    }

    // AC-S7-11:完全不帶憑證 → 401,且零筆寫入
    [Fact]
    public async Task PushOrders_WithoutAnyCredential_Returns401()
    {
        var response = await KeyClient(null).PostAsJsonAsync("/api/erp/push-orders", Payload("NOKEY-001"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();
        Assert.Equal(0, await context.Orders.CountAsync(o => o.OrderNumber == "NOKEY-001"));
    }

    // AC-S7-12:已撤銷的金鑰 → 401(撤銷必須即時生效,不能只是列表上變灰)
    [Fact]
    public async Task PushOrders_WithRevokedApiKey_Returns401()
    {
        var (plainKey, _) = await SeedKeyAsync(isActive: false);

        var response = await KeyClient(plainKey).PostAsJsonAsync("/api/erp/push-orders", Payload("REVOKED-001"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-S7-13:已到期的金鑰 → 401
    [Fact]
    public async Task PushOrders_WithExpiredApiKey_Returns401()
    {
        var (plainKey, _) = await SeedKeyAsync(expiresAt: DateTime.UtcNow.AddMinutes(-1));

        var response = await KeyClient(plainKey).PostAsJsonAsync("/api/erp/push-orders", Payload("EXPIRED-001"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-S7-14:未到期的金鑰仍可用(擋住「到期判斷寫反」這種一翻兩瞪眼的錯)
    [Fact]
    public async Task PushOrders_WithNotYetExpiredApiKey_Succeeds()
    {
        var (plainKey, _) = await SeedKeyAsync(expiresAt: DateTime.UtcNow.AddDays(1));

        var response = await KeyClient(plainKey).PostAsJsonAsync("/api/erp/push-orders", Payload("FUTURE-001"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // AC-S7-15:格式正確但不存在、以及格式全錯的金鑰 → 一律 401
    [Theory]
    [InlineData("pio_deadbeefcafe_YWJjZGVmZ2hpamtsbW5vcA")]
    [InlineData("not-a-key")]
    [InlineData("Bearer something")]
    public async Task PushOrders_WithBogusApiKey_Returns401(string bogus)
    {
        var response = await KeyClient(bogus).PostAsJsonAsync("/api/erp/push-orders", Payload("BOGUS-001"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-S7-16:同前綴但祕密段被竄改 → 401(證明真的比雜湊,不是只比前綴)
    [Fact]
    public async Task PushOrders_WithTamperedSecret_Returns401()
    {
        var (plainKey, _) = await SeedKeyAsync();
        var parts = plainKey.Split('_', 3); // 上限 3:祕密段是 base64url,本身可能含底線
        var tampered = $"{parts[0]}_{parts[1]}_{parts[2][..^1]}X";

        var response = await KeyClient(tampered).PostAsJsonAsync("/api/erp/push-orders", Payload("TAMPER-001"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-S7-17:金鑰**不是**萬用鑰匙 —— 推單以外的端點一律 401
    [Theory]
    [InlineData("GET", "/api/orders")]
    [InlineData("GET", "/api/products")]
    [InlineData("GET", "/api/v1/auth/users")]
    [InlineData("GET", "/api/v1/apikeys")]
    [InlineData("GET", "/api/settings/communication")]
    public async Task ApiKey_DoesNotUnlockOtherEndpoints(string method, string path)
    {
        var (plainKey, _) = await SeedKeyAsync();
        var client = KeyClient(plainKey);

        var response = method == "GET"
            ? await client.GetAsync(path)
            : await client.PostAsync(path, JsonContent.Create(new { }));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-S7-18:成功驗證後會蓋上 LastUsedAt(輪替時判斷舊金鑰能否安全撤銷的依據)
    [Fact]
    public async Task PushOrders_WithValidApiKey_StampsLastUsedAt()
    {
        var (plainKey, id) = await SeedKeyAsync();

        await KeyClient(plainKey).PostAsJsonAsync("/api/erp/push-orders", Payload("TOUCH-001"));

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();
        var record = await context.ApiKeys.AsNoTracking().FirstAsync(k => k.Id == id);
        Assert.NotNull(record.LastUsedAt);
    }

    // AC-S7-19:非 ERP_SERVICE 角色的金鑰 → 403(通過驗證但沒有推單權限)
    [Fact]
    public async Task PushOrders_WithApiKeyOfOtherRole_Returns403()
    {
        var (plainKey, _) = await SeedKeyAsync(role: AppRoles.Operator);

        var response = await KeyClient(plainKey).PostAsJsonAsync("/api/erp/push-orders", Payload("ROLE-001"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // AC-S7-20:ADMIN 的 JWT 仍推得了單(人工補推路徑,亦即授權矩陣 AC-02 不被 S7 破壞)
    [Fact]
    public async Task PushOrders_WithAdminJwt_StillSucceeds()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var response = await client.PostAsJsonAsync("/api/erp/push-orders", Payload("ADMINPUSH-001"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // AC-S7-21:OPERATOR 的 JWT 推不了單(推單不是現場人員的權限)
    [Fact]
    public async Task PushOrders_WithOperatorJwt_Returns403()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Operator);

        var response = await client.PostAsJsonAsync("/api/erp/push-orders", Payload("OPPUSH-001"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // AC-S7-22:ADMIN 建立金鑰 → 201、明文只此一次、且該明文可直接用來推單
    [Fact]
    public async Task CreateApiKey_ReturnsPlainKeyOnce_AndItWorks()
    {
        var admin = _factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var created = await admin.PostAsJsonAsync("/api/v1/apikeys", new CreateApiKeyRequest("客戶 ERP 推單", null));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var body = await created.Content.ReadFromJsonAsync<CreateApiKeyResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.PlainKey));
        Assert.Equal(AppRoles.ErpService, body.Key.Role);
        Assert.True(body.Key.IsActive);
        Assert.Equal(ApiKeyGenerator.ExtractPrefix(body.PlainKey), body.Key.Prefix);

        var push = await KeyClient(body.PlainKey).PostAsJsonAsync("/api/erp/push-orders", Payload("CREATED-001"));
        Assert.Equal(HttpStatusCode.OK, push.StatusCode);
    }

    // AC-S7-23:列表絕不回傳明文或雜湊(整段 JSON 逐字檢查,不只看 DTO 欄位)
    [Fact]
    public async Task ListApiKeys_NeverExposesPlainKeyOrHash()
    {
        var admin = _factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var created = await admin.PostAsJsonAsync("/api/v1/apikeys", new CreateApiKeyRequest("列表測試", null));
        var body = await created.Content.ReadFromJsonAsync<CreateApiKeyResponse>();

        var listJson = await admin.GetStringAsync("/api/v1/apikeys");

        Assert.Contains(body!.Key.Prefix, listJson);
        Assert.DoesNotContain(body.PlainKey, listJson);
        Assert.DoesNotContain(ApiKeyGenerator.ComputeHash(body.PlainKey), listJson);
        Assert.DoesNotContain("keyHash", listJson, StringComparison.OrdinalIgnoreCase);
    }

    // AC-S7-24:撤銷即時生效,且重複撤銷是冪等的
    [Fact]
    public async Task RevokeApiKey_TakesEffectImmediately_AndIsIdempotent()
    {
        var admin = _factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var created = await admin.PostAsJsonAsync("/api/v1/apikeys", new CreateApiKeyRequest("待撤銷", null));
        var body = await created.Content.ReadFromJsonAsync<CreateApiKeyResponse>();

        var before = await KeyClient(body!.PlainKey).PostAsJsonAsync("/api/erp/push-orders", Payload("BEFORE-001"));
        Assert.Equal(HttpStatusCode.OK, before.StatusCode);

        var revoke1 = await admin.PostAsync($"/api/v1/apikeys/{body.Key.Id}/revoke", JsonContent.Create(new { }));
        Assert.Equal(HttpStatusCode.OK, revoke1.StatusCode);

        var revoke2 = await admin.PostAsync($"/api/v1/apikeys/{body.Key.Id}/revoke", JsonContent.Create(new { }));
        Assert.Equal(HttpStatusCode.OK, revoke2.StatusCode);
        var summary = await revoke2.Content.ReadFromJsonAsync<ApiKeySummary>();
        Assert.False(summary!.IsActive);

        var after = await KeyClient(body.PlainKey).PostAsJsonAsync("/api/erp/push-orders", Payload("AFTER-001"));
        Assert.Equal(HttpStatusCode.Unauthorized, after.StatusCode);
    }

    // AC-S7-25:非 ADMIN 的 JWT 碰不到金鑰管理端點
    [Fact]
    public async Task ApiKeysEndpoints_RequireAdmin()
    {
        var supervisor = _factory.CreateClient();
        supervisor.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Supervisor);

        Assert.Equal(HttpStatusCode.Forbidden, (await supervisor.GetAsync("/api/v1/apikeys")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await supervisor.PostAsJsonAsync("/api/v1/apikeys", new CreateApiKeyRequest("不該成功", null))).StatusCode);

        var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/apikeys")).StatusCode);
    }

    // AC-S7-26:到期時間必須在未來,否則 400(擋住一建立就是死金鑰)
    [Fact]
    public async Task CreateApiKey_RejectsPastExpiry()
    {
        var admin = _factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var response = await admin.PostAsJsonAsync(
            "/api/v1/apikeys", new CreateApiKeyRequest("過期金鑰", DateTime.UtcNow.AddMinutes(-1)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
