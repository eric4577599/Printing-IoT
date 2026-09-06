using PrintingIoT.Core.Entities;

namespace PrintingIoT.Worker.Services;

/// <summary>
/// 一筆已解析完成的機台取樣。真機與模擬器解析後都收斂成這個型別,之後走同一條遙測管線。
/// Count 為計數/長度原始值;ProvidedSpeed 為來源已給的速度(模擬器),null 表示需由計數推算。
/// </summary>
public record MachineSample(
    string DeviceId,
    TelemetrySource Source,
    long Count,
    decimal? ProvidedSpeed,
    MachineStatus Status,
    DateTime TimestampUtc);
