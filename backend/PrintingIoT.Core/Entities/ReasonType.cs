namespace PrintingIoT.Core.Entities;

/// <summary>
/// S3 / F5:原因主檔的類別。EF 沿用 MachineStatus / TelemetrySource 既有慣例存成 int。
/// </summary>
public enum ReasonType
{
    /// <summary>停機原因(現場停車彈窗使用)。</summary>
    Stop = 0,

    /// <summary>不良原因(完工彈窗的不良品表格使用)。</summary>
    Defect = 1
}
