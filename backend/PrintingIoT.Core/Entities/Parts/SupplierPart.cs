using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PrintingIoT.Core.Entities.Parts;

/// <summary>
/// SupplierPart — 供應商-零件關聯 (Many-to-Many with payload)
/// Migrated from SmartParts.API.Entities.SupplierPart (Phase 3.1)
/// </summary>
[Table("SupplierParts")]
public class SupplierPart
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid PartId { get; set; }

    [Required]
    public Guid SupplierId { get; set; }

    [MaxLength(100)]
    public string? ManufacturerPN { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? Price { get; set; }

    public int? LeadTimeDays { get; set; }

    public bool IsPreferred { get; set; } = false;

    // Navigation
    [JsonIgnore]
    public Part Part { get; set; } = null!;

    [JsonIgnore]
    public Supplier Supplier { get; set; } = null!;
}
