using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities;

/// <summary>
/// S3 / F5:停機 / 不良原因主檔。
/// 設定頁與現場彈窗共用同一份資料,不再兩邊各寫死一份清單。
/// 刪除採軟刪除(IsActive = false):歷史明細以 Code + Reason 快照保存,
/// 但報表分類仍會回查主檔,硬刪會讓舊報表出現孤兒代碼。
/// </summary>
public class ReasonCode
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public ReasonType Type { get; set; }

    /// <summary>現場代碼(停機 001、不良 A01),與 Type 組成唯一鍵。</summary>
    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>分類,未填時存 General。</summary>
    [MaxLength(50)]
    public string Category { get; set; } = "General";

    public int DisplayOrder { get; set; }

    /// <summary>軟刪除旗標;false 表示已停用,預設查詢讀不到。</summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
