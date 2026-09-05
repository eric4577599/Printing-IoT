namespace PrintingIoT.Core.Constants;

/// <summary>
/// AppRoles — 系統角色常數(S5)。
///
/// 正式詞彙一律全大寫;前後端不得再出現角色字面值散落。
/// 資料庫中若殘留舊的大小寫混用值(如 "Admin"),簽發權杖時會統一
/// 以 <see cref="Normalize"/> 轉為大寫,授權判斷因此不受舊資料影響。
/// </summary>
public static class AppRoles
{
    /// <summary>系統管理者 — 全權,含使用者管理與系統設定。</summary>
    public const string Admin = "ADMIN";

    /// <summary>工程師 — 系統設定、模擬 / 除錯,不含使用者管理。</summary>
    public const string Engineer = "ENGINEER";

    /// <summary>領班 — 主檔維護(產品、原因)、排程,不含系統設定。</summary>
    public const string Supervisor = "SUPERVISOR";

    /// <summary>作業員 — 現場操作:看板、排程狀態、報工。</summary>
    public const string Operator = "OPERATOR";

    /// <summary>四個正式角色的完整清單(建立角色列與驗證輸入時使用)。</summary>
    public static readonly string[] All = { Admin, Supervisor, Engineer, Operator };

    /// <summary>
    /// 授權原則(policy)名稱常數,對應 Program.cs 的註冊。
    /// </summary>
    public static class Policies
    {
        /// <summary>使用者管理 — 僅 ADMIN。</summary>
        public const string UserAdmin = "UserAdmin";

        /// <summary>系統設定與模擬除錯 — ADMIN / ENGINEER。</summary>
        public const string SystemConfig = "SystemConfig";

        /// <summary>主檔寫入 — ADMIN / SUPERVISOR / ENGINEER。</summary>
        public const string MasterDataWrite = "MasterDataWrite";
    }

    /// <summary>
    /// 角色字串正規化。
    /// 輸入:任意大小寫的角色字串(可為 null);
    /// 輸出:去空白後的大寫字串,null / 空白輸入回傳空字串;
    /// 邏輯:以不受地區設定影響的 ToUpperInvariant 轉換,避免土耳其語 i 之類的地區陷阱。
    /// </summary>
    public static string Normalize(string? role) => (role ?? string.Empty).Trim().ToUpperInvariant();

    /// <summary>
    /// 判斷是否為四個正式角色之一。
    /// 輸入:任意大小寫的角色字串;輸出:是否合法;
    /// 邏輯:先正規化再比對 <see cref="All"/>。
    /// </summary>
    public static bool IsValid(string? role) => All.Contains(Normalize(role));
}
