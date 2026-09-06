using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using PrintingIoT.Core.Constants;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// S5 授權矩陣整合測試(AC-01 ~ AC-12)。
///
/// 驗證「預設拒絕」確實生效:每個控制器至少一個端點在未帶權杖時回 401,
/// 帶有效 ADMIN 權杖時不會被授權層擋下;以及各具名 policy 的角色分界。
/// </summary>
public class AuthorizationMatrixTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;

    public AuthorizationMatrixTests()
    {
        _factory = AuthTestFactory.Create("AuthorizationMatrixTests-" + Guid.NewGuid());
    }

    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// 建立帶指定角色權杖的客戶端;不給角色則不帶任何 Authorization 標頭。
    /// 輸入:角色清單;輸出:HttpClient;邏輯:以 TestAuthTokenFactory 現簽權杖掛上標頭。
    /// </summary>
    private HttpClient Client(params string[] roles)
    {
        var client = _factory.CreateClient();
        if (roles.Length > 0)
            client.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(roles);
        return client;
    }

    /// <summary>
    /// 涵蓋每個控制器至少一個端點的路徑清單(method, path)。
    /// AC-01 / AC-02 共用同一份清單。
    /// </summary>
    public static IEnumerable<object[]> ProtectedEndpoints() => new List<object[]>
    {
        new object[] { "GET",  "/api/orders" },
        new object[] { "GET",  "/api/products" },
        new object[] { "GET",  "/api/reasons" },
        new object[] { "GET",  "/api/production/completions" },
        new object[] { "GET",  "/api/settings/communication" },
        new object[] { "GET",  "/api/settings/factory-time" },
        new object[] { "GET",  "/api/monitor/realtime" },
        new object[] { "GET",  "/api/monitor/history" },
        new object[] { "GET",  "/api/docs" },
        new object[] { "POST", "/api/simulation/speed" },
        new object[] { "POST", "/api/erp/push-orders" },
        new object[] { "GET",  "/api/v1/auth/users" },
        new object[] { "GET",  "/api/v1/apikeys" }, // S7:金鑰管理端點一併納入預設拒絕的回歸保護
    };

    /// <summary>
    /// 依方法字串送出請求(POST 一律送空 JSON 物件,足以通過模型繫結進入授權判斷)。
    /// 輸入:客戶端、HTTP 方法、路徑;輸出:回應。
    /// </summary>
    private static Task<HttpResponseMessage> SendAsync(HttpClient client, string method, string path) =>
        method switch
        {
            "GET" => client.GetAsync(path),
            "POST" => client.PostAsync(path, JsonContent.Create(new { })),
            "PUT" => client.PutAsync(path, JsonContent.Create(new { })),
            "DELETE" => client.DeleteAsync(path),
            _ => throw new ArgumentOutOfRangeException(nameof(method), method, "不支援的 HTTP 方法")
        };

    // AC-01:未帶權杖時每個端點都必須回 401,不得有任何一個回 2xx
    [Theory]
    [MemberData(nameof(ProtectedEndpoints))]
    public async Task NoToken_EveryController_Returns401(string method, string path)
    {
        var response = await SendAsync(Client(), method, path);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False((int)response.StatusCode is >= 200 and < 300, $"{method} {path} 未帶權杖不得成功");
    }

    // AC-02:帶有效 ADMIN 權杖時不得回 401 / 403(通過授權層即可,狀態碼由業務邏輯決定)
    [Theory]
    [MemberData(nameof(ProtectedEndpoints))]
    public async Task AdminToken_EveryController_NotUnauthorizedOrForbidden(string method, string path)
    {
        var response = await SendAsync(Client(AppRoles.Admin), method, path);

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // AC-03:權杖已過期 → 401
    [Fact]
    public async Task ExpiredToken_Returns401()
    {
        var expired = TestAuthTokenFactory.Create(
            new[] { AppRoles.Admin },
            TestAuthTokenFactory.TestingSecret,
            TestAuthTokenFactory.Issuer,
            TestAuthTokenFactory.Audience,
            DateTime.UtcNow.AddMinutes(-5));

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", expired);

        var response = await client.GetAsync("/api/orders");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-04:以不同簽章密鑰簽出的權杖 → 401
    [Fact]
    public async Task WrongSigningKey_Returns401()
    {
        var forged = TestAuthTokenFactory.Create(
            new[] { AppRoles.Admin },
            "CompletelyDifferentSecretKeyAtLeast32Chars!",
            TestAuthTokenFactory.Issuer,
            TestAuthTokenFactory.Audience,
            DateTime.UtcNow.AddHours(1));

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", forged);

        var response = await client.GetAsync("/api/orders");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-05:issuer 或 audience 不符 → 401
    [Theory]
    [InlineData("EvilIssuer", TestAuthTokenFactory.Audience)]
    [InlineData(TestAuthTokenFactory.Issuer, "EvilAudience")]
    public async Task WrongIssuerOrAudience_Returns401(string issuer, string audience)
    {
        var token = TestAuthTokenFactory.Create(
            new[] { AppRoles.Admin }, TestAuthTokenFactory.TestingSecret, issuer, audience, DateTime.UtcNow.AddHours(1));

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/orders");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-06:Authorization 標頭格式錯誤(缺 Bearer、亂碼)→ 401
    [Theory]
    [InlineData("Basic", "dXNlcjpwYXNz")]
    [InlineData("Bearer", "not-a-jwt-at-all")]
    public async Task MalformedAuthorizationHeader_Returns401(string scheme, string parameter)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(scheme, parameter);

        var response = await client.GetAsync("/api/orders");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-07:OPERATOR 改通訊設定 → 403;ADMIN 同一請求非 403
    [Fact]
    public async Task Operator_PutCommunicationSettings_Forbidden_ButAdminIsNot()
    {
        var operatorResponse = await Client(AppRoles.Operator)
            .PutAsync("/api/settings/communication", JsonContent.Create(new { plc_enabled = true }));
        Assert.Equal(HttpStatusCode.Forbidden, operatorResponse.StatusCode);

        var adminResponse = await Client(AppRoles.Admin)
            .PutAsync("/api/settings/communication", JsonContent.Create(new { plc_enabled = true }));
        Assert.NotEqual(HttpStatusCode.Forbidden, adminResponse.StatusCode);
    }

    // AC-08:OPERATOR 呼叫模擬端點 → 403
    [Fact]
    public async Task Operator_PostSimulationSpeed_Forbidden()
    {
        var response = await Client(AppRoles.Operator)
            .PostAsync("/api/simulation/speed", JsonContent.Create(new { speedFactor = 2 }));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // AC-09:OPERATOR 寫原因主檔 → 403;SUPERVISOR 同一請求非 403
    [Fact]
    public async Task Operator_PostReason_Forbidden_ButSupervisorIsNot()
    {
        var payload = new { code = "X99", name = "測試原因", category = "Test", type = "Stop" };

        var operatorResponse = await Client(AppRoles.Operator).PostAsync("/api/reasons", JsonContent.Create(payload));
        Assert.Equal(HttpStatusCode.Forbidden, operatorResponse.StatusCode);

        var supervisorResponse = await Client(AppRoles.Supervisor).PostAsync("/api/reasons", JsonContent.Create(payload));
        Assert.NotEqual(HttpStatusCode.Forbidden, supervisorResponse.StatusCode);
    }

    // AC-10:現場報工不得被角色鎖住
    [Fact]
    public async Task Operator_PostProductionCompletion_NotForbidden()
    {
        var response = await Client(AppRoles.Operator)
            .PostAsync("/api/production/completions", JsonContent.Create(new { }));

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-11:現場開完工(改訂單狀態)不得被角色鎖住
    [Fact]
    public async Task Operator_PutOrderStatus_NotForbidden()
    {
        var response = await Client(AppRoles.Operator)
            .PutAsync($"/api/orders/{Guid.NewGuid()}/status?status=Running", JsonContent.Create(new { }));

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-12:使用者清單僅 ADMIN 可讀
    [Fact]
    public async Task GetUsers_OperatorForbidden_AdminOk()
    {
        var operatorResponse = await Client(AppRoles.Operator).GetAsync("/api/v1/auth/users");
        Assert.Equal(HttpStatusCode.Forbidden, operatorResponse.StatusCode);

        var adminResponse = await Client(AppRoles.Admin).GetAsync("/api/v1/auth/users");
        Assert.Equal(HttpStatusCode.OK, adminResponse.StatusCode);
    }
}
