using System.Text.Json.Serialization;

namespace PrintingIoT.Core.Models;

/// <summary>
/// 即時監控快照。Status 一律填 MachineStatus 的列舉名稱字串(Unknown/Running/Idle/Error/Maintenance)。
/// Source 為具預設值的尾端參數,填 wise / simulator,既有 5 參數呼叫端不受影響。
/// </summary>
public record MonitorData(
    string DeviceId,
    decimal Speed,
    [property: JsonPropertyName("di1")] decimal DI1,
    string Status,
    DateTime Timestamp,
    string Source = "unknown"
);
