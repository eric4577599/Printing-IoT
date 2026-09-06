namespace PrintingIoT.Core.DTOs.Auth;

/// <summary>
/// Auth DTOs — 身分驗證相關的資料傳輸物件。
/// S5:新增初始化與使用者管理端點所需的請求 / 回應型別。
/// 任何回應型別都不得包含 PasswordHash。
/// </summary>
public record LoginRequest(string Username, string Password);

/// <summary>
/// 登入回應。S5 於尾端新增 DisplayName / ExpiresAt 兩個選填參數(additive),
/// 既有以三個參數建構的程式碼仍可編譯。
/// S7 再於尾端新增 RefreshToken / RefreshTokenExpiresAt(同樣 additive):
/// RefreshToken 是**明文,只在此刻出現一次**,後端只留雜湊。
/// </summary>
public record LoginResponse(
    string Token,
    string Username,
    string[] Roles,
    string? DisplayName = null,
    DateTime ExpiresAt = default,
    string? RefreshToken = null,
    DateTime? RefreshTokenExpiresAt = null);

/// <summary>換發存取權杖的請求(S7)。憑證本身即身分,故不需另外帶帳號。</summary>
public record RefreshRequest(string RefreshToken);

/// <summary>登出請求(S7)。作廢指定的刷新憑證;憑證已失效或不存在時一律回 204。</summary>
public record LogoutRequest(string? RefreshToken);

/// <summary>初始化第一個管理者的請求;密碼一律走 body,不再有 query string 路徑。</summary>
public record SetupAdminRequest(string SetupToken, string Username, string Password, string? DisplayName);

/// <summary>建立使用者的請求(ADMIN 專用)。Role 存入前正規化為大寫。</summary>
public record CreateUserRequest(string Username, string Password, string Role, string? DisplayName, string? Shift);

/// <summary>更新使用者的請求;全部欄位選填,只更新有給值的欄位。</summary>
public record UpdateUserRequest(string? DisplayName, string? Shift, string? Role, string? Password, bool? IsActive);

/// <summary>使用者摘要(對外輸出用),永不含密碼雜湊。</summary>
public record UserSummary(
    Guid Id,
    string Username,
    string? DisplayName,
    string? Shift,
    string[] Roles,
    bool IsActive,
    DateTime CreatedAt);
