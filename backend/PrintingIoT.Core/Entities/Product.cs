using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities;

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string ProductCode { get; set; } = string.Empty; // Unique key

    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public decimal OptimizationPhase { get; set; } = 0;
    public decimal OptimizationGap { get; set; } = 0;
}
