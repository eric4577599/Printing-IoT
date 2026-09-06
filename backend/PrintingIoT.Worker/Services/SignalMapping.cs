using System.Text;
using System.Text.Json;

namespace PrintingIoT.Worker.Services;

/// <summary>
/// 訊號欄位對映(兩個欄位都存正規化後的鍵,例如 di1 / di0)。
/// </summary>
public record SignalMapping(string CountField, string MotorField);

/// <summary>
/// 訊號名稱正規化工具:把設定值與 JSON 欄位名收斂成同一種寫法。
/// </summary>
public static class SignalNameNormalizer
{
    /// <summary>
    /// 正規化訊號名稱。
    /// 輸入:設定值或 JSON 欄位名(可能為 DI-1、di1、DI1、DI_1、" DI 1 "、null)。
    /// 邏輯:null 或空白回傳空字串;否則轉小寫並移除所有非 a-z0-9 的字元。
    /// 輸出:正規化鍵,上述輸入皆得到 "di1"。
    /// </summary>
    public static string Normalize(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return string.Empty;

        var sb = new StringBuilder(name.Length);
        foreach (var ch in name)
        {
            if (ch >= 'a' && ch <= 'z') sb.Append(ch);
            else if (ch >= 'A' && ch <= 'Z') sb.Append(char.ToLowerInvariant(ch));
            else if (ch >= '0' && ch <= '9') sb.Append(ch);
        }
        return sb.ToString();
    }
}

/// <summary>
/// 以正規化名稱在 JSON 物件中尋找訊號欄位。
/// </summary>
public static class JsonSignalReader
{
    /// <summary>
    /// 依正規化鍵取出 JSON 屬性值。
    /// 輸入:JSON 根元素、已正規化的鍵。
    /// 邏輯:逐一走訪根物件的屬性,對屬性名做同一套 Normalize 後比對,命中第一個相符者即回傳。
    /// 輸出:命中回傳 true 並輸出該屬性值;根元素非物件、鍵為空字串或無相符屬性時回傳 false。
    /// </summary>
    public static bool TryGetSignal(JsonElement root, string normalizedKey, out JsonElement value)
        => TryGetSignal(root, normalizedKey, out value, out _);

    /// <summary>
    /// 同上,另外輸出相符屬性的總數(供呼叫端偵測欄位名稱重複並記錄警告)。
    /// 輸入:JSON 根元素、已正規化的鍵。
    /// 輸出:是否命中、第一個相符的值、相符屬性總數。
    /// </summary>
    public static bool TryGetSignal(JsonElement root, string normalizedKey, out JsonElement value, out int matchCount)
    {
        value = default;
        matchCount = 0;

        if (string.IsNullOrEmpty(normalizedKey)) return false;
        if (root.ValueKind != JsonValueKind.Object) return false;

        foreach (var prop in root.EnumerateObject())
        {
            if (SignalNameNormalizer.Normalize(prop.Name) != normalizedKey) continue;

            if (matchCount == 0) value = prop.Value;
            matchCount++;
        }

        return matchCount > 0;
    }
}
