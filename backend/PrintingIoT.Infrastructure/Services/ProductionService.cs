using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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

    // S8 §1.3:停機原因為空白時的歸類,與前端 groupStopReasonsByReason 一致
    private const string UncategorizedReason = "未分類";

    // S8 §1.4:彙總不分頁,故以列數上限取代截斷
    private const int DefaultMaxSummaryRows = 20000;
    private readonly int _maxSummaryRows;

    public ProductionService(
        PrintingContext context,
        IOrderService orderService,
        IFactoryTimeProvider factoryTime,
        ILogger<ProductionService> logger,
        IConfiguration? configuration = null)
    {
        _context = context;
        _orderService = orderService;
        _factoryTime = factoryTime;
        _logger = logger;

        // 用 indexer 而不是 GetValue<T>:後者在 Configuration.Binder 套件裡,Infrastructure 沒引用,
        // 為了一個設定值加相依不划算。設定不存在或值不合理時退回預設,
        // 不讓一個打錯的設定值把彙總鎖死。
        _maxSummaryRows = int.TryParse(configuration?["Production:SummaryMaxRows"], out var configured)
            && configured > 0
                ? configured
                : DefaultMaxSummaryRows;
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

    // ── S8:彙總查詢 ───────────────────────────────────────────────────────
    //
    // 三支端點共用同一條取數路徑,算術全部委由 OeeCalculator ——
    // 這是本輪的核心紀律:不在這裡自己寫任何一行率值公式,否則就成了第三份實作。

    /// <summary>
    /// S8 / §1.1:日報彙總。
    /// 輸入:工廠日區間(含端點)與班別;輸出:彙總結果,空區間為全 0 實例。
    /// 邏輯:率值一律以「區間總量」重算,不是把逐筆率值平均掉 ——
    ///       只有 avgOEE 例外,它依規則 6 以產量加權自逐筆 OEE 求得。
    /// </summary>
    public async Task<SummaryResultDto<DailySummaryDto>> GetDailySummaryAsync(
        DateOnly? from, DateOnly? to, string? shift)
    {
        var (rows, error) = await LoadForSummaryAsync(from, to, shift, includeStops: false);
        if (error != null) return SummaryResultDto<DailySummaryDto>.Fail(error);

        return SummaryResultDto<DailySummaryDto>.Ok(Aggregate(rows!));
    }

    /// <summary>
    /// S8 / §1.2:月報彙總。
    /// 輸入同上;輸出:DailyRows 依工廠日遞增,加上整月 Totals。
    /// 邏輯:每日一列以「當日彙總數據」重算 OEE 與稼動率,Totals 以「整月彙總數據」重算 ——
    ///       兩層都不是把下一層的率值平均掉(S3 GAP-05 的裁決)。
    /// </summary>
    public async Task<SummaryResultDto<MonthlySummaryDto>> GetMonthlySummaryAsync(
        DateOnly? from, DateOnly? to, string? shift)
    {
        var (rows, error) = await LoadForSummaryAsync(from, to, shift, includeStops: false);
        if (error != null) return SummaryResultDto<MonthlySummaryDto>.Fail(error);

        var dailyRows = rows!
            .GroupBy(c => c.ProductionDate)
            .OrderBy(g => g.Key)
            .Select(g => BuildRow(g.Key.ToString("yyyy-MM-dd"), g.ToList()))
            .ToList();

        return SummaryResultDto<MonthlySummaryDto>.Ok(new MonthlySummaryDto
        {
            DailyRows = dailyRows,
            // 總計拿「全部完工列」重算,而不是把 dailyRows 的率值再平均一次
            Totals = BuildRow(string.Empty, rows!),
        });
    }

    /// <summary>
    /// S8 / §1.3:停機原因彙總。
    /// 輸入同上;輸出:每個原因一項,依次數遞減(同次數時依總時長遞減,讓排序穩定)。
    /// 邏輯:原因為空白者歸入「未分類」,與前端 groupStopReasonsByReason 的既有行為一致。
    ///       Code 取該原因第一筆非空的代碼 —— 快照可能因主檔改版而不一致,以先出現者為準。
    /// </summary>
    public async Task<SummaryResultDto<List<StopReasonSummaryDto>>> GetStopReasonSummaryAsync(
        DateOnly? from, DateOnly? to, string? shift)
    {
        var (rows, error) = await LoadForSummaryAsync(from, to, shift, includeStops: true);
        if (error != null) return SummaryResultDto<List<StopReasonSummaryDto>>.Fail(error);

        var summary = rows!
            .SelectMany(c => c.Stops)
            .GroupBy(s => string.IsNullOrWhiteSpace(s.Reason) ? UncategorizedReason : s.Reason)
            .Select(g => new StopReasonSummaryDto
            {
                Reason = g.Key,
                Code = g.FirstOrDefault(s => !string.IsNullOrWhiteSpace(s.Code))?.Code ?? string.Empty,
                Count = g.Count(),
                TotalDurationMinutes = OeeCalculator.Round1(g.Sum(s => Math.Max(0m, s.DurationMinutes))),
            })
            .OrderByDescending(x => x.Count)
            .ThenByDescending(x => x.TotalDurationMinutes)
            .ToList();

        return SummaryResultDto<List<StopReasonSummaryDto>>.Ok(summary);
    }

    /// <summary>
    /// 取出彙總所需的完工列。
    /// 輸入:工廠日區間、班別、是否需要停機明細。
    /// 輸出:(列, null) 或 (null, 錯誤訊息);超過 MaxSummaryRows 時回錯誤而不是截斷。
    /// 邏輯:先 Count 再取,避免把超量資料整批載進記憶體才發現太多。
    ///       班別以 ToUpper() 比對達成不分大小寫,Npgsql 與 InMemory 都翻譯得出來。
    /// </summary>
    private async Task<(List<ProductionCompletion>? Rows, string? Error)> LoadForSummaryAsync(
        DateOnly? from, DateOnly? to, string? shift, bool includeStops)
    {
        var query = _context.ProductionCompletions.AsNoTracking().AsQueryable();

        if (from.HasValue) query = query.Where(c => c.ProductionDate >= from.Value);
        if (to.HasValue) query = query.Where(c => c.ProductionDate <= to.Value);

        if (!string.IsNullOrWhiteSpace(shift))
        {
            var normalized = shift.Trim().ToUpperInvariant();
            query = query.Where(c => c.Shift.ToUpper() == normalized);
        }

        var total = await query.CountAsync();
        if (total > _maxSummaryRows)
            return (null, $"區間內有 {total} 筆完工實績,超過彙總上限 {_maxSummaryRows} 筆,請縮小查詢區間。");

        if (includeStops) query = query.Include(c => c.Stops);

        return (await query.ToListAsync(), null);
    }

    /// <summary>
    /// 把一組完工列彙總成日報結果。
    /// 輸入:完工列(可為空);輸出:DailySummaryDto,空清單回全 0。
    /// </summary>
    private static DailySummaryDto Aggregate(List<ProductionCompletion> rows)
    {
        var totalGood = rows.Sum(c => (long)c.GoodQty);
        var totalDefect = rows.Sum(c => (long)c.DefectQty);
        var totalTarget = rows.Sum(c => (long)c.TargetQty);
        var totalRun = rows.Sum(c => c.RunTimeMinutes);
        var totalStop = rows.Sum(c => c.StopTimeMinutes);
        var totalPrep = rows.Sum(c => c.PrepTimeMinutes);

        return new DailySummaryDto
        {
            TotalOrders = rows.Count,
            TotalTarget = ToInt(totalTarget),
            TotalGood = ToInt(totalGood),
            TotalDefect = ToInt(totalDefect),
            AvgYieldRate = OeeCalculator.YieldRate(totalGood, totalDefect),
            AvgAchievementRate = OeeCalculator.AchievementRate(totalGood, totalTarget),
            TotalRunTime = OeeCalculator.Round1(totalRun),
            TotalStopTime = OeeCalculator.Round1(totalStop),
            TotalPrepTime = OeeCalculator.Round1(totalPrep),
            TotalStopCount = rows.Sum(c => c.StopCount),
            // 規則 6:依產量加權,不是算術平均 —— 算術平均會讓 10 張小單稀釋掉 1 張大單
            AvgOEE = OeeCalculator.WeightedAverageOee(rows.Select(c => (c.Oee, c.GoodQty + c.DefectQty))),
            Utilization = OeeCalculator.Utilization(totalRun, totalStop, 0m),
        };
    }

    /// <summary>
    /// 把一組完工列彙總成月報的一列(也用於整月總計)。
    /// 輸入:該列的日期標籤(總計列傳空字串)、該層級的完工列。
    /// 輸出:MonthlyDailyRowDto;oee 與 utilizationRate 以本層級的彙總數據重算。
    /// </summary>
    private static MonthlyDailyRowDto BuildRow(string date, List<ProductionCompletion> rows)
    {
        var good = rows.Sum(c => (long)c.GoodQty);
        var defect = rows.Sum(c => (long)c.DefectQty);
        var target = rows.Sum(c => (long)c.TargetQty);
        var run = rows.Sum(c => c.RunTimeMinutes);
        var stop = rows.Sum(c => c.StopTimeMinutes);
        var prep = rows.Sum(c => c.PrepTimeMinutes);

        var oee = OeeCalculator.Calculate(run, stop, prep, ToInt(good), ToInt(defect), ToInt(target));

        return new MonthlyDailyRowDto
        {
            Date = date,
            OrderCount = rows.Count,
            TotalQty = ToInt(good + defect),
            GoodQty = ToInt(good),
            DefectQty = ToInt(defect),
            TargetQty = ToInt(target),
            YieldRate = OeeCalculator.YieldRate(good, defect),
            AvgSpeed = rows.Count == 0 ? 0m : OeeCalculator.Round1(rows.Average(c => c.AvgSpeed)),
            RunTime = OeeCalculator.Round1(run),
            StopTime = OeeCalculator.Round1(stop),
            PrepTime = OeeCalculator.Round1(prep),
            UtilizationRate = OeeCalculator.Utilization(run, stop, prep),
            Oee = oee.Oee,
        };
    }

    /// <summary>
    /// 把加總後的 long 夾回 int。
    /// 輸入:任意 long;輸出:超出 int 範圍時夾到 int.MaxValue / MinValue,不 overflow 成負數。
    /// 現實資料不會走到這裡,但溢位造成的負數量會讓報表無聲說謊,寧可夾住。
    /// </summary>
    private static int ToInt(long value) =>
        value > int.MaxValue ? int.MaxValue : (value < int.MinValue ? int.MinValue : (int)value);
}
