using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities;

/// <summary>
/// S3 / F1:完工實績的不良明細。
/// Code + Reason 為當下的「快照」——原因主檔日後改名或軟刪除,歷史報表仍讀得到當時的說法。
/// </summary>
public class ProductionDefect
{
    [Key]
    public long Id { get; set; }

    public Guid CompletionId { get; set; }

    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Reason { get; set; } = string.Empty;

    public int Qty { get; set; }
}
