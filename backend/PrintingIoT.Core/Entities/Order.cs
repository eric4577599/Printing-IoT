using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal TargetLength { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Phase 6: Schedule Fields
    public int Sequence { get; set; } = 0; // 0 = Unscheduled/Pool
    [MaxLength(50)]
    public string BoxType { get; set; } = string.Empty; // e.g. "A Type"
    [MaxLength(100)]
    public string PaperSpec { get; set; } = string.Empty; // e.g. "AB Flute"
    public int Quantity { get; set; }

    // Phase 7: Product Optimization
    [MaxLength(50)]
    public string ProductCode { get; set; } = string.Empty;
    public decimal? OptPhase { get; set; }
    public decimal? OptGap { get; set; }

    // Phase 8: Detailed Specs
    public DateTime? DeliveryDate { get; set; }

    // Traceability
    [MaxLength(50)]
    public string ProductionBatch { get; set; } = string.Empty;
    [MaxLength(100)]
    public string TraceCode { get; set; } = string.Empty;

    // Phase 2(排程拖拉後端持久化):存前端排程列的完整規格 payload(BoxDiagram 需要的
    // boxLen/boxWid/dim*/l*/w*/h*/dieCutType 等後端未逐一建欄的欄位),以 JSON 字串保存。
    // nullable、加法式欄位,不影響既有查詢與寫入。
    public string? SpecJson { get; set; }
}
