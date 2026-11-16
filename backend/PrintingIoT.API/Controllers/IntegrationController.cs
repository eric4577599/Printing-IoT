using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.API.Controllers;

/// <summary>
/// IntegrationController — 與 MM 保養外掛的整合契約 v1(<c>docs/spec20261116-1.md</c>,設計說明書 §14)。
///
/// 全部**唯讀**,只認 X-Api-Key 且角色為 MM_SERVICE(MmRead policy);
/// 金鑰因此打不開 ERP 推單與其他端點,ERP 金鑰也打不開這裡。
/// 401 / 403 由驗證層回應(無本文);其餘錯誤一律 <c>{"error":{"code","message"}}</c>。
/// </summary>
[ApiController]
[Route("api/v1/integration")]
[Authorize(Policy = AppRoles.Policies.MmRead)]
public class IntegrationController : ControllerBase
{
    private const int DefaultLimit = 500;
    private const int MaxLimit = 1000;

    private readonly PrintingContext _context;
    private readonly IConfiguration _config;

    public IntegrationController(PrintingContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    /// <summary>契約錯誤本文。輸入:HTTP 狀態、錯誤碼、訊息;輸出:帶契約版本標頭的結果。</summary>
    private ObjectResult Error(int status, string code, string message)
    {
        Response.Headers["X-Contract-Version"] = "1";
        return StatusCode(status, new { error = new { code, message } });
    }

    private OkObjectResult Ok1(object body)
    {
        Response.Headers["X-Contract-Version"] = "1";
        return Ok(body);
    }

    /// <summary>健康檢查。輸出:200 {status, apiVersion, serverTimeUtc}。MM 用來判斷是否降級。</summary>
    [HttpGet("health")]
    [EnableRateLimiting("mm-data")]
    public IActionResult Health() =>
        Ok1(new { status = "ok", apiVersion = "1", serverTimeUtc = DateTime.UtcNow });

    /// <summary>
    /// 以使用者 id 查詢目前狀態(MM 每個請求重驗用)。
    /// 輸出:固定 200;不存在或已停用一律 {active:false}(不區分兩者,避免探測帳號)。
    /// </summary>
    [HttpGet("users/{userId}")]
    [EnableRateLimiting("mm-identity")]
    public async Task<IActionResult> GetUser(string userId)
    {
        if (!Guid.TryParse(userId, out var id)) return Ok1(new { active = false });
        return Ok1(await LoadUserInfoAsync(id));
    }

    /// <summary>
    /// 驗證本系統 JWT(給其他用途)。輸入:{token};
    /// 輸出:有效且使用者仍啟用 → 使用者資訊 + expiresAtUtc;其餘只回 {active:false}。
    /// </summary>
    [HttpPost("introspect")]
    [EnableRateLimiting("mm-identity")]
    public async Task<IActionResult> Introspect([FromBody] IntrospectRequest? request)
    {
        if (string.IsNullOrWhiteSpace(request?.Token)) return Error(400, "invalid_request", "token is required.");

        var secret = _config["Jwt:Secret"];
        if (string.IsNullOrEmpty(secret)) return Error(503, "service_unavailable", "Token validation unavailable.");

        try
        {
            var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
            var principal = handler.ValidateToken(request.Token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _config["Jwt:Issuer"],
                ValidAudience = _config["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                ClockSkew = TimeSpan.Zero
            }, out var validated);

            var sub = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (!Guid.TryParse(sub, out var id)) return Ok1(new { active = false });

            var info = await LoadUserInfoAsync(id);
            if (!info.Active) return Ok1(new { active = false });
            return Ok1(new
            {
                active = true, userId = info.UserId, username = info.Username,
                displayName = info.DisplayName, roles = info.Roles,
                expiresAtUtc = validated.ValidTo
            });
        }
        catch (Exception ex) when (ex is SecurityTokenException or ArgumentException)
        {
            return Ok1(new { active = false });
        }
    }

    /// <summary>
    /// 兌換登入代碼(換票):代碼單次有效、原子刪除、綁 audience=mm。
    /// 輸出:使用者資訊(不含本系統權杖);代碼無效 / 過期 / 已用過 → 400 invalid_request。
    /// </summary>
    [HttpPost("login-codes/exchange")]
    [EnableRateLimiting("mm-identity")]
    public async Task<IActionResult> ExchangeLoginCode(
        [FromBody] ExchangeRequest? request, [FromServices] ILoginCodeStore store)
    {
        if (string.IsNullOrWhiteSpace(request?.Code)) return Error(400, "invalid_request", "code is required.");

        string? payload;
        try
        {
            // Take 是原子的:同一代碼同時兌換兩次,只有一次拿得到值
            payload = await store.TakeAsync(request.Code);
        }
        catch (Exception ex) when (ex is StackExchange.Redis.RedisException or TimeoutException)
        {
            return Error(503, "service_unavailable", "Code store unavailable.");
        }

        if (!LoginCodes.TryParse(payload, out var userId, out var audience) || audience != LoginCodes.Audience)
            return Error(400, "invalid_request", "Invalid or expired code.");

        var info = await LoadUserInfoAsync(userId);
        if (!info.Active) return Error(400, "invalid_request", "Invalid or expired code.");
        return Ok1(info);
    }

    /// <summary>設備清單(由歷史紀錄彙整)。輸出:[{deviceId, lastSeenUtc}],供 MM 下拉對照。</summary>
    [HttpGet("devices")]
    [EnableRateLimiting("mm-data")]
    public async Task<IActionResult> Devices()
    {
        var rows = await _context.ProductionLogs
            .GroupBy(l => l.DeviceId)
            .Select(g => new { deviceId = g.Key, lastSeenUtc = g.Max(l => l.Timestamp) })
            .OrderBy(x => x.deviceId)
            .ToListAsync();
        return Ok1(rows);
    }

    /// <summary>
    /// 計數游標查詢。輸入:deviceId(不分大小寫、忽略前後空白)、sinceId(排除)、sinceUtc、limit;
    /// 輸出:items(id、timestampUtc、count、status、resetBefore)、nextSinceId、hasMore;
    /// 邏輯:sinceId 與 sinceUtc 都省略 → 只回最新一筆當基準;sinceId 大於目前最大 id → 410;
    ///       完全沒出現過的 deviceId → 404;resetBefore = 新值小於前一筆(含批次前一筆)。
    /// </summary>
    [HttpGet("devices/{deviceId}/counter")]
    [EnableRateLimiting("mm-data")]
    public async Task<IActionResult> Counter(string deviceId, [FromQuery] long? sinceId, [FromQuery] DateTime? sinceUtc, [FromQuery] int? limit)
    {
        var scan = await ScanAsync(deviceId, sinceId, sinceUtc, limit);
        if (scan.Failure != null) return scan.Failure;

        var items = new List<object>();
        decimal? prev = scan.PreviousCount;
        foreach (var l in scan.Rows)
        {
            items.Add(new
            {
                id = l.Id,
                timestampUtc = DateTime.SpecifyKind(l.Timestamp, DateTimeKind.Utc),
                count = (long)Math.Truncate(l.TotalLength),
                status = l.Status.ToString(),
                resetBefore = prev.HasValue && l.TotalLength < prev.Value
            });
            prev = l.TotalLength;
        }
        return Ok1(new { deviceId = scan.DeviceId, items, nextSinceId = scan.NextSinceId, hasMore = scan.HasMore });
    }

    /// <summary>
    /// 狀態轉換事件。輸入同 counter;輸出:只含「狀態與前一筆不同」的紀錄,
    /// 第一筆 previousStatus 可為 null。故障起訖 = status=Error 的轉入與轉出(精度為取樣間隔,無故障碼)。
    /// limit 計的是掃描的歷史紀錄筆數(轉換筆數可能少於 limit)。
    /// </summary>
    [HttpGet("devices/{deviceId}/status-events")]
    [EnableRateLimiting("mm-data")]
    public async Task<IActionResult> StatusEvents(string deviceId, [FromQuery] long? sinceId, [FromQuery] DateTime? sinceUtc, [FromQuery] int? limit)
    {
        var scan = await ScanAsync(deviceId, sinceId, sinceUtc, limit);
        if (scan.Failure != null) return scan.Failure;

        var items = new List<object>();
        MachineStatus? prev = scan.PreviousStatus;
        var first = true;
        foreach (var l in scan.Rows)
        {
            // 首次連線(無前一筆)的基準那一筆也要回,previousStatus 為 null
            if (first && !prev.HasValue || prev.HasValue && l.Status != prev.Value)
            {
                items.Add(new
                {
                    id = l.Id,
                    timestampUtc = DateTime.SpecifyKind(l.Timestamp, DateTimeKind.Utc),
                    status = l.Status.ToString(),
                    previousStatus = prev?.ToString()
                });
            }
            first = false;
            prev = l.Status;
        }
        return Ok1(new { deviceId = scan.DeviceId, items, nextSinceId = scan.NextSinceId, hasMore = scan.HasMore });
    }

    // ───────────── 共用 ─────────────

    private sealed record Scan(
        string DeviceId, List<Core.Entities.ProductionLog> Rows, decimal? PreviousCount,
        MachineStatus? PreviousStatus, long NextSinceId, bool HasMore, IActionResult? Failure);

    /// <summary>
    /// 依游標掃描單一設備的歷史紀錄(counter 與 status-events 共用)。
    /// 邏輯:正規化 deviceId → 找出資料庫內實際大小寫(沒有 → 404)→ 檢查 410 →
    ///       無游標且無 sinceUtc 時取最新一筆為基準 → 否則取游標之後 limit+1 筆判斷 hasMore →
    ///       另取游標前一筆,供 resetBefore / previousStatus 判斷。
    /// </summary>
    private async Task<Scan> ScanAsync(string deviceId, long? sinceId, DateTime? sinceUtc, int? limit)
    {
        var norm = (deviceId ?? string.Empty).Trim();
        var lower = norm.ToLowerInvariant();
        var actual = await _context.ProductionLogs
            .Where(l => l.DeviceId.ToLower() == lower)
            .Select(l => l.DeviceId).FirstOrDefaultAsync();
        if (actual == null)
            return new Scan(norm, new(), null, null, sinceId ?? 0, false, Error(404, "not_found", "Unknown deviceId."));

        var take = Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);
        var device = _context.ProductionLogs.Where(l => l.DeviceId == actual);

        if (sinceId.HasValue && sinceId.Value > await _context.ProductionLogs.MaxAsync(l => l.Id))
            return new Scan(actual, new(), null, null, sinceId.Value, false, Error(410, "cursor_expired", "sinceId is beyond the latest record; re-baseline."));

        List<Core.Entities.ProductionLog> rows;
        bool hasMore = false;
        if (!sinceId.HasValue && !sinceUtc.HasValue)
        {
            var latest = await device.OrderByDescending(l => l.Id).FirstAsync();
            rows = new() { latest };
        }
        else
        {
            var q = sinceId.HasValue ? device.Where(l => l.Id > sinceId.Value) : device.Where(l => l.Timestamp > sinceUtc!.Value.ToUniversalTime());
            rows = await q.OrderBy(l => l.Id).Take(take + 1).ToListAsync();
            if (rows.Count > take) { hasMore = true; rows.RemoveAt(rows.Count - 1); }
        }

        decimal? prevCount = null; MachineStatus? prevStatus = null;
        if (rows.Count > 0 && (sinceId.HasValue || sinceUtc.HasValue))
        {
            var firstId = rows[0].Id;
            var before = await device.Where(l => l.Id < firstId).OrderByDescending(l => l.Id).FirstOrDefaultAsync();
            prevCount = before?.TotalLength; prevStatus = before?.Status;
        }

        var next = rows.Count > 0 ? rows[^1].Id : (sinceId ?? 0);
        return new Scan(actual, rows, prevCount, prevStatus, next, hasMore, null);
    }

    /// <summary>
    /// 讀使用者狀態。輸出:啟用中 → 完整資訊;不存在或已停用 → Active=false 且其餘欄位空白
    /// (序列化時 users / exchange 只輸出 {active:false} 的固定形狀,不洩漏原因)。
    /// </summary>
    private async Task<UserInfoDto> LoadUserInfoAsync(Guid id)
    {
        var u = await _context.Users
            .Include(x => x.UserRoles).ThenInclude(r => r.Role)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (u == null || !u.IsActive) return UserInfoDto.Inactive;
        var roles = u.UserRoles.Select(r => AppRoles.Normalize(r.Role.Name)).Where(r => r.Length > 0).Distinct().ToArray();
        return new UserInfoDto(true, u.Id.ToString(), u.Username, u.DisplayName ?? u.Username, roles);
    }

    public sealed record IntrospectRequest(string? Token);
    public sealed record ExchangeRequest(string? Code);
}

/// <summary>使用者資訊對外形狀。Inactive 時序列化為只有 active:false。</summary>
public sealed record UserInfoDto(
    [property: System.Text.Json.Serialization.JsonPropertyName("active")] bool Active,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] string? UserId,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] string? Username,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] string? DisplayName,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] string[]? Roles)
{
    public static UserInfoDto Inactive { get; } = new(false, null, null, null, null);
}

/// <summary>登入代碼的 Redis 儲存規則(簽發與兌換共用)。</summary>
public static class LoginCodes
{
    public const string Audience = "mm";
    public const int TtlSeconds = 60;

    /// <summary>Redis 鍵:只存代碼的 SHA-256,Redis 外洩也拿不到可兌換的代碼。</summary>
    public static string Key(string code) =>
        "integration/login-code/" + Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(code)));

    public static string Pack(Guid userId, string audience) => $"{userId:N}|{audience}";

    public static bool TryParse(string? payload, out Guid userId, out string audience)
    {
        userId = Guid.Empty; audience = string.Empty;
        if (string.IsNullOrEmpty(payload)) return false;
        var parts = payload.Split('|');
        if (parts.Length != 2 || !Guid.TryParseExact(parts[0], "N", out userId)) return false;
        audience = parts[1];
        return true;
    }
}

/// <summary>登入代碼儲存(Redis 實作;測試以記憶體實作替換)。</summary>
public interface ILoginCodeStore
{
    /// <summary>存入代碼對應的內容,ttl 後自動消失。</summary>
    Task SaveAsync(string code, string payload, TimeSpan ttl);

    /// <summary>取出並刪除(原子)。代碼不存在、過期或已被取走 → null。</summary>
    Task<string?> TakeAsync(string code);
}

public sealed class RedisLoginCodeStore : ILoginCodeStore
{
    private readonly StackExchange.Redis.IConnectionMultiplexer _redis;
    public RedisLoginCodeStore(StackExchange.Redis.IConnectionMultiplexer redis) => _redis = redis;

    public Task SaveAsync(string code, string payload, TimeSpan ttl) =>
        _redis.GetDatabase().StringSetAsync(LoginCodes.Key(code), payload, ttl);

    public async Task<string?> TakeAsync(string code)
    {
        var v = await _redis.GetDatabase().StringGetDeleteAsync(LoginCodes.Key(code));
        return v.IsNullOrEmpty ? null : v.ToString();
    }
}
