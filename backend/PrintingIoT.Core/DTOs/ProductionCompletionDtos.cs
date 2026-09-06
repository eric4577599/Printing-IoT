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

/// <summary>
/// S8 / §1.1:日報彙總。欄位名與前端 calculateDailySummary 的輸出一致,
/// 讓前端在「後端彙總」與「本機重算」之間切換時不必改渲染程式。
/// 空區間回本型別的全 0 實例,不回 404 —— 「這段時間沒有生產」是合法答案。
/// </summary>
public class DailySummaryDto
{
    public int TotalOrders { get; set; }
    public int TotalTarget { get; set; }
    public int TotalGood { get; set; }
    public int TotalDefect { get; set; }

    /// <summary>良率(0–100):以區間總良品 / 總產出重算,不是逐筆良率的平均。</summary>
    public decimal AvgYieldRate { get; set; }

    /// <summary>達成率(0–100+):總良品 / 總目標。可超過 100。</summary>
    public decimal AvgAchievementRate { get; set; }

    public decimal TotalRunTime { get; set; }
    public decimal TotalStopTime { get; set; }
    public decimal TotalPrepTime { get; set; }
    public int TotalStopCount { get; set; }

    /// <summary>依產量加權的平均 OEE(規則 6),不是算術平均。</summary>
    public decimal AvgOEE { get; set; }

    /// <summary>稼動率(0–100):以區間彙總時間重算。</summary>
    public decimal Utilization { get; set; }
}

/// <summary>
/// S8 / §1.2:月報的一列(一個工廠日)。
/// oee 是拿當日彙總數據重算的,不是把當日各單的 OEE 平均掉(S3 GAP-05 的裁決)。
/// </summary>
public class MonthlyDailyRowDto
{
    /// <summary>工廠日 yyyy-MM-dd。</summary>
    public string Date { get; set; } = string.Empty;

    public int OrderCount { get; set; }
    public int TotalQty { get; set; }
    public int GoodQty { get; set; }
    public int DefectQty { get; set; }
    public int TargetQty { get; set; }
    public decimal YieldRate { get; set; }

    /// <summary>當日各單實際車速的算術平均(張/分)。</summary>
    public decimal AvgSpeed { get; set; }

    public decimal RunTime { get; set; }
    public decimal StopTime { get; set; }
    public decimal PrepTime { get; set; }
    public decimal UtilizationRate { get; set; }
    public decimal Oee { get; set; }
}

/// <summary>S8 / §1.2:月報彙總 —— 每日一列加整月總計。</summary>
public class MonthlySummaryDto
{
    /// <summary>依日期遞增排序。</summary>
    public List<MonthlyDailyRowDto> DailyRows { get; set; } = new();

    /// <summary>整月總計;oee 與 utilizationRate 拿整月彙總重算,不是把每日的值平均掉。</summary>
    public MonthlyDailyRowDto Totals { get; set; } = new();
}

/// <summary>
/// S8 / §1.3:停機原因彙總的一項。
/// 刻意不含下鑽明細 —— 那是逐筆資料,由 GET /api/production/completions 提供。
/// </summary>
public class StopReasonSummaryDto
{
    public string Reason { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalDurationMinutes { get; set; }
}

/// <summary>
/// S8:彙總查詢的結果包裝。
/// 彙總不分頁,所以「資料量太大」不能像分頁那樣默默只回一頁 —— 必須是一個明確的失敗,
/// 由呼叫端轉成 400 並請使用者縮小區間(沿用 S4「不可靜默截斷」的紀律)。
/// </summary>
public class SummaryResultDto<T>
{
    public bool Success { get; set; }

    /// <summary>失敗原因(正體中文);成功時為 null。</summary>
    public string? Error { get; set; }

    public T? Data { get; set; }

    public static SummaryResultDto<T> Ok(T data) => new() { Success = true, Data = data };

    public static SummaryResultDto<T> Fail(string error) => new() { Success = false, Error = error };
}
