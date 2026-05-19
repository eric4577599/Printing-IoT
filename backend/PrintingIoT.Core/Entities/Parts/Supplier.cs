using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintingIoT.Core.Entities.Parts;

/// <summary>
/// Supplier — 供應商主檔
/// Migrated from SmartParts.API.Entities.Supplier (Phase 3.1)
/// </summary>
[Table("Suppliers")]
public class Supplier
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }

    [MaxLength(50)]
    public string? ContactPerson { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(100)]
    public string? Email { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<SupplierPart> SupplierParts { get; set; } = new List<SupplierPart>();
}
