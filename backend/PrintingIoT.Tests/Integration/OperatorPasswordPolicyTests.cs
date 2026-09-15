using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.DTOs.Auth;
using PrintingIoT.Core.Entities.Auth;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// S17 密碼政策依角色分流(AC-01 ~ AC-07,spec20260915-1)。
///
/// 現場觸控機台沒有實體鍵盤,12 碼英數密碼在看板前輸入不現實,
/// 因此 OPERATOR 放寬到 4 碼且允許純數字(約定值 0000);
/// ADMIN / ENGINEER / SUPERVISOR 一律維持 12 碼英數 —— 管理者是唯一的管理入口,強度不得被連帶削弱。
/// </summary>
public class OperatorPasswordPolicyTests
{
    private const string StrongPassword = "Str0ngPassword!123";
    private const string OperatorPassword = "0000";

    /// <summary>
    /// 建立測試工廠。
    /// 輸入:無;輸出:工廠;
    /// 邏輯:每個測試各自一個 InMemory 資料庫;密碼長度兩個門檻都明寫,
    ///       不倚賴 appsettings 的預設值 —— 測試要釘的是行為,不是設定檔現在剛好寫什麼。
    /// </summary>
    private static WebApplicationFactory<Program> CreateFactory()
    {
        var settings = new Dictionary<string, string?>
        {
            ["Auth:SetupToken"] = "",
            ["Auth:MinPasswordLength"] = "12",
            ["Auth:OperatorMinPasswordLength"] = "4",
            ["RateLimit:Auth:PermitLimit"] = "1000",
        };
        return AuthTestFactory.Create("OperatorPasswordPolicyTests-" + Guid.NewGuid(), settings);
    }

    /// <summary>取得掛好 ADMIN 權杖的用戶端。</summary>
    private static HttpClient AdminClient(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);
        return client;
    }

    /// <summary>在資料庫直接建立一個使用者(繞過 API),回傳其 Id。</summary>
    private static async Task<Guid> SeedUserAsync(WebApplicationFactory<Program> factory, string username, string password, string roleName)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();

        var role = await context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (role == null)
        {
            role = new Role { Name = roleName };
            context.Roles.Add(role);
        }
        var user = new User { Username = username, PasswordHash = BCrypt.Net.BCrypt.HashPassword(password) };
        context.Users.Add(user);
        context.UserRoles.Add(new UserRole { User = user, Role = role });
        await context.SaveChangesAsync();
        return user.Id;
    }

    // AC-01:ADMIN 建 OPERATOR、密碼 0000 → 201
    [Fact]
    public async Task CreateOperator_WithFourDigitPassword_Returns201()
    {
        using var factory = CreateFactory();

        var response = await AdminClient(factory).PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("OP9", OperatorPassword, AppRoles.Operator, "九號機作業員", "A"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // AC-02:ADMIN 建 ADMIN、密碼 0000 → 400,且訊息指出 12 碼
    [Fact]
    public async Task CreateAdmin_WithFourDigitPassword_Returns400()
    {
        using var factory = CreateFactory();

        var response = await AdminClient(factory).PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("admin2", OperatorPassword, AppRoles.Admin, null, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("12", await response.Content.ReadAsStringAsync());
    }

    // AC-02b:ENGINEER / SUPERVISOR 同樣不受放寬影響
    [Theory]
    [InlineData(AppRoles.Engineer)]
    [InlineData(AppRoles.Supervisor)]
    public async Task CreateNonOperator_WithFourDigitPassword_Returns400(string role)
    {
        using var factory = CreateFactory();

        var response = await AdminClient(factory).PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("user-" + role, OperatorPassword, role, null, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // AC-03:OPERATOR 密碼低於門檻(3 碼)→ 400 —— 放寬不等於沒有下限
    [Fact]
    public async Task CreateOperator_BelowOperatorMinimum_Returns400()
    {
        using var factory = CreateFactory();

        var response = await AdminClient(factory).PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("OP10", "000", AppRoles.Operator, null, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // AC-04:把既有 OPERATOR 的密碼改成 0000 → 204(P2 現場要走的就是這條路徑)
    [Fact]
    public async Task UpdateOperator_ToFourDigitPassword_Returns204()
    {
        using var factory = CreateFactory();
        var id = await SeedUserAsync(factory, "OP11", StrongPassword, AppRoles.Operator);

        var response = await AdminClient(factory).PutAsJsonAsync($"/api/v1/auth/users/{id}",
            new UpdateUserRequest(null, null, null, OperatorPassword, null));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // 改完要真的登得進去,否則這條路徑等於沒有完成
        var login = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("OP11", OperatorPassword));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    // AC-05:同一次請求把 OPERATOR 升成 ADMIN 又設 4 碼密碼 → 400
    //        判準必須取「這次請求之後的角色」,取舊角色會放行一個弱密碼的管理者
    [Fact]
    public async Task UpdateUser_PromoteToAdminWithWeakPassword_Returns400()
    {
        using var factory = CreateFactory();
        var id = await SeedUserAsync(factory, "OP12", StrongPassword, AppRoles.Operator);

        var response = await AdminClient(factory).PutAsJsonAsync($"/api/v1/auth/users/{id}",
            new UpdateUserRequest(null, null, AppRoles.Admin, OperatorPassword, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        // 舊密碼仍然有效,代表這次請求真的什麼都沒寫進去
        var login = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("OP12", StrongPassword));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    // AC-06:既有 ADMIN 改 11 碼密碼 → 400(既有強度未被削弱)
    [Fact]
    public async Task UpdateAdmin_WithElevenCharPassword_Returns400()
    {
        using var factory = CreateFactory();
        await SeedUserAsync(factory, "keepadmin", StrongPassword, AppRoles.Admin); // 保住「最後一位 ADMIN」約束
        var id = await SeedUserAsync(factory, "admin3", StrongPassword, AppRoles.Admin);

        var response = await AdminClient(factory).PutAsJsonAsync($"/api/v1/auth/users/{id}",
            new UpdateUserRequest(null, null, null, "Passw0rd123", null)); // 11 碼

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // AC-07:OP 帳號以 0000 登入 → 200,角色 OPERATOR(前端一鍵登入倚賴的就是這個)
    [Fact]
    public async Task Login_OperatorWithDefaultPassword_Returns200()
    {
        using var factory = CreateFactory();
        await AdminClient(factory).PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("OP13", OperatorPassword, AppRoles.Operator, "十三號機", "A"));

        var login = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("OP13", OperatorPassword));

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var body = await login.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.Equal(new[] { AppRoles.Operator }, body!.Roles);
    }
}
