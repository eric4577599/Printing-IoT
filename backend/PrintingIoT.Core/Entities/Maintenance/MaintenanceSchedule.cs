using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities.Maintenance;

public enum FrequencyType
{
    Daily,
    Weekly,
    Monthly,
    AdHoc
}

public class MaintenanceSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public FrequencyType Frequency { get; set; }

    public bool IsPartRequired { get; set; } = false;

    public bool IsActive { get; set; } = true;
}
