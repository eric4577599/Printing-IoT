using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities;

public class MachineSection
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; } = true;

    [MaxLength(50)]
    public string? ErrorSignal { get; set; } // e.g. "di3"
    
    [MaxLength(50)]
    public string? ErrorValue { get; set; } // e.g. "1" or "true"

    [MaxLength(50)]
    public string? RunSignal { get; set; } // e.g. "di1"

    [MaxLength(50)]
    public string? RunValue { get; set; } // e.g. "1"
}
