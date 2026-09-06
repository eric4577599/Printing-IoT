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

    /// <summary>資料來源(真機 WISE / 模擬器);EF 沿用 MachineStatus 既有慣例存成 int。</summary>
    public TelemetrySource Source { get; set; } = TelemetrySource.Unknown;
}
