using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.API.Controllers;
using PrintingIoT.Core.DTOs.Auth;
using PrintingIoT.Core.Entities.Auth;
using PrintingIoT.Infrastructure.Data;
using System.Text.Json;

namespace PrintingIoT.Tests.Controllers;

/// <summary>
/// AuthController 單元測試
/// Phase 5.1: 提升控制器覆蓋率
/// </summary>
public class AuthControllerTests : IDisposable
{
    private const string SetupToken = "unit-test-setup-token";
    private const string StrongPassword = "UnitTestPassw0rd";

    private readonly PrintingContext _context;
    private readonly AuthController _controller;
    private readonly Mock<ILogger<AuthController>> _loggerMock;

    public AuthControllerTests()
    {
        var options = new DbContextOptionsBuilder<PrintingContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new PrintingContext(options);

        var configCache = new Dictionary<string, string?>
        {
            {"Jwt:Secret", "TestSuperSecretKeyThatIsAtLeast32CharactersLong!"},
            {"Jwt:Issuer", "TestIssuer"},
            {"Jwt:Audience", "TestAudience"},
            // S5:setup-admin 需要設定權杖才會啟用;未設定時端點回 404
            {"Auth:SetupToken", SetupToken},
            {"Auth:MinPasswordLength", "12"}
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configCache)
            .Build();

        _loggerMock = new Mock<ILogger<AuthController>>();

        _controller = new AuthController(_context, configuration, _loggerMock.Object);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    /// <summary>
    /// S5:空資料庫 + 正確設定權杖 + 合格密碼 → 建立 ADMIN 使用者(角色為大寫)。
    /// </summary>
    [Fact]
    public async Task SetupAdmin_CreatesUser_WhenDatabaseEmpty()
    {
        var result = await _controller.SetupAdmin(
            new SetupAdminRequest(SetupToken, "admin", StrongPassword, "系統管理者"));

        Assert.IsType<OkObjectResult>(result);

        var adminUser = await _context.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Username == "admin");
        Assert.NotNull(adminUser);
        Assert.True(BCrypt.Net.BCrypt.Verify(StrongPassword, adminUser.PasswordHash));
        Assert.Contains(adminUser.UserRoles, ur => ur.Role.Name == "ADMIN");
    }

    /// <summary>
    /// S5:Users 表非空時語意由 400 改為 409 Conflict(前提「只在空庫可用」不變)。
    /// </summary>
    [Fact]
    public async Task SetupAdmin_ReturnsConflict_WhenDatabaseNotEmpty()
    {
        _context.Users.Add(new User { Username = "user", PasswordHash = "hash" });
        await _context.SaveChangesAsync();

        var result = await _controller.SetupAdmin(
            new SetupAdminRequest(SetupToken, "admin", StrongPassword, null));

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.Contains("Users already exist", conflict.Value?.ToString());
    }

    /// <summary>
    /// S5:設定權杖不符 → 401,且資料庫維持為空(不得留下半套資料)。
    /// </summary>
    [Fact]
    public async Task SetupAdmin_ReturnsUnauthorized_WhenSetupTokenWrong()
    {
        var result = await _controller.SetupAdmin(
            new SetupAdminRequest("wrong-token", "admin", StrongPassword, null));

        Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Empty(await _context.Users.ToListAsync());
        Assert.Empty(await _context.Roles.ToListAsync());
    }

    /// <summary>
    /// S5:密碼強度不足 → 400,且 Users 與 Roles 皆維持為空。
    /// </summary>
    [Fact]
    public async Task SetupAdmin_ReturnsBadRequest_WhenPasswordTooWeak()
    {
        var result = await _controller.SetupAdmin(
            new SetupAdminRequest(SetupToken, "admin", "short1", null));

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(await _context.Users.ToListAsync());
        Assert.Empty(await _context.Roles.ToListAsync());
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenUserNotFound()
    {
        var result = await _controller.Login(new LoginRequest("nonexistent", "pw"));
        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenPasswordInvalid()
    {
        var user = new User { Username = "testuser", PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct_pw") };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _controller.Login(new LoginRequest("testuser", "wrong_pw"));
        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_ReturnsToken_WhenCredentialsValid()
    {
        var role = new Role { Name = "Operator" };
        var user = new User { Username = "op1", PasswordHash = BCrypt.Net.BCrypt.HashPassword("op_pw") };
        _context.Roles.Add(role);
        _context.Users.Add(user);
        _context.UserRoles.Add(new UserRole { User = user, Role = role });
        await _context.SaveChangesAsync();

        var result = await _controller.Login(new LoginRequest("op1", "op_pw"));

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<LoginResponse>(okResult.Value);

        Assert.Equal("op1", response.Username);
        Assert.Contains("OPERATOR", response.Roles); // S5:角色一律大寫正規化
        Assert.False(string.IsNullOrEmpty(response.Token));
    }
}
