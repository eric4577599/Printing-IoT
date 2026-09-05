namespace PrintingIoT.API.Authentication;

/// <summary>
/// ApiKeyAuthenticationDefaults — API 金鑰驗證機制的名稱常數(S7)。
/// 方案名稱與標頭名稱只在此處定義一份,Program.cs 註冊、控制器標註與測試都引用它。
/// </summary>
public static class ApiKeyAuthenticationDefaults
{
    /// <summary>驗證方案名稱,對應 Program.cs 的 AddScheme 註冊。</summary>
    public const string Scheme = "ApiKey";

    /// <summary>攜帶金鑰的請求標頭。ERP 端只需要加這一個標頭。</summary>
    public const string HeaderName = "X-Api-Key";

    /// <summary>
    /// 同時接受 API 金鑰與 JWT 的方案清單,供 <c>[Authorize(AuthenticationSchemes = ...)]</c> 使用。
    /// 順序有意義:先試金鑰、再試 Bearer,ERP 的請求不會白跑一次 JWT 解析。
    /// </summary>
    public const string SchemeAndBearer = Scheme + ",Bearer";
}
