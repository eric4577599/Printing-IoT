namespace PrintingIoT.Core.Entities;

/// <summary>
/// 遙測資料來源。
/// Unknown = 0 讓升級前既有的資料列誠實標示為「來源不明」,不會被誤認成真機資料。
/// </summary>
public enum TelemetrySource
{
    Unknown = 0,
    Wise = 1,
    Simulator = 2
}
