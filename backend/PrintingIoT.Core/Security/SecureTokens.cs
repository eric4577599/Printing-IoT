using System.Security.Cryptography;
using System.Text;

namespace PrintingIoT.Core.Security;

/// <summary>
/// SecureTokens — 隨機憑證的產生與雜湊(S7)。
///
/// 全系統「不可猜測的祕密字串」只有這一份實作:API 金鑰
/// (<see cref="ApiKeyGenerator"/>)與刷新憑證都走這裡,
/// 避免其中一邊哪天改成弱亂數或可變時間比較而另一邊沒跟上。
///
/// 這些憑證是 256 bit 的高熵隨機值,不存在字典攻擊面,因此用 SHA-256 快雜湊而非 BCrypt ——
/// 每次請求都要驗一次,慢雜湊會直接變成端點的效能瓶頸。
/// </summary>
public static class SecureTokens
{
    private const int DefaultBytes = 32;

    /// <summary>
    /// 產生一段隨機祕密字串。
    /// 輸入:位元組數(預設 32);
    /// 輸出:base64url(無 padding)字串,只含 A-Z a-z 0-9 - _;
    /// 邏輯:以密碼學亂數產生;避開 + / = 以免在 HTTP 標頭、JSON 與客戶端設定檔中被轉義或截斷。
    /// </summary>
    public static string NewSecret(int bytes = DefaultBytes) =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    /// <summary>
    /// 計算祕密字串的雜湊。
    /// 輸入:明文(null 視為空字串);輸出:SHA-256 的 Base64 字串(44 字元)。
    /// </summary>
    public static string Hash(string? plain) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(plain ?? string.Empty)));

    /// <summary>
    /// 定時比較兩個雜湊字串。
    /// 輸入:資料庫中的雜湊、由請求算出的雜湊;輸出:是否相同;
    /// 邏輯:以 CryptographicOperations.FixedTimeEquals 比對位元組,避免以比較耗時推測雜湊值。
    /// </summary>
    public static bool HashEquals(string? stored, string? computed)
    {
        var a = Encoding.UTF8.GetBytes(stored ?? string.Empty);
        var b = Encoding.UTF8.GetBytes(computed ?? string.Empty);
        return a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
    }
}
