namespace PrintingIoT.Core.Constants;

/// <summary>
/// AppUsernames — 登入帳號的正規化規則(S6)。
///
/// 全系統只有這一份定義:建立帳號的唯一性檢查、登入查詢、實體層自動同步
/// 都必須經過 <see cref="Normalize"/>,否則兩端會再度出現不同的相等語意
/// (S6 缺口 G-1:建立端不分大小寫、登入端精確比對,現場打 op1 會登不進 OP1)。
///
/// 只作用於帳號;密碼永遠精確比對,顯示名稱與班別一律不動。
/// </summary>
public static class AppUsernames
{
    /// <summary>
    /// 登入帳號正規化。
    /// 輸入:任意大小寫、可能帶前後空白的帳號字串(可為 null);
    /// 輸出:去前後空白後的大寫字串,null 輸入回傳空字串;
    /// 邏輯:先 Trim(觸控鍵盤與條碼槍常帶入空白),再以不受地區設定影響的
    ///       ToUpperInvariant 轉大寫。大寫慣例與 <see cref="AppRoles.Normalize"/> 一致,
    ///       也與 ASP.NET Core Identity 的 NormalizedUserName 相同,避免土耳其語 i 之類的地區陷阱。
    /// </summary>
    public static string Normalize(string? username) => (username ?? string.Empty).Trim().ToUpperInvariant();
}
