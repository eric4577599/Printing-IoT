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

    // --- Box Specifications ---
    public decimal Length { get; set; } // mm
    public decimal Width { get; set; }  // mm
    public decimal Height { get; set; } // mm

    // --- Structure ---
    [MaxLength(20)]
    public string FluteType { get; set; } = string.Empty; // A, B, C, E, AB
    public int LayerCount { get; set; } // 3, 5, 7
    [MaxLength(50)]
    public string MaterialGrade { get; set; } = string.Empty; // Kraft, White, etc.

    // --- Processing ---
    public int PrintColorCount { get; set; }
    [MaxLength(500)]
    public string PrintContent { get; set; } = string.Empty;
    [MaxLength(200)]
    public string CreasingInfo { get; set; } = string.Empty;
    [MaxLength(50)]
    public string DieCutType { get; set; } = string.Empty; // Standard, Wing, etc.
    [MaxLength(200)]
    public string PostProcessing { get; set; } = string.Empty; // Punching, Labeling

    // --- Packaging ---
    public int BundleCount { get; set; } // Qty per bundle
    [MaxLength(50)]
    public string PackingType { get; set; } = string.Empty;
}
