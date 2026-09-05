using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.Security;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.API.Authentication;

/// <summary>
/// ApiKeyAuthenticationHandler — 以 <c>X-Api-Key</c> 標頭驗證機器對機器身分(S7)。
///
/// 流程:讀標頭 → 解析前綴 → 以前綴撈出單一列 → SHA-256 定時比較 → 檢查啟用與到期
///       → 發出帶 Role claim 的 ClaimsPrincipal。
///
/// 三個刻意的設計:
/// - **沒有標頭時回 NoResult 而非 Fail**:此方案常與 Bearer 併用,回 Fail 會讓帶 JWT 的
///   請求也被這條路徑判死。
/// - **失敗一律回同一句訊息**:不區分「前綴不存在」「雜湊不符」「已撤銷」「已到期」,
///   避免把金鑰狀態當成探測管道,與登入端點不區分帳號 / 密碼錯誤同一個理由。
/// - **LastUsedAt 節流寫入**:每次請求都寫會讓推單端點多一次 UPDATE,
///   因此僅在距上次紀錄超過 <see cref="LastUsedWriteThrottle"/> 時才寫。
/// </summary>
public class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    /// <summary>LastUsedAt 的最小寫入間隔;此欄位用途是「金鑰是否還活著」,分鐘級精度足夠。</summary>
    private static readonly TimeSpan LastUsedWriteThrottle = TimeSpan.FromMinutes(1);

    private readonly PrintingContext _context;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        PrintingContext context)
        : base(options, logger, encoder)
    {
        _context = context;
    }

    /// <summary>
    /// 驗證請求所帶的 API 金鑰。
    /// 輸入:HTTP 請求(讀 X-Api-Key 標頭);
    /// 輸出:成功時為帶有 Role claim 的 AuthenticationTicket,無標頭時 NoResult,其餘 Fail;
    /// 邏輯:見類別註解。任何失敗路徑都不透露金鑰狀態。
    /// </summary>
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(ApiKeyAuthenticationDefaults.HeaderName, out var headerValues))
            return AuthenticateResult.NoResult();

        var presented = headerValues.ToString().Trim();
        if (string.IsNullOrEmpty(presented))
            return AuthenticateResult.NoResult();

        var prefix = ApiKeyGenerator.ExtractPrefix(presented);
        if (prefix == null)
        {
            Logger.LogWarning("API 金鑰驗證失敗:格式不符,來源 IP {Ip}", Context.Connection.RemoteIpAddress);
            return AuthenticateResult.Fail("Invalid API key.");
        }

        var record = await _context.ApiKeys.FirstOrDefaultAsync(k => k.Prefix == prefix);

        // 即使查無此列也要照算一次雜湊,讓「前綴不存在」與「雜湊不符」的耗時一致
        var computed = ApiKeyGenerator.ComputeHash(presented);
        if (record == null || !ApiKeyGenerator.HashEquals(record.KeyHash, computed))
        {
            Logger.LogWarning("API 金鑰驗證失敗:前綴 {Prefix} 比對不符,來源 IP {Ip}", prefix, Context.Connection.RemoteIpAddress);
            return AuthenticateResult.Fail("Invalid API key.");
        }

        if (!record.IsActive)
        {
            Logger.LogWarning("API 金鑰驗證失敗:前綴 {Prefix} 已撤銷", prefix);
            return AuthenticateResult.Fail("Invalid API key.");
        }

        var now = DateTime.UtcNow;
        if (record.ExpiresAt is { } expiresAt && expiresAt <= now)
        {
            Logger.LogWarning("API 金鑰驗證失敗:前綴 {Prefix} 已於 {ExpiresAt} 到期", prefix, expiresAt);
            return AuthenticateResult.Fail("Invalid API key.");
        }

        await TouchLastUsedAsync(record, now);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, record.Id.ToString()),
            new Claim(ClaimTypes.Name, record.Name),
            new Claim(ClaimTypes.Role, AppRoles.Normalize(record.Role)),
            new Claim("apiKeyPrefix", record.Prefix)
        };

        var identity = new ClaimsIdentity(claims, ApiKeyAuthenticationDefaults.Scheme);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, ApiKeyAuthenticationDefaults.Scheme);

        return AuthenticateResult.Success(ticket);
    }

    /// <summary>
    /// 節流更新最後使用時間。
    /// 輸入:已驗證通過的金鑰列、當下 UTC 時間;輸出:無;
    /// 邏輯:距上次紀錄未滿門檻就跳過;寫入失敗只記錄不拋出 ——
    ///       稽核欄位寫不進去不該讓一批已驗證通過的訂單推不進來。
    /// </summary>
    private async Task TouchLastUsedAsync(Core.Entities.Auth.ApiKey record, DateTime now)
    {
        if (record.LastUsedAt is { } last && now - last < LastUsedWriteThrottle)
            return;

        try
        {
            record.LastUsedAt = now;
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "更新 API 金鑰 {Prefix} 的最後使用時間失敗,不影響本次驗證", record.Prefix);
        }
    }
}
