using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities.Maintenance;

public class SparePart
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string PartName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Specification { get; set; } = string.Empty;

    public int StockQuantity { get; set; } = 0;

    public int MinimumStockLevel { get; set; } = 0; // Warning threshold
}
