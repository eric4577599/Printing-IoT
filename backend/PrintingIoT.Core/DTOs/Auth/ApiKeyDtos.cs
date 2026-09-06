namespace PrintingIoT.Core.DTOs.Auth;

/// <summary>
/// API 金鑰 DTO(S7)—— 機器對機器憑證的管理端點型別。
/// **任何回應型別都不得包含 KeyHash**;明文金鑰只出現在 <see cref="CreateApiKeyResponse"/>,
/// 且只在建立當下回傳一次。
/// </summary>
public record CreateApiKeyRequest(string Name, DateTime? ExpiresAt);

/// <summary>金鑰摘要(對外輸出用)。Prefix 是明文但不足以構成憑證,可安全顯示。</summary>
public record ApiKeySummary(
    Guid Id,
    string Name,
    string Prefix,
    string Role,
    bool IsActive,
    DateTime? ExpiresAt,
    DateTime? LastUsedAt,
    DateTime CreatedAt,
    string? CreatedBy);

/// <summary>
/// 建立金鑰的回應。<see cref="PlainKey"/> 是**唯一一次**能取得明文的機會 ——
/// 後端只留雜湊,遺失就只能撤銷重發。
/// </summary>
public record CreateApiKeyResponse(ApiKeySummary Key, string PlainKey);
