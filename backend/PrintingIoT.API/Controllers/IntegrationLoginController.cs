using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using StackExchange.Redis;

namespace PrintingIoT.API.Controllers;

/// <summary>
/// IntegrationLoginController — 整合契約 v1 的「簽發登入代碼」端點。
///
/// 與 <see cref="IntegrationController"/> 分開:這支由**已登入的使用者(JWT)**呼叫,
/// 不是機器金鑰。使用者在本系統登入後,取得一次性短效代碼帶去 MM,
/// MM 後端再以機器金鑰兌換使用者資訊 —— 網址上永遠不放權杖。
/// </summary>
[ApiController]
[Route("api/v1/integration")]
[Authorize(AuthenticationSchemes = "Bearer")]
public class IntegrationLoginController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILoginCodeStore _store;

    public IntegrationLoginController(IConfiguration config, ILoginCodeStore store)
    {
        _config = config;
        _store = store;
    }

    public sealed record LoginCodeRequest(string? Audience);

    /// <summary>
    /// 簽發登入代碼。
    /// 輸入:body {audience:"mm"}(其他值 → 400);
    /// 輸出:200 {code, expiresInSeconds:60, redirectUrl};
    /// 邏輯:MM 入口網址未設定 → 503(整合未啟用);產生 32 位元組隨機代碼 →
    ///       Redis 只存其雜湊、60 秒到期、綁定使用者與 audience →
    ///       redirectUrl = 入口網址 + <c>#code=…</c>(網址片段不進 access log 與 Referer)。
    /// </summary>
    [HttpPost("login-codes")]
    public async Task<IActionResult> Issue([FromBody] LoginCodeRequest? request)
    {
        Response.Headers["X-Contract-Version"] = "1";

        if (!string.Equals(request?.Audience, LoginCodes.Audience, StringComparison.Ordinal))
            return BadRequest(new { error = new { code = "invalid_request", message = "audience must be \"mm\"." } });

        var entry = _config["Integration:Mm:EntryUrl"]?.Trim();
        if (string.IsNullOrEmpty(entry) || !Uri.TryCreate(entry, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return StatusCode(503, new { error = new { code = "service_unavailable", message = "MM integration is not configured." } });

        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return Unauthorized();

        var code = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        try
        {
            await _store.SaveAsync(code, LoginCodes.Pack(userId, LoginCodes.Audience),
                TimeSpan.FromSeconds(LoginCodes.TtlSeconds));
        }
        catch (Exception ex) when (ex is RedisException or TimeoutException)
        {
            return StatusCode(503, new { error = new { code = "service_unavailable", message = "Code store unavailable." } });
        }

        var redirect = entry.TrimEnd('#').Split('#')[0] + "#code=" + code;
        return Ok(new { code, expiresInSeconds = LoginCodes.TtlSeconds, redirectUrl = redirect });
    }
}
