using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.DTOs.Auth;
using PrintingIoT.Core.Security;
using PrintingIoT.Infrastructure.Data;
using BCrypt.Net;

namespace PrintingIoT.API.Controllers;

/// <summary>
/// AuthController — 使用者身分驗證、JWT 簽發與使用者管理。
///
/// S5:
/// - login / setup-admin 為僅有的兩個匿名端點,其餘一律需要身分。
/// - setup-admin 密碼改走 body,並以「設定權杖 + Users 表為空 + 密碼強度 + 專屬限流」四重保護。
/// - 使用者管理(GET / POST / PUT)僅限 ADMIN(UserAdmin policy)。
/// - 角色一律以 AppRoles.Normalize 大寫後才寫入 claim,舊資料殘留大小寫混用亦不影響授權。
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
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

    /// <summary>
    /// 登入並取得 JWT。
    /// 輸入:{ username, password };
    /// 輸出:200 + LoginResponse(權杖、帳號、大寫角色、顯示名稱、到期時間),失敗一律 401;
    /// 邏輯:帳號先以 AppUsernames.Normalize 正規化(S6:不分大小寫、去前後空白),
    ///       比對 UsernameNormalized → BCrypt 驗密碼(**永遠精確比對**)→ 角色大寫正規化 → 簽發 2 小時效期權杖。
    /// 失敗訊息刻意不區分「帳號不存在」與「密碼錯誤」,避免帳號列舉。
    /// 正規化必須在 C# 端算好再進 LINQ,不可寫成 u.Username.ToUpper() —— 後者會讓 PostgreSQL 索引失效並全表掃描。
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var normalized = AppUsernames.Normalize(request?.Username);

        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.UsernameNormalized == normalized);

        if (user == null || !user.IsActive)
        {
            _logger.LogWarning("Failed login attempt for unknown or inactive user: {Username}", request?.Username);
            return Unauthorized("Invalid credentials.");
        }

        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request?.Password ?? string.Empty, user.PasswordHash);
        if (!isPasswordValid)
        {
            _logger.LogWarning("Failed login attempt for user due to invalid password: {Username}", request?.Username);
            return Unauthorized("Invalid credentials.");
        }

        return Ok(await IssueSessionAsync(user));
    }

    /// <summary>
    /// 以刷新憑證換發新的存取權杖(S7)。
    /// 輸入:body { refreshToken };
    /// 輸出:200 + LoginResponse(新的存取權杖與**新的**刷新憑證),失敗一律 401;
    /// 邏輯:雜湊查找 → 檢查未作廢、未到期、使用者仍啟用 → 作廢舊憑證 → 發新的一組(輪替)。
    ///
    /// 解決 E2:存取權杖 2 小時到期後,前端在 401 當下換發並重送原請求,
    /// 現場未存檔的表單資料不會因為到期而消失。
    ///
    /// **重用偵測**:一張已作廢的憑證再度出現,代表它被複製過(正常客戶端不會重送已換過的憑證),
    /// 此時把該使用者所有未作廢的憑證一併作廢,逼真正的持有者重新登入。
    /// 失敗訊息一律相同,不區分「不存在」「已作廢」「已到期」。
    /// </summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResponse>> Refresh([FromBody] RefreshRequest request)
    {
        var presented = request?.RefreshToken;
        if (string.IsNullOrWhiteSpace(presented))
            return Unauthorized("Invalid refresh token.");

        var hash = SecureTokens.Hash(presented);

        var stored = await _context.RefreshTokens
            .Include(r => r.User)
            .ThenInclude(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(r => r.TokenHash == hash);

        if (stored == null)
        {
            _logger.LogWarning("刷新憑證比對失敗,來源 IP:{Ip}", RemoteIp());
            return Unauthorized("Invalid refresh token.");
        }

        // 重用偵測:已作廢的憑證再度出現 → 視同外洩,作廢該使用者全部憑證
        if (stored.RevokedAt != null)
        {
            _logger.LogWarning("偵測到已作廢的刷新憑證被重用(使用者 {UserId}),作廢其全部憑證,來源 IP:{Ip}",
                stored.UserId, RemoteIp());
            await RevokeAllTokensAsync(stored.UserId);
            return Unauthorized("Invalid refresh token.");
        }

        if (stored.ExpiresAt <= DateTime.UtcNow)
            return Unauthorized("Invalid refresh token.");

        if (stored.User == null || !stored.User.IsActive)
        {
            // 帳號在憑證有效期內被停用 —— 停用必須立刻擋住換發,否則停用要等一個班才生效
            await RevokeAllTokensAsync(stored.UserId);
            return Unauthorized("Invalid refresh token.");
        }

        // 輪替:舊的先作廢再發新的,同一次 SaveChanges 落地
        stored.RevokedAt = DateTime.UtcNow;

        return Ok(await IssueSessionAsync(stored.User));
    }

    /// <summary>
    /// 登出(S7)。
    /// 輸入:body { refreshToken }(可為空);輸出:一律 204;
    /// 邏輯:作廢該張刷新憑證。刻意匿名且一律回 204 ——
    ///       存取權杖已過期的客戶端也必須登得出去,而回應內容不得洩漏憑證是否存在。
    ///       存取權杖本身無法撤銷(JWT 無狀態),最長仍有 2 小時殘命,這是刻意的取捨。
    /// </summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest? request)
    {
        var presented = request?.RefreshToken;
        if (string.IsNullOrWhiteSpace(presented))
            return NoContent();

        var hash = SecureTokens.Hash(presented);
        var stored = await _context.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hash);

        if (stored is { RevokedAt: null })
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return NoContent();
    }

    /// <summary>
    /// 簽發一組完整的連線階段(存取權杖 + 刷新憑證)。
    /// 輸入:已通過驗證的使用者(UserRoles 需已載入);
    /// 輸出:LoginResponse,其中 RefreshToken 是**明文,只在此刻出現一次**;
    /// 邏輯:角色大寫正規化 → 簽 2 小時存取權杖 → 產生刷新憑證(只存雜湊)
    ///       → 順手清掉此人已過期的憑證列 → 一次 SaveChanges 落地。
    /// 登入與刷新共用此方法,兩條路徑的權杖內容因此不可能漂移。
    /// </summary>
    private async Task<LoginResponse> IssueSessionAsync(Core.Entities.Auth.User user)
    {
        // 角色大寫正規化(保險一):資料庫殘留 "Admin" 也會發出 "ADMIN"
        var roles = user.UserRoles.Select(ur => AppRoles.Normalize(ur.Role.Name)).ToArray();
        var expiresAt = DateTime.UtcNow.AddHours(2);
        var token = GenerateJwtToken(user.Id.ToString(), user.Username, user.DisplayName, roles, expiresAt);

        var refreshHours = _config.GetValue<double?>("Auth:RefreshTokenHours") ?? 12;
        if (refreshHours <= 0) refreshHours = 12;

        var refreshPlain = SecureTokens.NewSecret();
        var refreshExpiresAt = DateTime.UtcNow.AddHours(refreshHours);

        _context.RefreshTokens.Add(new Core.Entities.Auth.RefreshToken
        {
            UserId = user.Id,
            TokenHash = SecureTokens.Hash(refreshPlain),
            ExpiresAt = refreshExpiresAt,
            CreatedByIp = RemoteIp()
        });

        // 清掉此人早已過期的憑證列,避免資料表無限增長(作廢但未過期的仍留著供重用偵測)
        var stale = await _context.RefreshTokens
            .Where(r => r.UserId == user.Id && r.ExpiresAt <= DateTime.UtcNow)
            .ToListAsync();
        if (stale.Count > 0) _context.RefreshTokens.RemoveRange(stale);

        await _context.SaveChangesAsync();

        return new LoginResponse(
            token, user.Username, roles, user.DisplayName ?? user.Username, expiresAt,
            refreshPlain, refreshExpiresAt);
    }

    /// <summary>
    /// 作廢某使用者所有仍有效的刷新憑證。
    /// 輸入:使用者 Id;輸出:無;
    /// 邏輯:供重用偵測與「帳號被停用」兩條路徑使用 —— 兩者都必須讓現有連線階段立即失效。
    /// </summary>
    private async Task RevokeAllTokensAsync(Guid userId)
    {
        var active = await _context.RefreshTokens
            .Where(r => r.UserId == userId && r.RevokedAt == null)
            .ToListAsync();

        foreach (var t in active) t.RevokedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// 初始化第一個管理者帳號(空資料庫專用)。
    /// 輸入:body SetupAdminRequest;輸出:200 + { username, roles },不回傳權杖;
    /// 邏輯:設定權杖比對(定時比較)→ Users 表必須為空 → 帳號 / 密碼格式檢查 → 建立四個角色列與 ADMIN 使用者。
    ///
    /// 檢查順序不可調換:SetupToken 必須先於「Users 表是否為空」,
    /// 否則此端點會變成免驗證的「資料庫有沒有使用者」探測器。
    /// </summary>
    [HttpPost("setup-admin")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> SetupAdmin([FromBody] SetupAdminRequest request)
    {
        var configuredToken = _config["Auth:SetupToken"];

        // 未設定設定權杖 = 端點視同不存在,連存在性都不洩漏
        if (string.IsNullOrWhiteSpace(configuredToken))
            return NotFound();

        if (!FixedTimeStringEquals(configuredToken, request?.SetupToken))
        {
            _logger.LogWarning("setup-admin 以錯誤的設定權杖被呼叫,來源 IP:{Ip}", RemoteIp());
            return Unauthorized("Invalid setup token.");
        }

        if (await _context.Users.AnyAsync())
            return Conflict("Users already exist. Setup can only run on empty database.");

        var username = (request!.Username ?? string.Empty).Trim();
        if (username.Length is 0 or > 50)
            return BadRequest("Username is required and must be 1~50 characters.");

        var displayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim();
        if (displayName is { Length: > 50 })
            return BadRequest("DisplayName must be 50 characters or fewer.");

        var passwordError = ValidatePassword(request.Password);
        if (passwordError != null)
            return BadRequest(passwordError);

        // 至此才開始寫入,前面任何一項失敗都不會留下半套資料
        var roleEntities = await EnsureRolesAsync();

        var adminUser = new Core.Entities.Auth.User
        {
            Username = username,
            DisplayName = displayName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsActive = true
        };
        _context.Users.Add(adminUser);
        _context.UserRoles.Add(new Core.Entities.Auth.UserRole
        {
            User = adminUser,
            Role = roleEntities[AppRoles.Admin]
        });

        // 併發競態的最後一道防線(同 CreateUser):唯一鍵衝突回 409,不讓 500 外洩堆疊。
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "初始管理者建立時撞到唯一鍵:{Username}", username);
            return Conflict($"Username '{username}' already exists.");
        }

        // 稽核紀錄:記帳號與來源 IP,絕不記密碼
        _logger.LogWarning("初始管理者已建立:{Username},來源 IP:{Ip}", username, RemoteIp());

        return Ok(new { username, roles = new[] { AppRoles.Admin } });
    }

    /// <summary>
    /// 取得使用者清單(ADMIN 專用)。
    /// 輸入:無;輸出:200 + UserSummary 陣列(不含密碼雜湊);
    /// 邏輯:載入 UserRoles 後投影為摘要,角色大寫正規化。
    /// </summary>
    [HttpGet("users")]
    [Authorize(Policy = AppRoles.Policies.UserAdmin)]
    public async Task<ActionResult<IEnumerable<UserSummary>>> GetUsers()
    {
        var users = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .OrderBy(u => u.Username)
            .ToListAsync();

        var result = users.Select(u => new UserSummary(
            u.Id,
            u.Username,
            u.DisplayName,
            u.Shift,
            u.UserRoles.Select(ur => AppRoles.Normalize(ur.Role.Name)).ToArray(),
            u.IsActive,
            u.CreatedAt));

        return Ok(result);
    }

    /// <summary>
    /// 建立使用者(ADMIN 專用)。
    /// 輸入:body CreateUserRequest;輸出:201 + UserSummary;
    /// 邏輯:帳號長度與不分大小寫唯一性檢查 → 角色合法性 → 密碼強度 → BCrypt 雜湊寫入。
    /// </summary>
    [HttpPost("users")]
    [Authorize(Policy = AppRoles.Policies.UserAdmin)]
    public async Task<ActionResult<UserSummary>> CreateUser([FromBody] CreateUserRequest request)
    {
        var username = (request?.Username ?? string.Empty).Trim();
        if (username.Length is 0 or > 50)
            return BadRequest("Username is required and must be 1~50 characters.");

        var role = AppRoles.Normalize(request!.Role);
        if (!AppRoles.IsValid(role))
            return BadRequest($"Role must be one of: {string.Join(", ", AppRoles.All)}.");

        var displayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim();
        if (displayName is { Length: > 50 })
            return BadRequest("DisplayName must be 50 characters or fewer.");

        var shift = string.IsNullOrWhiteSpace(request.Shift) ? null : request.Shift.Trim();
        if (shift is { Length: > 10 })
            return BadRequest("Shift must be 10 characters or fewer.");

        var passwordError = ValidatePassword(request.Password);
        if (passwordError != null)
            return BadRequest(passwordError);

        // S6:不分大小寫唯一 —— 直接查 UsernameNormalized,與 DB 唯一索引同一個判準,
        // 且不再把全表帳號載入記憶體。
        var normalized = AppUsernames.Normalize(username);
        if (await _context.Users.AnyAsync(u => u.UsernameNormalized == normalized))
            return Conflict($"Username '{username}' already exists.");

        var roleEntities = await EnsureRolesAsync();

        var user = new Core.Entities.Auth.User
        {
            Username = username,
            DisplayName = displayName,
            Shift = shift,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsActive = true
        };
        _context.Users.Add(user);
        _context.UserRoles.Add(new Core.Entities.Auth.UserRole { User = user, Role = roleEntities[role] });

        // 併發競態的最後一道防線:兩個請求同時建立 OP1 / op1 時,
        // DB 的 IX_Users_UsernameNormalized 會擋下其中一筆,轉為 409 而非 500。
        // 誠實標註:InMemory 供應者不強制唯一索引,此分支無法以自動化測試證明,
        // 由 AC-53(模型層索引存在)加上程式碼審查把關。
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "建立使用者時撞到唯一鍵:{Username}", username);
            return Conflict($"Username '{username}' already exists.");
        }

        _logger.LogInformation("使用者已建立:{Username}(角色 {Role}),由 {Actor} 操作", username, role, User.Identity?.Name);

        var summary = new UserSummary(user.Id, user.Username, user.DisplayName, user.Shift,
            new[] { role }, user.IsActive, user.CreatedAt);

        return CreatedAtAction(nameof(GetUsers), new { id = user.Id }, summary);
    }

    /// <summary>
    /// 更新使用者(ADMIN 專用)。
    /// 輸入:路由 id + body UpdateUserRequest(全部欄位選填);輸出:204;
    /// 邏輯:逐欄位套用有給值者;變更角色或停用前檢查「不得移除最後一位啟用中的 ADMIN」。
    /// </summary>
    [HttpPut("users/{id}")]
    [Authorize(Policy = AppRoles.Policies.UserAdmin)]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return NotFound();

        string? newRole = null;
        if (!string.IsNullOrWhiteSpace(request?.Role))
        {
            newRole = AppRoles.Normalize(request.Role);
            if (!AppRoles.IsValid(newRole))
                return BadRequest($"Role must be one of: {string.Join(", ", AppRoles.All)}.");
        }

        if (!string.IsNullOrEmpty(request?.Password))
        {
            var passwordError = ValidatePassword(request.Password);
            if (passwordError != null) return BadRequest(passwordError);
        }

        if (request?.DisplayName is { Length: > 50 }) return BadRequest("DisplayName must be 50 characters or fewer.");
        if (request?.Shift is { Length: > 10 }) return BadRequest("Shift must be 10 characters or fewer.");

        // 安全約束:不得把最後一位啟用中的 ADMIN 停用或降級,否則系統將無管理者可用
        var isAdmin = user.UserRoles.Any(ur => AppRoles.Normalize(ur.Role.Name) == AppRoles.Admin);
        var willLoseAdmin = (request?.IsActive == false) || (newRole != null && newRole != AppRoles.Admin);
        if (isAdmin && user.IsActive && willLoseAdmin && await CountActiveAdminsAsync() <= 1)
            return Conflict("Cannot disable or demote the last active ADMIN.");

        if (request?.DisplayName != null)
            user.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim();
        if (request?.Shift != null)
            user.Shift = string.IsNullOrWhiteSpace(request.Shift) ? null : request.Shift.Trim();
        if (!string.IsNullOrEmpty(request?.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        if (request?.IsActive != null)
            user.IsActive = request.IsActive.Value;

        // S7:停用帳號時一併作廢其刷新憑證。Refresh 端點本來就會擋下停用中的帳號,
        // 這裡是提前收乾淨,讓「已停用」在資料上就看不到有效憑證。
        if (request?.IsActive == false)
        {
            foreach (var rt in await _context.RefreshTokens
                         .Where(r => r.UserId == user.Id && r.RevokedAt == null)
                         .ToListAsync())
            {
                rt.RevokedAt = DateTime.UtcNow;
            }
        }

        if (newRole != null)
        {
            var roleEntities = await EnsureRolesAsync();
            _context.UserRoles.RemoveRange(user.UserRoles);
            _context.UserRoles.Add(new Core.Entities.Auth.UserRole { User = user, Role = roleEntities[newRole] });
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// 計算目前啟用中且具 ADMIN 角色的使用者數。
    /// 輸入:無;輸出:人數;邏輯:載入後於記憶體內以正規化角色比對(相容 InMemory 供應者)。
    /// </summary>
    private async Task<int> CountActiveAdminsAsync()
    {
        var users = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Where(u => u.IsActive)
            .ToListAsync();

        return users.Count(u => u.UserRoles.Any(ur => AppRoles.Normalize(ur.Role.Name) == AppRoles.Admin));
    }

    /// <summary>
    /// 確保四個正式角色列都存在,並回傳「大寫角色名 → Role 實體」對照表。
    /// 輸入:無;輸出:對照表;
    /// 邏輯:先以正規化名稱比對既有列(相容舊資料 "Admin"),缺少者才新增。
    /// 呼叫端 SaveChangesAsync 前新列僅在追蹤狀態,失敗不會留下半套資料。
    /// </summary>
    private async Task<Dictionary<string, Core.Entities.Auth.Role>> EnsureRolesAsync()
    {
        var existing = await _context.Roles.ToListAsync();
        var map = new Dictionary<string, Core.Entities.Auth.Role>();

        foreach (var name in AppRoles.All)
        {
            var found = existing.FirstOrDefault(r => AppRoles.Normalize(r.Name) == name);
            if (found == null)
            {
                found = new Core.Entities.Auth.Role { Name = name };
                _context.Roles.Add(found);
            }
            map[name] = found;
        }

        return map;
    }

    /// <summary>
    /// 密碼強度檢查。
    /// 輸入:密碼字串;輸出:不合格時回傳中文原因字串,合格回 null;
    /// 邏輯:長度須 >= Auth:MinPasswordLength(預設 12),且至少含一個字母與一個數字。
    /// </summary>
    private string? ValidatePassword(string? password)
    {
        var minLength = _config.GetValue<int?>("Auth:MinPasswordLength") ?? 12;
        if (string.IsNullOrEmpty(password) || password.Length < minLength)
            return $"Password must be at least {minLength} characters long.";
        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
            return "Password must contain at least one letter and one digit.";
        return null;
    }

    /// <summary>
    /// 定時字串比較,避免以回應時間推測設定權杖內容(時序側通道)。
    /// 輸入:期望值與實際值;輸出:是否相同;
    /// 邏輯:兩者皆轉 UTF-8 位元組,長度不同直接回 false(長度本身非機密),否則走 FixedTimeEquals。
    /// </summary>
    private static bool FixedTimeStringEquals(string expected, string? actual)
    {
        if (actual == null) return false;
        var a = Encoding.UTF8.GetBytes(expected);
        var b = Encoding.UTF8.GetBytes(actual);
        if (a.Length != b.Length) return false;
        return CryptographicOperations.FixedTimeEquals(a, b);
    }

    /// <summary>取得請求來源位址字串(供稽核紀錄使用),取不到時回 "unknown"。</summary>
    private string RemoteIp() => HttpContext?.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    /// <summary>
    /// 簽發 JWT。
    /// 輸入:使用者 GUID、帳號、顯示名稱、大寫角色陣列、到期時間;
    /// 輸出:序列化後的權杖字串;
    /// 邏輯:寫入 sub / unique_name / jti / displayName 與每個角色一筆 Role claim,以 HMAC-SHA256 簽章。
    /// </summary>
    private string GenerateJwtToken(string userId, string username, string? displayName, string[] roles, DateTime expiresAt)
    {
        var secret = _config["Jwt:Secret"] ?? throw new InvalidOperationException("JWT Secret is not configured.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.UniqueName, username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("displayName", displayName ?? username)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expiresAt, // 2 小時效期,由呼叫端算好傳入
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
