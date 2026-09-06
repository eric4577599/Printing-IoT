using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities;

/// <summary>
/// S3 / F1:完工實績的停機明細。
/// 與不良明細相同,Code + Reason 為快照,不隨原因主檔異動而改變。
/// </summary>
public class ProductionStop
{
    [Key]
    public long Id { get; set; }

    public Guid CompletionId { get; set; }

    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Reason { get; set; } = string.Empty;

    /// <summary>停機起始時間(UTC),前端未提供時為 null。</summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>停機時長(分)。</summary>
    public decimal DurationMinutes { get; set; }
}
