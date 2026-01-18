using System.ComponentModel.DataAnnotations;

namespace PrintingIoT.Core.Entities;

public class ProductionLog
{
    [Key]
    public long Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string DeviceId { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; }

    public decimal TotalLength { get; set; }

    public decimal Speed { get; set; }

    public MachineStatus Status { get; set; }
}
