using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities;

/// <summary>
/// S3 / F1:完工實績主表 —— 一張工單完工時產生的一筆生產結果紀錄。
/// 後端是實績的權威來源:良品/不良品、時間、停機明細與四個率值都以本表為準,
/// 前端 localStorage 只是離線快取。
/// 刻意不對 Order 建立導覽屬性(只留 OrderId),避免工單被刪除時連鎖刪掉實績 —— 實績必須比工單活得久。
/// </summary>
public class ProductionCompletion
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>前端產生的冪等鍵(現行 productionRecord.id 字串化),同鍵重送不會長出第二列。</summary>
    [Required]
    [MaxLength(64)]
    public string ClientRecordId { get; set; } = string.Empty;

    /// <summary>關聯後端工單;手動報工或前端本地單可為 null。</summary>
    public Guid? OrderId { get; set; }

    /// <summary>冗餘保存的訂單編號,工單被刪除後仍可追溯。</summary>
    [MaxLength(50)]
    public string OrderNumber { get; set; } = string.Empty;

    [MaxLength(50)]
    public string DeviceId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Operator { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Shift { get; set; } = string.Empty;

    public int TargetQty { get; set; }

    public int GoodQty { get; set; }

    /// <summary>不良品總數 = 不良明細加總,後端重算(請求帶的值一律忽略)。</summary>
    public int DefectQty { get; set; }

    /// <summary>準備時間(分)。</summary>
    public decimal PrepTimeMinutes { get; set; }

    /// <summary>運轉時間(分)。</summary>
    public decimal RunTimeMinutes { get; set; }

    /// <summary>停機時間(分)。</summary>
    public decimal StopTimeMinutes { get; set; }

    /// <summary>停機次數 = 停機明細筆數,後端重算。</summary>
    public int StopCount { get; set; }

    /// <summary>實際平均車速(張/分)。</summary>
    public decimal AvgSpeed { get; set; }

    /// <summary>稼動率(0–100),後端以 OeeCalculator 計算。</summary>
    public decimal AvailabilityRate { get; set; }

    /// <summary>效能(0–100),後端計算。</summary>
    public decimal PerformanceRate { get; set; }

    /// <summary>良率(0–100),後端計算。</summary>
    public decimal QualityRate { get; set; }

    /// <summary>OEE(0–100),後端計算。</summary>
    public decimal Oee { get; set; }

    [MaxLength(100)]
    public string ShortageReason { get; set; } = string.Empty;

    /// <summary>完工時間(UTC)。</summary>
    public DateTime CompletedAt { get; set; }

    /// <summary>工廠日(依工廠時區與日界換算,見 FactoryDayCalculator)。</summary>
    public DateOnly ProductionDate { get; set; }

    /// <summary>落地時間(UTC)。</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<ProductionDefect> Defects { get; set; } = new();

    public List<ProductionStop> Stops { get; set; } = new();
}
