using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.DTOs.Auth;
using PrintingIoT.Core.Entities.Auth;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// S5 登入與初始化路徑整合測試(AC-13 ~ AC-25)。
///
/// 涵蓋:login 為匿名端點、setup-admin 的四重保護與「不留半套資料」、
/// 使用者管理端點的建立 / 查詢 / 更新,以及角色大寫正規化對舊資料的相容。
/// </summary>
public class AuthSetupAndUsersTests
{
    private const string SetupToken = "integration-setup-token";
    private const string StrongPassword = "Str0ngPassword!123";

    /// <summary>
    /// 建立一個獨立的測試工廠。
    /// 輸入:是否設定 Auth:SetupToken;輸出:工廠;
    /// 邏輯:每個測試各自一個 InMemory 資料庫,彼此不互相汙染。
    /// </summary>
    private static WebApplicationFactory<Program> CreateFactory(bool withSetupToken)
    {
        var settings = new Dictionary<string, string?>
        {
            ["Auth:SetupToken"] = withSetupToken ? SetupToken : "",
            ["Auth:MinPasswordLength"] = "12",
            // 一律放寬登入限流,避免同一批測試連續登入撞到 429
            ["RateLimit:Auth:PermitLimit"] = "1000",
        };
        return AuthTestFactory.Create("AuthSetupAndUsersTests-" + Guid.NewGuid(), settings);
    }

    /// <summary>取得測試用的資料庫上下文(獨立 scope)。</summary>
    private static (IServiceScope scope, PrintingContext context) CreateContext(WebApplicationFactory<Program> factory)
    {
        var scope = factory.Services.CreateScope();
        return (scope, scope.ServiceProvider.GetRequiredService<PrintingContext>());
    }

    /// <summary>在資料庫直接建立一個使用者(繞過 API,用於準備前置資料)。</summary>
    private static async Task SeedUserAsync(WebApplicationFactory<Program> factory, string username, string password, string roleName)
    {
        var (scope, context) = CreateContext(factory);
        using (scope)
        {
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
        }
    }

    // AC-13:login 為匿名端點,正確帳密回 200 且權杖非空
    [Fact]
    public async Task Login_WithoutToken_ValidCredentials_Returns200AndToken()
    {
        using var factory = CreateFactory(withSetupToken: false);
        await SeedUserAsync(factory, "op1", StrongPassword, AppRoles.Operator);

        var response = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("op1", StrongPassword));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));
    }

    // AC-14:密碼錯誤回 401(來自控制器,非授權層)
    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        using var factory = CreateFactory(withSetupToken: false);
        await SeedUserAsync(factory, "op1", StrongPassword, AppRoles.Operator);

        var response = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("op1", "definitely-wrong"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-15:未設定 Auth:SetupToken 時,setup-admin 視同不存在
    [Fact]
    public async Task SetupAdmin_WithoutConfiguredToken_Returns404()
    {
        using var factory = CreateFactory(withSetupToken: false);

        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/setup-admin",
            new SetupAdminRequest("whatever", "admin", StrongPassword, null));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // AC-16:設定權杖錯誤 → 401,且資料庫仍為空
    [Fact]
    public async Task SetupAdmin_WrongSetupToken_Returns401_AndDatabaseStaysEmpty()
    {
        using var factory = CreateFactory(withSetupToken: true);

        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/setup-admin",
            new SetupAdminRequest("wrong-token", "admin", StrongPassword, null));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var (scope, context) = CreateContext(factory);
        using (scope) Assert.Empty(await context.Users.ToListAsync());
    }

    // AC-17:空庫 + 正確權杖 + 合格密碼 → 200,建立 ADMIN 使用者且雜湊可驗
    [Fact]
    public async Task SetupAdmin_HappyPath_CreatesAdminUser()
    {
        using var factory = CreateFactory(withSetupToken: true);

        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/setup-admin",
            new SetupAdminRequest(SetupToken, "boss", StrongPassword, "廠長"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var (scope, context) = CreateContext(factory);
        using (scope)
        {
            var user = await context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .SingleAsync();

            Assert.Equal("boss", user.Username);
            Assert.Equal("廠長", user.DisplayName);
            Assert.True(user.IsActive);
            Assert.True(BCrypt.Net.BCrypt.Verify(StrongPassword, user.PasswordHash));
            Assert.Contains(user.UserRoles, ur => ur.Role.Name == AppRoles.Admin);
        }
    }

    // AC-18:Users 表已有使用者 → 409 且不新增任何列
    [Fact]
    public async Task SetupAdmin_WhenUsersExist_Returns409_AndAddsNothing()
    {
        using var factory = CreateFactory(withSetupToken: true);
        await SeedUserAsync(factory, "existing", StrongPassword, AppRoles.Operator);

        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/setup-admin",
            new SetupAdminRequest(SetupToken, "admin", StrongPassword, null));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var (scope, context) = CreateContext(factory);
        using (scope) Assert.Single(await context.Users.ToListAsync());
    }

    // AC-19:密碼強度不足 → 400,且 Users 與 Roles 皆維持為空(不留半套資料)
    [Fact]
    public async Task SetupAdmin_WeakPassword_Returns400_AndLeavesNoRows()
    {
        using var factory = CreateFactory(withSetupToken: true);

        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/setup-admin",
            new SetupAdminRequest(SetupToken, "admin", "short1", null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var (scope, context) = CreateContext(factory);
        using (scope)
        {
            Assert.Empty(await context.Users.ToListAsync());
            Assert.Empty(await context.Roles.ToListAsync());
        }
    }

    // AC-20:密碼走 query string、無 body → 400,證明 query string 路徑已消失
    [Fact]
    public async Task SetupAdmin_QueryStringPassword_NoBody_Returns400()
    {
        using var factory = CreateFactory(withSetupToken: true);

        var response = await factory.CreateClient().PostAsync(
            "/api/v1/auth/setup-admin?password=SuperSecret123",
            new StringContent("", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var (scope, context) = CreateContext(factory);
        using (scope) Assert.Empty(await context.Users.ToListAsync());
    }

    // AC-21:ADMIN 建立 OPERATOR → 201,且該帳號隨即可登入,roles 為 ["OPERATOR"]
    [Fact]
    public async Task CreateUser_ThenLogin_Works()
    {
        using var factory = CreateFactory(withSetupToken: false);

        var admin = factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var created = await admin.PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("op7", StrongPassword, "operator", "七號機作業員", "A"));

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var summary = await created.Content.ReadFromJsonAsync<UserSummary>();
        Assert.Equal(new[] { AppRoles.Operator }, summary!.Roles);

        var login = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("op7", StrongPassword));

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var body = await login.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.Equal(new[] { AppRoles.Operator }, body!.Roles);
    }

    // AC-22:重複 username(含大小寫不同)→ 409
    [Fact]
    public async Task CreateUser_DuplicateUsernameIgnoringCase_Returns409()
    {
        using var factory = CreateFactory(withSetupToken: false);

        var admin = factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var first = await admin.PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("Op8", StrongPassword, AppRoles.Operator, null, null));
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        var second = await admin.PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("oP8", StrongPassword, AppRoles.Operator, null, null));
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    // AC-23:資料庫殘留舊角色字串 "Admin" 時,login 回的角色與權杖 claim 皆為 "ADMIN"
    [Fact]
    public async Task Login_LegacyMixedCaseRole_IsNormalizedToUpper()
    {
        using var factory = CreateFactory(withSetupToken: false);
        await SeedUserAsync(factory, "legacy", StrongPassword, "Admin"); // 舊資料寫法

        var response = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("legacy", StrongPassword));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.Equal(new[] { AppRoles.Admin }, body!.Roles);

        // 權杖內的 role claim 亦須為大寫:直接拿去呼叫僅 ADMIN 可用的端點應成功
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", body.Token);
        var users = await client.GetAsync("/api/v1/auth/users");
        Assert.Equal(HttpStatusCode.OK, users.StatusCode);
    }

    // AC-24:停用最後一個啟用中的 ADMIN → 409
    [Fact]
    public async Task UpdateUser_DisableLastActiveAdmin_Returns409()
    {
        using var factory = CreateFactory(withSetupToken: false);
        await SeedUserAsync(factory, "onlyadmin", StrongPassword, AppRoles.Admin);

        Guid adminId;
        var (scope, context) = CreateContext(factory);
        using (scope) adminId = (await context.Users.SingleAsync(u => u.Username == "onlyadmin")).Id;

        var admin = factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var disable = await admin.PutAsJsonAsync($"/api/v1/auth/users/{adminId}",
            new UpdateUserRequest(null, null, null, null, false));
        Assert.Equal(HttpStatusCode.Conflict, disable.StatusCode);

        var demote = await admin.PutAsJsonAsync($"/api/v1/auth/users/{adminId}",
            new UpdateUserRequest(null, null, AppRoles.Operator, null, null));
        Assert.Equal(HttpStatusCode.Conflict, demote.StatusCode);
    }

    // AC-25:GET users 回應本體不得含 passwordHash(整份字串比對)
    [Fact]
    public async Task GetUsers_ResponseNeverContainsPasswordHash()
    {
        using var factory = CreateFactory(withSetupToken: false);
        await SeedUserAsync(factory, "op9", StrongPassword, AppRoles.Operator);

        var admin = factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var response = await admin.GetAsync("/api/v1/auth/users");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var raw = await response.Content.ReadAsStringAsync();
        Assert.Contains("op9", raw);
        Assert.DoesNotContain("passwordHash", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("$2a$", raw); // BCrypt 雜湊前綴
    }

    // ── S6:登入帳號不分大小寫(AC-47 ~ AC-56)────────────────────────────────

    // AC-47(本輪核心):ADMIN 建立 "OP1" 後,以 "op1" 登入成功,且回應保留原始大小寫
    [Fact]
    public async Task Login_UsernameIsCaseInsensitive_AndResponseKeepsOriginalCasing()
    {
        using var factory = CreateFactory(withSetupToken: false);

        var admin = factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var created = await admin.PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("OP1", StrongPassword, AppRoles.Operator, "一號機作業員", "A"));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var login = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("op1", StrongPassword));

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var body = await login.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.Equal("OP1", body!.Username); // 顯示形態必須是資料庫中的原始大小寫
    }

    // AC-48:setup-admin 建立 "Admin1" 後,以 "admin1" 登入 → 200
    [Fact]
    public async Task SetupAdmin_ThenLoginWithDifferentCasing_Returns200()
    {
        using var factory = CreateFactory(withSetupToken: true);

        var setup = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/setup-admin",
            new SetupAdminRequest(SetupToken, "Admin1", StrongPassword, null));
        Assert.Equal(HttpStatusCode.OK, setup.StatusCode);

        var login = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("admin1", StrongPassword));

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var body = await login.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.Equal("Admin1", body!.Username);
    }

    // AC-49:帳號前後帶空白(觸控鍵盤 / 條碼槍)仍可登入 —— Trim 生效
    [Fact]
    public async Task Login_UsernameWithSurroundingWhitespace_Returns200()
    {
        using var factory = CreateFactory(withSetupToken: false);
        await SeedUserAsync(factory, "op1", StrongPassword, AppRoles.Operator);

        var response = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(" op1 ", StrongPassword));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // AC-50:密碼永遠精確比對 —— 只有帳號不分大小寫,密碼大小寫不同一律 401
    [Fact]
    public async Task Login_PasswordRemainsCaseSensitive_Returns401()
    {
        using var factory = CreateFactory(withSetupToken: false);
        await SeedUserAsync(factory, "op1", StrongPassword, AppRoles.Operator);

        var response = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("op1", StrongPassword.ToUpperInvariant()));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-51(S5 E1):Users 表為空時任意帳密皆 401,且資料庫仍為空
    [Fact]
    public async Task Login_WithEmptyUsersTable_Returns401_AndDatabaseStaysEmpty()
    {
        using var factory = CreateFactory(withSetupToken: false);

        var response = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("anyone", "anything"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var (scope, context) = CreateContext(factory);
        using (scope) Assert.Empty(await context.Users.ToListAsync());
    }

    // AC-52:正規化發生在實體層 —— 繞過 API 直接寫 DbContext 也會自動填好 UsernameNormalized
    [Fact]
    public async Task User_UsernameNormalized_IsSetByEntityRegardlessOfWritePath()
    {
        using var factory = CreateFactory(withSetupToken: false);

        var (scope, context) = CreateContext(factory);
        using (scope)
        {
            context.Users.Add(new User { Username = "Op9", PasswordHash = "x" });
            await context.SaveChangesAsync();
        }

        var (readScope, readContext) = CreateContext(factory);
        using (readScope)
        {
            var user = await readContext.Users.SingleAsync(u => u.Username == "Op9");
            Assert.Equal("OP9", user.UsernameNormalized);
        }
    }

    // AC-53:模型層同時存在 UsernameNormalized 唯一索引與既有的 Username 唯一索引
    [Fact]
    public async Task Model_HasUniqueIndexOnUsernameNormalized_AndKeepsUsernameIndex()
    {
        using var factory = CreateFactory(withSetupToken: false);

        var (scope, context) = CreateContext(factory);
        using (scope)
        {
            var indexes = context.Model.FindEntityType(typeof(User))!.GetIndexes().ToList();

            Assert.Contains(indexes, i => i.IsUnique &&
                i.Properties.Count == 1 && i.Properties[0].Name == nameof(User.UsernameNormalized));
            Assert.Contains(indexes, i => i.IsUnique &&
                i.Properties.Count == 1 && i.Properties[0].Name == nameof(User.Username));
        }

        await Task.CompletedTask;
    }

    // AC-54:停用中的使用者以不同大小寫登入仍 401 —— 正規化不得旁路 IsActive 檢查
    [Fact]
    public async Task Login_InactiveUserWithDifferentCasing_Returns401()
    {
        using var factory = CreateFactory(withSetupToken: false);
        await SeedUserAsync(factory, "op1", StrongPassword, AppRoles.Operator);

        var (scope, context) = CreateContext(factory);
        using (scope)
        {
            var user = await context.Users.SingleAsync(u => u.Username == "op1");
            user.IsActive = false;
            await context.SaveChangesAsync();
        }

        var response = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("OP1", StrongPassword));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // AC-55:使用者清單回原始大小寫的帳號,且整份回應不得外洩 usernameNormalized
    [Fact]
    public async Task GetUsers_ReturnsOriginalCasing_AndNeverExposesNormalizedColumn()
    {
        using var factory = CreateFactory(withSetupToken: false);

        var admin = factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var created = await admin.PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("OP1", StrongPassword, AppRoles.Operator, null, null));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var response = await admin.GetAsync("/api/v1/auth/users");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var raw = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"OP1\"", raw);
        Assert.DoesNotContain("usernameNormalized", raw, StringComparison.OrdinalIgnoreCase);
    }

    // AC-56:建立 "OP1" 後再以 "op1" 建立 → 409(改由 UsernameNormalized 查詢達成)
    [Fact]
    public async Task CreateUser_DuplicateNormalizedUsername_Returns409()
    {
        using var factory = CreateFactory(withSetupToken: false);

        var admin = factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var first = await admin.PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("OP1", StrongPassword, AppRoles.Operator, null, null));
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        var second = await admin.PostAsJsonAsync("/api/v1/auth/users",
            new CreateUserRequest("op1", StrongPassword, AppRoles.Operator, null, null));
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }
}
