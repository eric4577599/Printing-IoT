using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.DTOs.Auth;
using PrintingIoT.Core.Entities.Auth;
using PrintingIoT.Core.Security;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// S7 權杖刷新整合測試(AC-S7-30 ~ AC-S7-42)。
///
/// 覆蓋 E2 的解法與其安全邊界:換發成功、憑證輪替、重用偵測、到期、停用帳號、登出。
/// </summary>
public class RefreshTokenTests : IDisposable
{
    private const string TestPassword = "CorrectHorse123!";

    private readonly WebApplicationFactory<Program> _factory;

    public RefreshTokenTests()
    {
        _factory = AuthTestFactory.Create("RefreshTokenTests-" + Guid.NewGuid());
    }

    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// 在測試資料庫植入一個可登入的帳號。
    /// 輸入:帳號、角色、是否啟用;輸出:使用者 Id;
    /// 邏輯:直接寫實體,不走 setup-admin,避免測試被該端點的一次性限制綁住。
    /// </summary>
    private async Task<Guid> SeedUserAsync(string username, string role = AppRoles.Operator, bool isActive = true)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();

        var roleEntity = await context.Roles.FirstOrDefaultAsync(r => r.Name == role);
        if (roleEntity == null)
        {
            roleEntity = new Role { Name = role };
            context.Roles.Add(roleEntity);
        }

        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword),
            DisplayName = "測試員",
            IsActive = isActive,
        };
        context.Users.Add(user);
        context.UserRoles.Add(new UserRole { User = user, Role = roleEntity });
        await context.SaveChangesAsync();

        return user.Id;
    }

    /// <summary>登入並取回 LoginResponse。</summary>
    private async Task<LoginResponse> LoginAsync(string username)
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(username, TestPassword));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LoginResponse>())!;
    }

    /// <summary>送出一次換發請求。</summary>
    private Task<HttpResponseMessage> RefreshAsync(string? refreshToken) =>
        _factory.CreateClient().PostAsJsonAsync("/api/v1/auth/refresh", new RefreshRequest(refreshToken!));

    // AC-S7-30:登入回應必須帶刷新憑證與其到期時間(沒有它前端根本無從刷新)
    [Fact]
    public async Task Login_ReturnsRefreshToken()
    {
        await SeedUserAsync("OP30");

        var login = await LoginAsync("OP30");

        Assert.False(string.IsNullOrWhiteSpace(login.RefreshToken));
        Assert.NotNull(login.RefreshTokenExpiresAt);
        Assert.True(login.RefreshTokenExpiresAt > login.ExpiresAt,
            "刷新憑證必須比存取權杖活得久,否則刷不了任何東西");
    }

    // AC-S7-31:刷新憑證只存雜湊,明文不得入庫
    [Fact]
    public async Task Login_StoresOnlyHashedRefreshToken()
    {
        await SeedUserAsync("OP31");
        var login = await LoginAsync("OP31");

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();
        var rows = await context.RefreshTokens.AsNoTracking().ToListAsync();

        Assert.Single(rows);
        Assert.Equal(SecureTokens.Hash(login.RefreshToken!), rows[0].TokenHash);
        Assert.DoesNotContain(rows, r => r.TokenHash == login.RefreshToken);
    }

    // AC-S7-32:換發成功 → 200,且拿到的是**不同的**存取權杖與刷新憑證
    [Fact]
    public async Task Refresh_ReturnsNewAccessTokenAndRotatesRefreshToken()
    {
        await SeedUserAsync("OP32");
        var login = await LoginAsync("OP32");

        var response = await RefreshAsync(login.RefreshToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var refreshed = (await response.Content.ReadFromJsonAsync<LoginResponse>())!;
        Assert.False(string.IsNullOrWhiteSpace(refreshed.Token));
        Assert.False(string.IsNullOrWhiteSpace(refreshed.RefreshToken));
        Assert.NotEqual(login.RefreshToken, refreshed.RefreshToken);
        Assert.Equal("OP32", refreshed.Username);
        Assert.Equal(new[] { AppRoles.Operator }, refreshed.Roles);
    }

    // AC-S7-33:換發後的新存取權杖確實打得開受保護端點(不只是字串長得像權杖)
    [Fact]
    public async Task Refresh_NewAccessTokenIsAccepted()
    {
        await SeedUserAsync("OP33", AppRoles.Admin);
        var login = await LoginAsync("OP33");

        var refreshed = (await (await RefreshAsync(login.RefreshToken)).Content
            .ReadFromJsonAsync<LoginResponse>())!;

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", refreshed.Token);

        var response = await client.GetAsync("/api/orders");
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // AC-S7-34:輪替 —— 舊憑證換過一次之後就不能再用
    [Fact]
    public async Task Refresh_OldTokenIsRejectedAfterRotation()
    {
        await SeedUserAsync("OP34");
        var login = await LoginAsync("OP34");

        Assert.Equal(HttpStatusCode.OK, (await RefreshAsync(login.RefreshToken)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(login.RefreshToken)).StatusCode);
    }

    // AC-S7-35:重用偵測 —— 已作廢的憑證再度出現時,該使用者的**全部**憑證一併作廢
    [Fact]
    public async Task Refresh_ReuseOfRevokedToken_RevokesEntireChain()
    {
        var userId = await SeedUserAsync("OP35");
        var login = await LoginAsync("OP35");

        var second = (await (await RefreshAsync(login.RefreshToken)).Content
            .ReadFromJsonAsync<LoginResponse>())!;

        // 舊憑證重送 = 外洩訊號
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(login.RefreshToken)).StatusCode);

        // 連原本還有效的那張也必須失效
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(second.RefreshToken)).StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();
        var live = await context.RefreshTokens.CountAsync(r => r.UserId == userId && r.RevokedAt == null);
        Assert.Equal(0, live);
    }

    // AC-S7-36:已到期的刷新憑證 → 401
    [Fact]
    public async Task Refresh_WithExpiredToken_Returns401()
    {
        var userId = await SeedUserAsync("OP36");
        var login = await LoginAsync("OP36");

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();
            var row = await context.RefreshTokens.FirstAsync(r => r.UserId == userId);
            row.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            await context.SaveChangesAsync();
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(login.RefreshToken)).StatusCode);
    }

    // AC-S7-37:偽造 / 空白 / null 憑證 → 401
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("totally-made-up-token")]
    public async Task Refresh_WithBogusToken_Returns401(string bogus)
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(bogus)).StatusCode);
    }

    // AC-S7-38:帳號在憑證有效期內被停用 → 換發立刻失效,不必等憑證自然到期
    [Fact]
    public async Task Refresh_AfterUserDeactivated_Returns401()
    {
        var userId = await SeedUserAsync("OP38");
        var login = await LoginAsync("OP38");

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();
            var user = await context.Users.FirstAsync(u => u.Id == userId);
            user.IsActive = false;
            await context.SaveChangesAsync();
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(login.RefreshToken)).StatusCode);
    }

    // AC-S7-39:登出後該憑證不能再換發
    [Fact]
    public async Task Logout_RevokesRefreshToken()
    {
        await SeedUserAsync("OP39");
        var login = await LoginAsync("OP39");

        var logout = await _factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/logout", new LogoutRequest(login.RefreshToken));
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(login.RefreshToken)).StatusCode);
    }

    // AC-S7-40:登出端點不得洩漏憑證是否存在 —— 空的 / 不存在的憑證一樣回 204
    [Fact]
    public async Task Logout_WithUnknownOrEmptyToken_StillReturns204()
    {
        var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostAsJsonAsync("/api/v1/auth/logout", new LogoutRequest(null))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostAsJsonAsync("/api/v1/auth/logout", new LogoutRequest("nope"))).StatusCode);
    }

    // AC-S7-41:ADMIN 停用帳號時,該帳號的刷新憑證同時被作廢(不必等下一次換發才擋)
    [Fact]
    public async Task UpdateUser_DeactivatingUser_RevokesRefreshTokens()
    {
        var userId = await SeedUserAsync("OP41");
        await LoginAsync("OP41");

        var admin = _factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);

        var response = await admin.PutAsJsonAsync($"/api/v1/auth/users/{userId}",
            new UpdateUserRequest(null, null, null, null, false));
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();
        var live = await context.RefreshTokens.CountAsync(r => r.UserId == userId && r.RevokedAt == null);
        Assert.Equal(0, live);
    }

    // AC-S7-42:換發端點免驗證 —— 存取權杖已過期的客戶端必須換得到新的,否則刷新機制毫無意義
    [Fact]
    public async Task Refresh_WorksWithoutAccessToken()
    {
        await SeedUserAsync("OP42");
        var login = await LoginAsync("OP42");

        // 刻意不帶任何 Authorization 標頭
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/refresh", new RefreshRequest(login.RefreshToken!));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
