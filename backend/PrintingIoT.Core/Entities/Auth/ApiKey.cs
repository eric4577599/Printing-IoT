using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintingIoT.Core.Entities.Auth;

/// <summary>
/// ApiKey — 機器對機器憑證(S7)。
///
/// 為什麼不重用 <see cref="User"/>:ERP 是程式呼叫,沒有互動式登入,
/// 也不該擁有可登入前端的身分。金鑰是獨立的憑證型別,自帶到期、撤銷與最後使用時間,
/// 與人員名冊完全分離,現場人事異動不會影響 ERP 推單。
///
/// **明文金鑰絕不入庫**:資料表只存 <see cref="KeyHash"/>(SHA-256),
/// 明文僅在建立當下回傳一次,遺失只能重新產生。
/// </summary>
[Table("ApiKeys")]
public class ApiKey
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>用途說明,例:「客戶 ERP 推單」。僅供管理介面辨識,不參與驗證。</summary>
    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }

    /// <summary>
    /// 金鑰前綴(明文,唯一索引建於此欄)。
    /// 驗證時先以前綴撈出單一列再比對雜湊,避免全表逐列雜湊比對;
    /// 管理介面也用它讓人分辨「現在跑的是哪一支金鑰」,而不必看到明文。
    /// </summary>
    [Required]
    [MaxLength(32)]
    public required string Prefix { get; set; }

    /// <summary>完整明文金鑰的 SHA-256 雜湊(Base64)。金鑰為高熵隨機值,不需 BCrypt 的慢雜湊。</summary>
    [Required]
    [MaxLength(64)]
    public required string KeyHash { get; set; }

    /// <summary>此金鑰代表的角色,目前恆為 <c>ERP_SERVICE</c>;保留欄位以便日後接入其他外部系統。</summary>
    [Required]
    [MaxLength(50)]
    public required string Role { get; set; }

    /// <summary>撤銷開關。撤銷不刪列,稽核軌跡必須留著。</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>到期時間(UTC);null 表示不設到期。已到期的金鑰驗證一律失敗。</summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>最後一次成功驗證的時間(UTC)。用來判斷金鑰是否還活著、輪替後舊金鑰能否安全撤銷。</summary>
    public DateTime? LastUsedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>建立者帳號(原始大小寫),供稽核。</summary>
    [MaxLength(50)]
    public string? CreatedBy { get; set; }
}
