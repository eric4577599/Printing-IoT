using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using PrintingIoT.Core.Constants;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// 測試用 JWT 簽發工廠(S5)。
///
/// 以 appsettings.Testing.json 的密鑰與 appsettings.json 的 issuer / audience 現簽權杖,
/// 讓整合測試在「預設拒絕」的授權模式下仍能呼叫受保護端點。
/// System.IdentityModel.Tokens.Jwt 透過 API 專案的參考取得,不需新增套件。
/// </summary>
public static class TestAuthTokenFactory
{
    /// <summary>appsettings.Testing.json 內的測試密鑰(測試專用,非正式環境憑證)。</summary>
    public const string TestingSecret = "TestingSecretKeyAtLeast32CharactersLong!";

    /// <summary>appsettings.json 的簽發者。</summary>
    public const string Issuer = "PrintingIoT";

    /// <summary>appsettings.json 的接收者。</summary>
    public const string Audience = "PrintingIoTClient";

    /// <summary>
    /// 簽發一個測試權杖。
    /// 輸入:角色清單(不給則為 ADMIN);
    /// 輸出:序列化後的 JWT 字串;
    /// 邏輯:以正確的密鑰 / issuer / audience 與 2 小時效期簽發,角色寫入 ClaimTypes.Role。
    /// </summary>
    public static string Create(params string[] roles) =>
        Create(roles.Length == 0 ? new[] { AppRoles.Admin } : roles, TestingSecret, Issuer, Audience, DateTime.UtcNow.AddHours(2));

    /// <summary>
    /// 簽發一個可完全客製的測試權杖(供負面案例使用)。
    /// 輸入:角色清單、簽章密鑰、issuer、audience、到期時間;
    /// 輸出:JWT 字串;
    /// 邏輯:任一參數與 API 設定不符時,API 端驗證就會失敗並回 401 —— 這正是 AC-03~AC-05 的驗證手段。
    /// </summary>
    public static string Create(string[] roles, string secret, string issuer, string audience, DateTime expiresAt)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, "test-user"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("displayName", "Test User")
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: expiresAt.AddHours(-2),
            expires: expiresAt,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// 產生可直接指派給 HttpClient.DefaultRequestHeaders.Authorization 的標頭值。
    /// 輸入:角色清單(不給則為 ADMIN);輸出:Bearer 標頭。
    /// </summary>
    public static AuthenticationHeaderValue Header(params string[] roles) =>
        new AuthenticationHeaderValue("Bearer", Create(roles));
}
