using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PrintingIoT.Core.Entities.Auth;

/// <summary>
/// RefreshToken — 權杖刷新憑證(S7)。
///
/// 解決 S6 遺留的 E2:存取權杖 2 小時到期後,下一次 API 呼叫回 401,
/// 現場**未存檔的表單資料會直接遺失**。刷新憑證效期涵蓋一個班,
/// 讓前端在 401 當下換一張新的存取權杖並重送原請求,操作不中斷。
///
/// 兩個安全設計:
/// - **只存雜湊**(SHA-256):資料庫外洩不等於可冒用;明文只在回應中出現一次。
/// - **一次性 + 輪替**:每次刷新都作廢舊憑證並發新的。舊憑證被重複使用即視為外洩,
///   由呼叫端把該使用者所有未作廢的憑證一併作廢(重用偵測)。
/// </summary>
[Table("RefreshTokens")]
public class RefreshToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [JsonIgnore]
    public User User { get; set; } = null!;

    /// <summary>明文憑證的 SHA-256 雜湊(Base64)。唯一索引建於此欄,查找即以它為鍵。</summary>
    [Required]
    [MaxLength(64)]
    public required string TokenHash { get; set; }

    /// <summary>到期時間(UTC)。到期後即使未作廢也不得換發。</summary>
    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>作廢時間(UTC);null 表示仍有效。作廢不刪列,重用偵測需要看得到它。</summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>建立時的來源位址,供稽核追查憑證是從哪裡發出去的。</summary>
    [MaxLength(64)]
    public string? CreatedByIp { get; set; }
}
