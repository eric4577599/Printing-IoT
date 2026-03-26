using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities.Maintenance;

public enum MaintenanceType
{
    Routine,
    Repair,
    Vendor // Manufacturer/External
}

public enum MaintenanceStatus
{
    Pending,
    Completed,
    Verified
}

public class MaintenanceRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? ScheduleId { get; set; }
    public MaintenanceSchedule? Schedule { get; set; }

    public Guid? PartId { get; set; }
    public SparePart? Part { get; set; }
    public int QuantityUsed { get; set; } = 0;

    public MaintenanceType Type { get; set; }
    public MaintenanceStatus Status { get; set; } = MaintenanceStatus.Pending;

    public DateTime ExecutionDate { get; set; } = DateTime.UtcNow;

    [MaxLength(100)]
    public string Technician { get; set; } = string.Empty;

    public bool IsPassed { get; set; } = true; // Result verification

    public string? Notes { get; set; }
}
