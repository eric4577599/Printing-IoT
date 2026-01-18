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
}
