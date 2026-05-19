using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PrintingIoT.Core.DTOs.Auth;
using PrintingIoT.Infrastructure.Data;
using BCrypt.Net;

namespace PrintingIoT.API.Controllers;

/// <summary>
/// AuthController — 使用者身分驗證 & JWT 簽發
/// Phase 4.3: Handles user login and generates JWT tokens.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly PrintingContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;

    public AuthController(PrintingContext context, IConfiguration config, ILogger<AuthController> logger)
    {
        _context = context;
        _config = config;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Username == request.Username);

        if (user == null || !user.IsActive)
        {
            _logger.LogWarning("Failed login attempt for unknown or inactive user: {Username}", request.Username);
            return Unauthorized("Invalid credentials.");
        }

        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            _logger.LogWarning("Failed login attempt for user due to invalid password: {Username}", request.Username);
            return Unauthorized("Invalid credentials.");
        }

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToArray();
        var token = GenerateJwtToken(user.Id.ToString(), user.Username, roles);

        return Ok(new LoginResponse(token, user.Username, roles));
    }

    [HttpPost("setup-admin")]
    public async Task<IActionResult> SetupAdmin([FromQuery] string password)
    {
        // Simple endpoint to create the initial admin user if none exists.
        // In a real app, this should only be available under specific conditions or seeded at startup.
        if (await _context.Users.AnyAsync())
        {
            return BadRequest("Users already exist. Setup can only run on empty database.");
        }

        var adminRole = new Core.Entities.Auth.Role { Name = "Admin" };
        _context.Roles.Add(adminRole);

        var adminUser = new Core.Entities.Auth.User
        {
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        };
        _context.Users.Add(adminUser);

        _context.UserRoles.Add(new Core.Entities.Auth.UserRole
        {
            User = adminUser,
            Role = adminRole
        });

        await _context.SaveChangesAsync();
        return Ok("Admin user created successfully.");
    }

    private string GenerateJwtToken(string userId, string username, string[] roles)
    {
        var secret = _config["Jwt:Secret"] ?? throw new InvalidOperationException("JWT Secret is not configured.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.UniqueName, username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2), // 2 hour expiration
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
