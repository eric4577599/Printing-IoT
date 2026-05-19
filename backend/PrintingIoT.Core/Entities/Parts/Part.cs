using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintingIoT.Core.Entities.Parts;

/// <summary>
/// Part — 零件主檔
/// Migrated from SmartParts.API.Entities.Part (Phase 3.1)
/// </summary>
[Table("Parts")]
public class Part
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public required string InternalPN { get; set; } // Unique Index

    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }

    [MaxLength(255)]
    public string? Specification { get; set; }

    [MaxLength(50)]
    public string? Category { get; set; }

    public int SafeStockLevel { get; set; } = 0;

    [Required]
    [MaxLength(20)]
    public string Unit { get; set; } = "pcs";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<SupplierPart> SupplierParts { get; set; } = new List<SupplierPart>();
}
