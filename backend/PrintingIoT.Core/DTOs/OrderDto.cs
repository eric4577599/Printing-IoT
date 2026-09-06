using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.DTOs;

public class OrderDto
{
    [Required]
    public string OrderNumber { get; set; } = string.Empty;

    [Required]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    public decimal TargetLength { get; set; }

    public string? ProductCode { get; set; }
    public string? BoxType { get; set; }
    public string? PaperSpec { get; set; }
    public int Quantity { get; set; }
    
    public DateTime? DeliveryDate { get; set; }
    public string? ProductionBatch { get; set; }
    public string? TraceCode { get; set; }
}
