using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Core.Services;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.Infrastructure.Services;

/// <summary>
/// S3 / F2:完工實績落地與查詢服務。
/// 後端是實績的權威來源:DefectQty / StopCount / ProductionDate 與四個率值全部由後端重算,
/// 前端送來的同名計算欄位一律忽略,避免兩份數字打架。
/// </summary>
public class ProductionService : IProductionService
{
    private readonly PrintingContext _context;
    private readonly IOrderService _orderService;
    private readonly IFactoryTimeProvider _factoryTime;
    private readonly ILogger<ProductionService> _logger;

    // §6 驗證表的欄位長度與筆數上限
    private const int MaxClientRecordIdLength = 64;
    private const int MaxOrderNumberLength = 50;
    private const int MaxDeviceIdLength = 50;
    private const int MaxOperatorLength = 100;
    private const int MaxShiftLength = 20;
    private const int MaxShortageReasonLength = 100;
    private const int MaxReasonCodeLength = 20;
    private const int MaxReasonNameLength = 100;
    private const int MaxDetailRows = 200;

    // §F2 查詢分頁上限
    private const int MaxPageSize = 500;

    public ProductionService(
        PrintingContext context,
        IOrderService orderService,
        IFactoryTimeProvider factoryTime,
        ILogger<ProductionService> logger)
    {
        _context = context;
        _orderService = orderService;
        _factoryTime = factoryTime;
        _logger = logger;
    }

    /// <summary>
    /// 落地一筆完工實績(冪等)。
    /// 輸入:ProductionCompletionRequest。
    /// 輸出:ProductionCompletionResultDto —— 驗證失敗 Success=false 且零寫入;
    ///       命中既有 ClientRecordId 時 Duplicated=true 且不新增、不更新。
    /// 邏輯:先全部驗證 → 查冪等鍵 → 重算 DefectQty / StopCount / 工廠日 / 四率 → 單次 SaveChanges
    ///       → 有 OrderId 時嘗試把工單推進 Completed(失敗只記 log,實績照常落地)。
    /// </summary>
    public async Task<ProductionCompletionResultDto> RecordCompletionAsync(ProductionCompletionRequest request)
    {
        if (request == null)
            return Fail("請求本體不可為空");

        var error = Validate(request);
        if (error != null)
            return Fail(error);

        var clientRecordId = request.ClientRecordId!.Trim();

        // 冪等:命中既有列就原樣回既有值,不新增也不更新
        var existing = await _context.ProductionCompletions
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ClientRecordId == clientRecordId);

        if (existing != null)
        {
            _logger.LogInformation("完工實績 {ClientRecordId} 已存在,回冪等結果", clientRecordId);
            return new ProductionCompletionResultDto
            {
                Id = existing.Id,
                ClientRecordId = existing.ClientRecordId,
                ProductionDate = existing.ProductionDate,
                CompletedAt = existing.CompletedAt,
                DefectQty = existing.DefectQty,
                StopCount = existing.StopCount,
                AvailabilityRate = existing.AvailabilityRate,
                PerformanceRate = existing.PerformanceRate,
                QualityRate = existing.QualityRate,
                Oee = existing.Oee,
                OrderStatusUpdated = false,
                Duplicated = true,
            };
        }

        var defects = (request.Defects ?? new List<ProductionDefectRequest>())
            .Select(d => new ProductionDefect
            {
                Code = Truncate(d.Code, MaxReasonCodeLength),
                Reason = Truncate(d.Reason, MaxReasonNameLength),
                Qty = d.Qty,
            })
            .ToList();

        var stops = (request.Stops ?? new List<ProductionStopRequest>())
            .Select(s => new ProductionStop
            {
                Code = Truncate(s.Code, MaxReasonCodeLength),
                Reason = Truncate(s.Reason, MaxReasonNameLength),
                StartedAt = s.StartedAt.HasValue ? ToUtc(s.StartedAt.Value) : null,
                DurationMinutes = s.DurationMinutes,
            })
            .ToList();

        // 後端重算:請求即使帶了不一致的值也以這裡為準(AC-05)
        var defectQty = defects.Sum(d => d.Qty);
        var stopCount = stops.Count;

        var completedAt = request.CompletedAt.HasValue
            ? ToUtc(request.CompletedAt.Value)
            : DateTime.UtcNow;

        var oee = OeeCalculator.Calculate(
            request.RunTimeMinutes, request.StopTimeMinutes, request.PrepTimeMinutes,
            request.GoodQty, defectQty, request.TargetQty);

        var completion = new ProductionCompletion
        {
            ClientRecordId = clientRecordId,
            OrderId = request.OrderId,
            OrderNumber = Truncate(request.OrderNumber, MaxOrderNumberLength),
            DeviceId = Truncate(request.DeviceId, MaxDeviceIdLength),
            Operator = Truncate(request.Operator, MaxOperatorLength),
            Shift = Truncate(request.Shift, MaxShiftLength),
            TargetQty = request.TargetQty,
            GoodQty = request.GoodQty,
            DefectQty = defectQty,
            PrepTimeMinutes = request.PrepTimeMinutes,
            RunTimeMinutes = request.RunTimeMinutes,
            StopTimeMinutes = request.StopTimeMinutes,
            StopCount = stopCount,
            AvgSpeed = request.AvgSpeed,
            AvailabilityRate = oee.Availability,
            PerformanceRate = oee.Performance,
            QualityRate = oee.Quality,
            Oee = oee.Oee,
            ShortageReason = Truncate(request.ShortageReason, MaxShortageReasonLength),
            CompletedAt = completedAt,
            ProductionDate = _factoryTime.ResolveProductionDate(completedAt),
            CreatedAt = DateTime.UtcNow,
            Defects = defects,
            Stops = stops,
        };

        _context.ProductionCompletions.Add(completion);
        await _context.SaveChangesAsync();

        // 工單狀態推進:失敗不回滾實績 —— 現場資料優先於參照完整性
        var orderStatusUpdated = false;
        if (request.OrderId.HasValue)
        {
            try
            {
                orderStatusUpdated = await _orderService.UpdateStatusAsync(request.OrderId.Value, OrderStatus.Completed);
                if (!orderStatusUpdated)
                {
                    _logger.LogWarning(
                        "完工實績 {ClientRecordId} 的工單 {OrderId} 不存在,實績照常落地但狀態未更新",
                        clientRecordId, request.OrderId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "更新工單 {OrderId} 狀態時發生例外,實績 {ClientRecordId} 已落地不回滾",
                    request.OrderId, clientRecordId);
                orderStatusUpdated = false;
            }
        }

        return new ProductionCompletionResultDto
        {
            Id = completion.Id,
            ClientRecordId = completion.ClientRecordId,
            ProductionDate = completion.ProductionDate,
            CompletedAt = completion.CompletedAt,
            DefectQty = completion.DefectQty,
            StopCount = completion.StopCount,
            AvailabilityRate = completion.AvailabilityRate,
            PerformanceRate = completion.PerformanceRate,
            QualityRate = completion.QualityRate,
            Oee = completion.Oee,
            OrderStatusUpdated = orderStatusUpdated,
            Duplicated = false,
        };
    }

    /// <summary>
    /// 依工廠日區間查詢完工實績(含明細)。
    /// 輸入:from / to(含端點,可為 null)、page、pageSize。
    /// 輸出:依 ProductionDate 再 CompletedAt 遞減的分頁清單;pageSize 夾到 1–500、page 最小 1。
    /// </summary>
    public async Task<IEnumerable<ProductionCompletionDto>> GetCompletionsAsync(
        DateOnly? from, DateOnly? to, int page, int pageSize)
    {
        var safePage = page < 1 ? 1 : page;
        var safePageSize = pageSize < 1 ? 1 : (pageSize > MaxPageSize ? MaxPageSize : pageSize);

        var query = _context.ProductionCompletions
            .AsNoTracking()
            .Include(c => c.Defects)
            .Include(c => c.Stops)
            .AsQueryable();

        if (from.HasValue) query = query.Where(c => c.ProductionDate >= from.Value);
        if (to.HasValue) query = query.Where(c => c.ProductionDate <= to.Value);

        var rows = await query
            .OrderByDescending(c => c.ProductionDate)
            .ThenByDescending(c => c.CompletedAt)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToListAsync();

        return rows.Select(ToDto).ToList();
    }

    /// <summary>
    /// 取單筆完工實績(含明細)。
    /// 輸入:id;輸出:對應 DTO,查無回 null。
    /// </summary>
    public async Task<ProductionCompletionDto?> GetCompletionAsync(Guid id)
    {
        var row = await _context.ProductionCompletions
            .AsNoTracking()
            .Include(c => c.Defects)
            .Include(c => c.Stops)
            .FirstOrDefaultAsync(c => c.Id == id);

        return row == null ? null : ToDto(row);
    }

    /// <summary>
    /// §6 輸入驗證表:一律先全部檢查再落地,任一失敗即回訊息且資料庫零寫入。
    /// 輸入:請求本體;輸出:第一個違反規則的正體中文訊息,全部通過回 null。
    /// </summary>
    private static string? Validate(ProductionCompletionRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.ClientRecordId)) return "用戶端紀錄編號不可為空";
        if (r.ClientRecordId.Trim().Length > MaxClientRecordIdLength) return "用戶端紀錄編號超過 64 字元";

        if ((r.OrderNumber?.Length ?? 0) > MaxOrderNumberLength) return "訂單編號超過 50 字元";
        if ((r.DeviceId?.Length ?? 0) > MaxDeviceIdLength) return "設備編號超過 50 字元";
        if ((r.Operator?.Length ?? 0) > MaxOperatorLength) return "操作員超過 100 字元";
        if ((r.Shift?.Length ?? 0) > MaxShiftLength) return "班別超過 20 字元";
        if ((r.ShortageReason?.Length ?? 0) > MaxShortageReasonLength) return "短缺原因超過 100 字元";

        if (r.GoodQty < 0) return "良品數不可為負";
        if (r.TargetQty < 0) return "目標數量不可為負";

        if (r.PrepTimeMinutes < 0) return "準備時間不可為負";
        if (r.RunTimeMinutes < 0) return "運轉時間不可為負";
        if (r.StopTimeMinutes < 0) return "停機時間不可為負";
        if (r.AvgSpeed < 0) return "平均車速不可為負";

        if ((r.Defects?.Count ?? 0) > MaxDetailRows) return "不良明細筆數超過上限 200";
        if ((r.Stops?.Count ?? 0) > MaxDetailRows) return "停機明細筆數超過上限 200";

        foreach (var d in r.Defects ?? new List<ProductionDefectRequest>())
        {
            if (d.Qty < 0) return "不良品數量不可為負";
            if ((d.Code?.Length ?? 0) > MaxReasonCodeLength) return "原因代碼超過 20 字元";
            if ((d.Reason?.Length ?? 0) > MaxReasonNameLength) return "原因名稱超過 100 字元";
        }

        foreach (var s in r.Stops ?? new List<ProductionStopRequest>())
        {
            if (s.DurationMinutes < 0) return "停機時長不可為負";
            if ((s.Code?.Length ?? 0) > MaxReasonCodeLength) return "原因代碼超過 20 字元";
            if ((s.Reason?.Length ?? 0) > MaxReasonNameLength) return "原因名稱超過 100 字元";
        }

        return null;
    }

    /// <summary>
    /// 組出驗證失敗的結果物件。
    /// 輸入:正體中文訊息;輸出:Success=false 的 DTO(控制器據此回 400)。
    /// </summary>
    private static ProductionCompletionResultDto Fail(string error) => new()
    {
        Success = false,
        Error = error,
    };

    /// <summary>
    /// 字串截斷 + null 正規化。
    /// 輸入:原字串(可為 null)、上限長度;輸出:非 null 且不超過上限的字串。
    /// </summary>
    private static string Truncate(string? value, int max)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        return value.Length <= max ? value : value[..max];
    }

    /// <summary>
    /// 把時間正規化為 UTC。
    /// 輸入:任意 Kind 的 DateTime;輸出:Kind = Utc 的 DateTime
    ///       (Local 依實際位移換算,Unspecified 直接視為 UTC —— JSON 已帶 Z 時 Kind 即為 Utc)。
    /// </summary>
    private static DateTime ToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };

    /// <summary>
    /// 實體投影成查詢 DTO(含兩張子表明細)。
    /// 輸入:ProductionCompletion 實體;輸出:ProductionCompletionDto。
    /// </summary>
    private static ProductionCompletionDto ToDto(ProductionCompletion c) => new()
    {
        Id = c.Id,
        ClientRecordId = c.ClientRecordId,
        OrderId = c.OrderId,
        OrderNumber = c.OrderNumber,
        DeviceId = c.DeviceId,
        Operator = c.Operator,
        Shift = c.Shift,
        TargetQty = c.TargetQty,
        GoodQty = c.GoodQty,
        DefectQty = c.DefectQty,
        PrepTimeMinutes = c.PrepTimeMinutes,
        RunTimeMinutes = c.RunTimeMinutes,
        StopTimeMinutes = c.StopTimeMinutes,
        StopCount = c.StopCount,
        AvgSpeed = c.AvgSpeed,
        AvailabilityRate = c.AvailabilityRate,
        PerformanceRate = c.PerformanceRate,
        QualityRate = c.QualityRate,
        Oee = c.Oee,
        ShortageReason = c.ShortageReason,
        CompletedAt = c.CompletedAt,
        ProductionDate = c.ProductionDate,
        CreatedAt = c.CreatedAt,
        Defects = c.Defects.Select(d => new ProductionDefectDto
        {
            Id = d.Id,
            Code = d.Code,
            Reason = d.Reason,
            Qty = d.Qty,
        }).ToList(),
        Stops = c.Stops.Select(s => new ProductionStopDto
        {
            Id = s.Id,
            Code = s.Code,
            Reason = s.Reason,
            StartedAt = s.StartedAt,
            DurationMinutes = s.DurationMinutes,
        }).ToList(),
    };
}
