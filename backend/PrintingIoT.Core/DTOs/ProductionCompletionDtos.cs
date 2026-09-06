namespace PrintingIoT.Core.DTOs;

/// <summary>
/// S3 / F2:POST /api/production/completions 的請求本體(JSON 為 camelCase)。
/// 前端若另外送了 oee / defectQty / stopCount 等計算欄位,後端一律忽略,以自己算的為準。
/// </summary>
public class ProductionCompletionRequest
{
    /// <summary>前端產生的冪等鍵(productionRecord.id 字串化),必填。</summary>
    public string? ClientRecordId { get; set; }

    public Guid? OrderId { get; set; }

    public string? OrderNumber { get; set; }

    public string? DeviceId { get; set; }

    public string? Operator { get; set; }

    public string? Shift { get; set; }

    public int TargetQty { get; set; }

    public int GoodQty { get; set; }

    public decimal PrepTimeMinutes { get; set; }

    public decimal RunTimeMinutes { get; set; }

    public decimal StopTimeMinutes { get; set; }

    public decimal AvgSpeed { get; set; }

    public string? ShortageReason { get; set; }

    /// <summary>完工時間;省略時以伺服器 UTC 現在時間為準。</summary>
    public DateTime? CompletedAt { get; set; }

    public List<ProductionDefectRequest>? Defects { get; set; }

    public List<ProductionStopRequest>? Stops { get; set; }
}

/// <summary>不良明細請求項。</summary>
public class ProductionDefectRequest
{
    public string? Code { get; set; }
    public string? Reason { get; set; }
    public int Qty { get; set; }
}

/// <summary>停機明細請求項。</summary>
public class ProductionStopRequest
{
    public string? Code { get; set; }
    public string? Reason { get; set; }
    public DateTime? StartedAt { get; set; }
    public decimal DurationMinutes { get; set; }
}

/// <summary>
/// S3 / F2:落地結果。Success = false 時由控制器轉成 400,其餘欄位不具意義。
/// Duplicated = true 表示命中既有 ClientRecordId(冪等),控制器回 200 而非 201。
/// </summary>
public class ProductionCompletionResultDto
{
    public bool Success { get; set; } = true;

    /// <summary>驗證失敗時的正體中文訊息;成功時為 null。</summary>
    public string? Error { get; set; }

    public Guid Id { get; set; }

    public string ClientRecordId { get; set; } = string.Empty;

    public DateOnly ProductionDate { get; set; }

    public DateTime CompletedAt { get; set; }

    public int DefectQty { get; set; }

    public int StopCount { get; set; }

    public decimal AvailabilityRate { get; set; }

    public decimal PerformanceRate { get; set; }

    public decimal QualityRate { get; set; }

    public decimal Oee { get; set; }

    /// <summary>是否成功把關聯工單推進 Completed。</summary>
    public bool OrderStatusUpdated { get; set; }

    /// <summary>true = 命中既有 ClientRecordId,未新增列。</summary>
    public bool Duplicated { get; set; }
}

/// <summary>S3 / F2:查詢用的完工實績 DTO(含明細)。</summary>
public class ProductionCompletionDto
{
    public Guid Id { get; set; }
    public string ClientRecordId { get; set; } = string.Empty;
    public Guid? OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public string Operator { get; set; } = string.Empty;
    public string Shift { get; set; } = string.Empty;
    public int TargetQty { get; set; }
    public int GoodQty { get; set; }
    public int DefectQty { get; set; }
    public decimal PrepTimeMinutes { get; set; }
    public decimal RunTimeMinutes { get; set; }
    public decimal StopTimeMinutes { get; set; }
    public int StopCount { get; set; }
    public decimal AvgSpeed { get; set; }
    public decimal AvailabilityRate { get; set; }
    public decimal PerformanceRate { get; set; }
    public decimal QualityRate { get; set; }
    public decimal Oee { get; set; }
    public string ShortageReason { get; set; } = string.Empty;
    public DateTime CompletedAt { get; set; }
    public DateOnly ProductionDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ProductionDefectDto> Defects { get; set; } = new();
    public List<ProductionStopDto> Stops { get; set; } = new();
}

/// <summary>不良明細回應項。</summary>
public class ProductionDefectDto
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public int Qty { get; set; }
}

/// <summary>停機明細回應項。</summary>
public class ProductionStopDto
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime? StartedAt { get; set; }
    public decimal DurationMinutes { get; set; }
}
