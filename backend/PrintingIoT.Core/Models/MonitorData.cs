using System.Text.Json.Serialization;

namespace PrintingIoT.Core.Models;

public record MonitorData(
    string DeviceId,
    decimal Speed,
    [property: JsonPropertyName("di1")] decimal DI1,
    string Status,
    DateTime Timestamp
);
