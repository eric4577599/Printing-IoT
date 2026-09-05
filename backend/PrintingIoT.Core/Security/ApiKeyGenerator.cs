using System.Security.Cryptography;
using System.Text;

namespace PrintingIoT.Core.Security;

/// <summary>
/// ApiKeyGenerator — 機器對機器金鑰的產生、切分與雜湊(S7)。
///
/// 全系統只有這一份定義:建立端(ApiKeysController)與驗證端
/// (ApiKeyAuthenticationHandler)都必須經過此類別,否則兩端會出現不同的
/// 格式假設,重演 S6 缺口 G-1「建立端與登入端相等語意不一致」那類問題。
///
/// 金鑰格式:<c>pio_{prefix}_{secret}</c>
/// - <c>prefix</c> 12 個小寫十六進位字元(6 bytes),明文入庫供查找與辨識;
/// - <c>secret</c> 32 bytes 的 base64url(無 padding),只以雜湊入庫。
/// </summary>
public static class ApiKeyGenerator
{
    /// <summary>金鑰固定前導字串,讓誤貼到日誌或原始碼的金鑰能被掃描規則辨識。</summary>
    public const string Scheme = "pio";

    private const int PrefixBytes = 6;
    private const int SecretBytes = 32;

    /// <summary>
    /// 產生一支新金鑰。
    /// 輸入:無;
    /// 輸出:(明文金鑰, 前綴, 雜湊)三元組 —— 明文只在此刻存在,呼叫端回傳一次後即丟棄;
    /// 邏輯:以密碼學亂數產生前綴與祕密段,組出明文後立即算 SHA-256。
    /// </summary>
    public static (string PlainKey, string Prefix, string Hash) Generate()
    {
        var prefix = Convert.ToHexString(RandomNumberGenerator.GetBytes(PrefixBytes)).ToLowerInvariant();
        var secret = SecureTokens.NewSecret(SecretBytes);
        var plainKey = $"{Scheme}_{prefix}_{secret}";
        return (plainKey, prefix, ComputeHash(plainKey));
    }

    /// <summary>
    /// 計算金鑰雜湊。
    /// 輸入:完整明文金鑰;輸出:SHA-256 的 Base64 字串(44 字元);
    /// 邏輯:金鑰是 256 bit 的高熵隨機值,不存在字典攻擊面,因此用快雜湊而非 BCrypt ——
    ///       每次 API 請求都要驗證一次,慢雜湊會直接變成推單端點的效能瓶頸。
    /// </summary>
    public static string ComputeHash(string plainKey) => SecureTokens.Hash(plainKey);

    /// <summary>
    /// 從明文金鑰取出前綴,供資料庫查找。
    /// 輸入:任意字串(可為 null / 格式不符);
    /// 輸出:前綴字串,格式不符時回 null;
    /// 邏輯:必須是 <c>pio_{prefix}_{secret}</c>、前導字串正確、前綴非空,否則視為格式錯誤。
    ///       **切分上限必須是 3**:祕密段是 base64url,本身就可能含底線,
    ///       用無上限的 Split 會把含底線的金鑰誤判成格式錯誤而全數 401(此為實測踩到的缺陷)。
    ///       這裡只做格式判斷,**不代表驗證通過** —— 真正的判定一律是雜湊定時比較。
    /// </summary>
    public static string? ExtractPrefix(string? plainKey)
    {
        if (string.IsNullOrWhiteSpace(plainKey)) return null;

        var parts = plainKey.Split('_', 3);
        if (parts.Length != 3) return null;
        if (parts[0] != Scheme) return null;
        if (parts[1].Length == 0 || parts[1].Length > 32) return null;
        if (parts[2].Length == 0) return null;

        return parts[1];
    }

    /// <summary>
    /// 定時比較兩個雜湊字串。
    /// 輸入:資料庫中的雜湊、由請求算出的雜湊;輸出:是否相同;
    /// 邏輯:以 CryptographicOperations.FixedTimeEquals 比對位元組,避免以比較耗時推測雜湊值。
    /// </summary>
    public static bool HashEquals(string? stored, string? computed) => SecureTokens.HashEquals(stored, computed);
}
