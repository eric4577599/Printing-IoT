using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using PrintingIoT.API.Authentication;
using PrintingIoT.API.Controllers;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Entities.Auth;
using PrintingIoT.Core.Security;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// PRIIOT ⇄ MM 整合契約 v1 測試(docs/spec20261116-1.md)。
/// 重點:授權矩陣(金鑰互不通用)、使用者狀態即時反映、登入代碼單次有效、
/// 游標 / 歸零 / 狀態轉換 / 404 / 410、兩個限速桶互不搶額度。
/// </summary>
public class IntegrationContractTests : IDisposable
{
    private const string EntryUrl = "https://mm.example.test/app";
    private readonly WebApplicationFactory<Program> _factory;
    private readonly InMemoryCodeStore _codes = new();

    /// <summary>以記憶體字典取代 Redis 的代碼儲存;TakeAsync 以 TryRemove 達成原子語意。</summary>
    private sealed class InMemoryCodeStore : ILoginCodeStore
    {
        private readonly ConcurrentDictionary<string, string> _d = new();
        public Task SaveAsync(string code, string payload, TimeSpan ttl) { _d[code] = payload; return Task.CompletedTask; }
        public Task<string?> TakeAsync(string code) => Task.FromResult(_d.TryRemove(code, out var v) ? v : null);
        public void Clear() => _d.Clear();
    }

    public IntegrationContractTests()
    {
        _factory = AuthTestFactory.Create("IntegrationContract-" + Guid.NewGuid(),
            new Dictionary<string, string?> { ["Integration:Mm:EntryUrl"] = EntryUrl })
            .WithWebHostBuilder(b => b.ConfigureServices(s =>
            {
                var old = s.Where(d => d.ServiceType == typeof(ILoginCodeStore)).ToList();
                foreach (var d in old) s.Remove(d);
                s.AddSingleton<ILoginCodeStore>(_codes);
            }));
    }

    public void Dispose() => _factory.Dispose();

    // ───────────── 輔助 ─────────────

    private async Task<string> SeedKeyAsync(string role)
    {
        var (plain, prefix, hash) = ApiKeyGenerator.Generate();
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<PrintingContext>();
        ctx.ApiKeys.Add(new ApiKey { Name = "t", Prefix = prefix, KeyHash = hash, Role = role, IsActive = true });
        await ctx.SaveChangesAsync();
        return plain;
    }

    private HttpClient KeyClient(string? key)
    {
        var c = _factory.CreateClient();
        if (key != null) c.DefaultRequestHeaders.Add(ApiKeyAuthenticationDefaults.HeaderName, key);
        return c;
    }

    private async Task<HttpClient> MmClientAsync() => KeyClient(await SeedKeyAsync(AppRoles.MmService));

    private async Task<Guid> SeedUserAsync(string username, string role, bool active = true)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<PrintingContext>();
        var r = await ctx.Roles.FirstOrDefaultAsync(x => x.Name == role);
        if (r == null) { r = new Role { Name = role }; ctx.Roles.Add(r); }
        var u = new User { Username = username, PasswordHash = "x", DisplayName = username + " 顯示名", IsActive = active };
        ctx.Users.Add(u);
        ctx.UserRoles.Add(new UserRole { User = u, Role = r });
        await ctx.SaveChangesAsync();
        return u.Id;
    }

    /// <summary>簽一個 sub 為指定使用者的 JWT(TestAuthTokenFactory 的 sub 是隨機值,這裡需要真實使用者)。</summary>
    private static string UserJwt(Guid userId, string role, DateTime? expires = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestAuthTokenFactory.TestingSecret));
        var exp = expires ?? DateTime.UtcNow.AddHours(2);
        var token = new JwtSecurityToken(TestAuthTokenFactory.Issuer, TestAuthTokenFactory.Audience,
            new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(ClaimTypes.Role, role)
            },
            notBefore: exp.AddHours(-2), expires: exp,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private HttpClient UserClient(string jwt)
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
        return c;
    }

    private async Task SeedLogsAsync(string deviceId, params (decimal count, MachineStatus status)[] rows)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<PrintingContext>();
        var t = new DateTime(2026, 11, 16, 0, 0, 0, DateTimeKind.Utc);
        foreach (var (count, status) in rows)
        {
            ctx.ProductionLogs.Add(new ProductionLog { DeviceId = deviceId, TotalLength = count, Speed = 0, Status = status, Timestamp = t });
            t = t.AddSeconds(10);
        }
        await ctx.SaveChangesAsync();
    }

    private static async Task<JsonElement> Json(HttpResponseMessage r) =>
        JsonDocument.Parse(await r.Content.ReadAsStringAsync()).RootElement;

    // ───────────── 授權矩陣 ─────────────

    [Theory]
    [InlineData("/api/v1/integration/health")]
    [InlineData("/api/v1/integration/devices")]
    [InlineData("/api/v1/integration/users/00000000-0000-0000-0000-000000000001")]
    public async Task MmEndpoints_WithoutKey_Return401(string path)
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await KeyClient(null).GetAsync(path)).StatusCode);
    }

    [Fact]
    public async Task MmEndpoints_WithMmKey_Succeed_AndCarryContractVersion()
    {
        var res = await (await MmClientAsync()).GetAsync("/api/v1/integration/health");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("1", res.Headers.GetValues("X-Contract-Version").Single());
        Assert.Equal("ok", (await Json(res)).GetProperty("status").GetString());
    }

    [Fact]
    public async Task ErpKey_CannotReachMmEndpoints()
    {
        var erp = KeyClient(await SeedKeyAsync(AppRoles.ErpService));
        Assert.Equal(HttpStatusCode.Forbidden, (await erp.GetAsync("/api/v1/integration/health")).StatusCode);
    }

    [Fact]
    public async Task MmKey_CannotReachErpOrOtherEndpoints()
    {
        var mm = await MmClientAsync();
        Assert.Equal(HttpStatusCode.Forbidden, (await mm.PostAsJsonAsync("/api/erp/push-orders", new object[0])).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await mm.GetAsync("/api/orders")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await mm.GetAsync("/api/v1/apikeys")).StatusCode);
    }

    [Fact]
    public async Task AdminJwt_CannotReachMmMachineEndpoints()
    {
        var admin = UserClient(TestAuthTokenFactory.Create(AppRoles.Admin));
        Assert.Equal(HttpStatusCode.Unauthorized, (await admin.GetAsync("/api/v1/integration/health")).StatusCode);
    }

    // ───────────── 金鑰建立 ─────────────

    [Fact]
    public async Task AdminCanCreateMmKey_DefaultStaysErp_InvalidRoleRejected()
    {
        var admin = UserClient(TestAuthTokenFactory.Create(AppRoles.Admin));

        var mm = await admin.PostAsJsonAsync("/api/v1/apikeys", new { name = "mm", role = "mm_service" });
        Assert.Equal(HttpStatusCode.Created, mm.StatusCode);
        Assert.Equal("MM_SERVICE", (await Json(mm)).GetProperty("key").GetProperty("role").GetString());

        var def = await admin.PostAsJsonAsync("/api/v1/apikeys", new { name = "erp" });
        Assert.Equal("ERP_SERVICE", (await Json(def)).GetProperty("key").GetProperty("role").GetString());

        var bad = await admin.PostAsJsonAsync("/api/v1/apikeys", new { name = "x", role = "ADMIN" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    // ───────────── 使用者狀態 ─────────────

    [Fact]
    public async Task User_Active_ReturnsRoles_AndMissingOrInactiveLookIdentical()
    {
        var mm = await MmClientAsync();
        var active = await SeedUserAsync("op1", AppRoles.Operator);
        var inactive = await SeedUserAsync("gone", AppRoles.Operator, active: false);

        var ok = await Json(await mm.GetAsync($"/api/v1/integration/users/{active}"));
        Assert.True(ok.GetProperty("active").GetBoolean());
        Assert.Equal(active.ToString(), ok.GetProperty("userId").GetString());
        Assert.Equal("OPERATOR", ok.GetProperty("roles")[0].GetString());

        var missing = await (await mm.GetAsync($"/api/v1/integration/users/{Guid.NewGuid()}")).Content.ReadAsStringAsync();
        var stopped = await (await mm.GetAsync($"/api/v1/integration/users/{inactive}")).Content.ReadAsStringAsync();
        var garbage = await (await mm.GetAsync("/api/v1/integration/users/not-a-guid")).Content.ReadAsStringAsync();
        Assert.Equal("{\"active\":false}", missing);
        Assert.Equal(missing, stopped);
        Assert.Equal(missing, garbage);
    }

    [Fact]
    public async Task Introspect_ValidInvalidExpiredAndDeactivated()
    {
        var mm = await MmClientAsync();
        var id = await SeedUserAsync("eng1", AppRoles.Engineer);

        var good = await Json(await mm.PostAsJsonAsync("/api/v1/integration/introspect", new { token = UserJwt(id, "ENGINEER") }));
        Assert.True(good.GetProperty("active").GetBoolean());
        Assert.Equal("ENGINEER", good.GetProperty("roles")[0].GetString());

        var expired = await (await mm.PostAsJsonAsync("/api/v1/integration/introspect",
            new { token = UserJwt(id, "ENGINEER", DateTime.UtcNow.AddMinutes(-1)) })).Content.ReadAsStringAsync();
        var forged = await (await mm.PostAsJsonAsync("/api/v1/integration/introspect", new { token = "abc.def.ghi" })).Content.ReadAsStringAsync();
        Assert.Equal("{\"active\":false}", expired);
        Assert.Equal("{\"active\":false}", forged);

        using (var scope = _factory.Services.CreateScope())
        {
            var ctx = scope.ServiceProvider.GetRequiredService<PrintingContext>();
            (await ctx.Users.FirstAsync(u => u.Id == id)).IsActive = false;
            await ctx.SaveChangesAsync();
        }
        var after = await (await mm.PostAsJsonAsync("/api/v1/integration/introspect", new { token = UserJwt(id, "ENGINEER") })).Content.ReadAsStringAsync();
        Assert.Equal("{\"active\":false}", after);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await mm.PostAsJsonAsync("/api/v1/integration/introspect", new { token = "" })).StatusCode);
    }

    // ───────────── 登入代碼 ─────────────

    private async Task<(string code, string redirect)> IssueCodeAsync(Guid userId, string role)
    {
        var res = await UserClient(UserJwt(userId, role)).PostAsJsonAsync("/api/v1/integration/login-codes", new { audience = "mm" });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var j = await Json(res);
        Assert.Equal(60, j.GetProperty("expiresInSeconds").GetInt32());
        return (j.GetProperty("code").GetString()!, j.GetProperty("redirectUrl").GetString()!);
    }

    [Fact]
    public async Task LoginCode_IssuedAsFragment_ExchangedOnce_ReturnsUserInfoOnly()
    {
        var id = await SeedUserAsync("sup1", AppRoles.Supervisor);
        var (code, redirect) = await IssueCodeAsync(id, "SUPERVISOR");

        Assert.Equal($"{EntryUrl}#code={code}", redirect);
        Assert.DoesNotContain("?", redirect);

        var mm = await MmClientAsync();
        var first = await mm.PostAsJsonAsync("/api/v1/integration/login-codes/exchange", new { code });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var body = await first.Content.ReadAsStringAsync();
        Assert.Contains("\"SUPERVISOR\"", body);
        Assert.DoesNotContain("token", body, StringComparison.OrdinalIgnoreCase);

        var second = await mm.PostAsJsonAsync("/api/v1/integration/login-codes/exchange", new { code });
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        Assert.Equal("invalid_request", (await Json(second)).GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task LoginCode_ExpiredOrUnknownOrDeactivatedUser_Rejected()
    {
        var mm = await MmClientAsync();
        Assert.Equal(HttpStatusCode.BadRequest,
            (await mm.PostAsJsonAsync("/api/v1/integration/login-codes/exchange", new { code = "nope" })).StatusCode);

        var id = await SeedUserAsync("op9", AppRoles.Operator);
        var (code, _) = await IssueCodeAsync(id, "OPERATOR");
        using (var scope = _factory.Services.CreateScope())
        {
            var ctx = scope.ServiceProvider.GetRequiredService<PrintingContext>();
            (await ctx.Users.FirstAsync(u => u.Id == id)).IsActive = false;
            await ctx.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.BadRequest,
            (await mm.PostAsJsonAsync("/api/v1/integration/login-codes/exchange", new { code })).StatusCode);
    }

    [Fact]
    public async Task LoginCode_WrongAudience_AndNoEntryUrl_AndNoJwt()
    {
        var id = await SeedUserAsync("op2", AppRoles.Operator);
        var user = UserClient(UserJwt(id, "OPERATOR"));
        Assert.Equal(HttpStatusCode.BadRequest,
            (await user.PostAsJsonAsync("/api/v1/integration/login-codes", new { audience = "erp" })).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await KeyClient(null).PostAsJsonAsync("/api/v1/integration/login-codes", new { audience = "mm" })).StatusCode);

        using var unconfigured = AuthTestFactory.Create("IntegrationNoEntry-" + Guid.NewGuid());
        var c = unconfigured.CreateClient();
        c.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Operator);
        var res = await c.PostAsJsonAsync("/api/v1/integration/login-codes", new { audience = "mm" });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
        Assert.Equal("service_unavailable", (await Json(res)).GetProperty("error").GetProperty("code").GetString());
    }

    // ───────────── 設備資料 ─────────────

    [Fact]
    public async Task Counter_FirstConnect_ReturnsOnlyLatestAsBaseline()
    {
        await SeedLogsAsync("PRESS-1", (100, MachineStatus.Running), (150, MachineStatus.Running), (210, MachineStatus.Running));
        var j = await Json(await (await MmClientAsync()).GetAsync("/api/v1/integration/devices/%20press-1%20/counter"));

        Assert.Equal("PRESS-1", j.GetProperty("deviceId").GetString());
        Assert.Equal(1, j.GetProperty("items").GetArrayLength());
        Assert.Equal(210, j.GetProperty("items")[0].GetProperty("count").GetInt64());
        Assert.False(j.GetProperty("hasMore").GetBoolean());
    }

    [Fact]
    public async Task Counter_Cursor_DetectsResetAcrossBatches_AndPaginates()
    {
        await SeedLogsAsync("P2", (10, MachineStatus.Running), (20, MachineStatus.Running), (5, MachineStatus.Running), (8, MachineStatus.Running));
        var mm = await MmClientAsync();

        var page1 = await Json(await mm.GetAsync("/api/v1/integration/devices/P2/counter?sinceId=0&limit=2"));
        Assert.True(page1.GetProperty("hasMore").GetBoolean());
        Assert.Equal(2, page1.GetProperty("items").GetArrayLength());
        Assert.False(page1.GetProperty("items")[0].GetProperty("resetBefore").GetBoolean());
        var next = page1.GetProperty("nextSinceId").GetInt64();

        var page2 = await Json(await mm.GetAsync($"/api/v1/integration/devices/P2/counter?sinceId={next}&limit=2"));
        Assert.False(page2.GetProperty("hasMore").GetBoolean());
        // 20 → 5 跨批次:第三筆是歸零
        Assert.True(page2.GetProperty("items")[0].GetProperty("resetBefore").GetBoolean());
        Assert.False(page2.GetProperty("items")[1].GetProperty("resetBefore").GetBoolean());

        // 沒有新資料:游標原樣回傳、items 空
        var last = page2.GetProperty("nextSinceId").GetInt64();
        var none = await Json(await mm.GetAsync($"/api/v1/integration/devices/P2/counter?sinceId={last}"));
        Assert.Equal(0, none.GetProperty("items").GetArrayLength());
        Assert.Equal(last, none.GetProperty("nextSinceId").GetInt64());
    }

    [Fact]
    public async Task Counter_UnknownDevice404_CursorBeyondMax410()
    {
        await SeedLogsAsync("P3", (1, MachineStatus.Idle));
        var mm = await MmClientAsync();

        var unknown = await mm.GetAsync("/api/v1/integration/devices/NOPE/counter");
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal("not_found", (await Json(unknown)).GetProperty("error").GetProperty("code").GetString());

        var gone = await mm.GetAsync("/api/v1/integration/devices/P3/counter?sinceId=999999");
        Assert.Equal(HttpStatusCode.Gone, gone.StatusCode);
        Assert.Equal("cursor_expired", (await Json(gone)).GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task StatusEvents_ReturnOnlyTransitions_WithNullPreviousOnBaseline()
    {
        await SeedLogsAsync("P4",
            (1, MachineStatus.Running), (2, MachineStatus.Running), (3, MachineStatus.Error),
            (3, MachineStatus.Error), (4, MachineStatus.Running));
        var mm = await MmClientAsync();

        var baseline = await Json(await mm.GetAsync("/api/v1/integration/devices/P4/status-events"));
        Assert.Equal(1, baseline.GetProperty("items").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, baseline.GetProperty("items")[0].GetProperty("previousStatus").ValueKind);

        var all = await Json(await mm.GetAsync("/api/v1/integration/devices/P4/status-events?sinceId=0"));
        var items = all.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(new[] { "Running", "Error", "Running" }, items.Select(i => i.GetProperty("status").GetString()).ToArray());
        Assert.Equal(JsonValueKind.Null, items[0].GetProperty("previousStatus").ValueKind);
        Assert.Equal("Running", items[1].GetProperty("previousStatus").GetString());
        Assert.Equal("Error", items[2].GetProperty("previousStatus").GetString());
    }

    [Fact]
    public async Task Devices_ListsDistinctWithLastSeen()
    {
        await SeedLogsAsync("A1", (1, MachineStatus.Idle), (2, MachineStatus.Idle));
        await SeedLogsAsync("B1", (1, MachineStatus.Idle));
        var list = (await Json(await (await MmClientAsync()).GetAsync("/api/v1/integration/devices"))).EnumerateArray()
            .Select(d => d.GetProperty("deviceId").GetString()).ToArray();
        Assert.Equal(new[] { "A1", "B1" }, list);
    }

    // ───────────── 限速分桶 ─────────────

    [Fact]
    public async Task RateLimit_DataBucket60_ThenIdentityBucketStillWorks_WithRetryAfter()
    {
        var mm = await MmClientAsync();
        HttpResponseMessage? last = null;
        for (var i = 0; i < 61; i++) last = await mm.GetAsync("/api/v1/integration/health");

        Assert.Equal((HttpStatusCode)429, last!.StatusCode);
        Assert.True(last.Headers.Contains("Retry-After"));
        Assert.Equal("rate_limited", (await Json(last)).GetProperty("error").GetProperty("code").GetString());

        // 資料桶用完不影響身分桶
        var id = await SeedUserAsync("opr", AppRoles.Operator);
        Assert.Equal(HttpStatusCode.OK, (await mm.GetAsync($"/api/v1/integration/users/{id}")).StatusCode);
    }
}
