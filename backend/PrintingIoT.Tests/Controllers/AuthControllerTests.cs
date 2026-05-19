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
            {"Jwt:Audience", "TestAudience"}
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

    [Fact]
    public async Task SetupAdmin_CreatesUser_WhenDatabaseEmpty()
    {
        var result = await _controller.SetupAdmin("password123");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal("Admin user created successfully.", okResult.Value);

        var adminUser = await _context.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Username == "admin");
        Assert.NotNull(adminUser);
        Assert.True(BCrypt.Net.BCrypt.Verify("password123", adminUser.PasswordHash));
        Assert.Contains(adminUser.UserRoles, ur => ur.Role.Name == "Admin");
    }

    [Fact]
    public async Task SetupAdmin_ReturnsBadRequest_WhenDatabaseNotEmpty()
    {
        _context.Users.Add(new User { Username = "user", PasswordHash = "hash" });
        await _context.SaveChangesAsync();

        var result = await _controller.SetupAdmin("password");

        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Users already exist", badRequestResult.Value?.ToString());
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
        Assert.Contains("Operator", response.Roles);
        Assert.False(string.IsNullOrEmpty(response.Token));
    }
}
