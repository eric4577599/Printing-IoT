using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Services;
using PrintingIoT.Infrastructure.Data;
using System.Net;
using System.Text.Json;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// S8:三支彙總端點的整合測試(AC-01 ~ AC-11)。
/// 以獨立的 InMemory 資料庫跑真實 HTTP 管線,不連任何真實資料庫。
///
/// 這組測試的核心不是「端點會不會回 200」,而是**彙總的口徑對不對** ——
/// 加權平均不可退化成算術平均、率值必須由彙總量重算而不是把逐筆率值平均掉。
/// 因此多數測試都刻意造出「兩種算法會分岔」的資料,再斷言拿到的是正確的那一個。
/// </summary>
public class ProductionSummaryControllerTests : IDisposable
{
    private readonly List<WebApplicationFactory<Program>> _factories = new();

    /// <summary>
    /// 建立一個帶獨立 InMemory 資料庫的測試工廠。
    /// 輸入:dbName 資料庫名稱、maxSummaryRows 彙總列數上限(null 用預設)。
    /// 輸出:已帶 ADMIN 權杖的 HttpClient 與該工廠。
    /// </summary>
    private (HttpClient client, WebApplicationFactory<Program> factory) CreateApp(
        string dbName, int? maxSummaryRows = null)
    {
        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("environment", "Testing");
            builder.UseSetting("Factory:TimeZone", "Asia/Taipei");
            builder.UseSetting("Factory:DayBoundaryHour", "8");

            if (maxSummaryRows.HasValue)
                builder.UseSetting("Production:SummaryMaxRows", maxSummaryRows.Value.ToString());

            builder.ConfigureServices(services =>
            {
                var descriptors = services.Where(
                    d => d.ServiceType == typeof(DbContextOptions<PrintingContext>) ||
                         d.ServiceType == typeof(DbContextOptions) ||
                         d.ServiceType == typeof(PrintingContext)).ToList();

                foreach (var d in descriptors) services.Remove(d);

                services.AddDbContext<PrintingContext>(options => options.UseInMemoryDatabase(dbName));
            });
        });

        _factories.Add(factory);

        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);
        return (client, factory);
    }

    /// <summary>
    /// 把完工列寫進測試資料庫。
    /// 輸入:工廠、要落地的列;輸出:無。
    /// </summary>
    private static void Seed(WebApplicationFactory<Program> factory, params ProductionCompletion[] rows)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PrintingContext>();
        context.ProductionCompletions.AddRange(rows);
        context.SaveChanges();
    }

    /// <summary>
    /// 造一筆完工實績。四個率值一律由 OeeCalculator 算出,不手寫 ——
    /// 手寫期望值等於在測試裡複製一份公式,那正是本輪要消滅的東西。
    /// 輸入:工廠日、班別、目標 / 良品 / 不良品、運轉 / 停機 / 準備時間、車速、停機明細。
    /// 輸出:已填好率值的實體。
    /// </summary>
    private static ProductionCompletion Row(
        string productionDate, string shift,
        int target, int good, int defect,
        decimal run, decimal stop, decimal prep,
        decimal avgSpeed = 100m,
        params (string code, string reason, decimal minutes)[] stops)
    {
        var oee = OeeCalculator.Calculate(run, stop, prep, good, defect, target);

        return new ProductionCompletion
        {
            ClientRecordId = Guid.NewGuid().ToString("N"),
            OrderNumber = "WO-" + Guid.NewGuid().ToString("N")[..6],
            Shift = shift,
            TargetQty = target,
            GoodQty = good,
            DefectQty = defect,
            RunTimeMinutes = run,
            StopTimeMinutes = stop,
            PrepTimeMinutes = prep,
            StopCount = stops.Length,
            AvgSpeed = avgSpeed,
            AvailabilityRate = oee.Availability,
            PerformanceRate = oee.Performance,
            QualityRate = oee.Quality,
            Oee = oee.Oee,
            CompletedAt = DateTime.SpecifyKind(DateTime.Parse(productionDate + "T10:00:00"), DateTimeKind.Utc),
            ProductionDate = DateOnly.Parse(productionDate),
            Stops = stops.Select(s => new ProductionStop
            {
                Code = s.code,
                Reason = s.reason,
                DurationMinutes = s.minutes,
            }).ToList(),
        };
    }

    /// <summary>讀回應本體並解析為 JsonElement。</summary>
    private static async Task<JsonElement> ReadJson(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(body).RootElement.Clone();
    }

    // ── AC-01 ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-01 空區間回全 0 的彙總物件,不是 404")]
    public async Task DailySummary_EmptyRange_ReturnsZeroedObject()
    {
        var (client, _) = CreateApp("Summary-Empty-" + Guid.NewGuid());

        var response = await client.GetAsync("/api/production/summary/daily?from=2026-01-01&to=2026-01-31");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJson(response);
        Assert.Equal(0, json.GetProperty("totalOrders").GetInt32());
        Assert.Equal(0m, json.GetProperty("avgOEE").GetDecimal());
        Assert.Equal(0m, json.GetProperty("avgYieldRate").GetDecimal());
        Assert.Equal(0m, json.GetProperty("utilization").GetDecimal());
    }

    // ── AC-02 ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-02 avgOEE 依產量加權,不是算術平均")]
    public async Task DailySummary_AvgOee_IsWeightedNotArithmetic()
    {
        var db = "Summary-Weighted-" + Guid.NewGuid();
        var (client, factory) = CreateApp(db);

        // 一張大單高 OEE、一張小單低 OEE:算術平均會被小單嚴重拉低,加權則不會
        var big = Row("2026-03-02", "A", target: 1000, good: 1000, defect: 0, run: 100, stop: 0, prep: 0);
        var small = Row("2026-03-02", "A", target: 100, good: 5, defect: 5, run: 10, stop: 90, prep: 0);
        Seed(factory, big, small);

        var json = await ReadJson(await client.GetAsync("/api/production/summary/daily?from=2026-03-02&to=2026-03-02"));

        var expectedWeighted = OeeCalculator.WeightedAverageOee(new[]
        {
            (big.Oee, big.GoodQty + big.DefectQty),
            (small.Oee, small.GoodQty + small.DefectQty),
        });
        var arithmetic = OeeCalculator.Round1((big.Oee + small.Oee) / 2m);

        // 前提:這組資料真的能分辨兩種算法,否則本測試等於沒驗
        Assert.NotEqual(arithmetic, expectedWeighted);
        Assert.Equal(expectedWeighted, json.GetProperty("avgOEE").GetDecimal());
    }

    // ── AC-03 ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-03 avgYieldRate 以區間總量重算,不是逐筆良率的平均")]
    public async Task DailySummary_YieldRate_RecomputedFromTotals()
    {
        var db = "Summary-Yield-" + Guid.NewGuid();
        var (client, factory) = CreateApp(db);

        // 良率 90% 的大單 + 良率 10% 的小單:逐筆平均是 50%,總量重算約 89.2%
        Seed(factory,
            Row("2026-03-03", "A", target: 1000, good: 900, defect: 100, run: 100, stop: 0, prep: 0),
            Row("2026-03-03", "A", target: 10, good: 1, defect: 9, run: 10, stop: 0, prep: 0));

        var json = await ReadJson(await client.GetAsync("/api/production/summary/daily?from=2026-03-03&to=2026-03-03"));

        var expected = OeeCalculator.YieldRate(901, 109);
        Assert.NotEqual(50m, expected);
        Assert.Equal(expected, json.GetProperty("avgYieldRate").GetDecimal());
        Assert.Equal(901, json.GetProperty("totalGood").GetInt32());
        Assert.Equal(109, json.GetProperty("totalDefect").GetInt32());
    }

    // ── AC-04 ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-04 shift 過濾不分大小寫")]
    public async Task DailySummary_ShiftFilter_IsCaseInsensitive()
    {
        var db = "Summary-Shift-" + Guid.NewGuid();
        var (client, factory) = CreateApp(db);

        Seed(factory,
            Row("2026-03-04", "A", target: 100, good: 100, defect: 0, run: 60, stop: 0, prep: 0),
            Row("2026-03-04", "B", target: 200, good: 200, defect: 0, run: 60, stop: 0, prep: 0));

        var upper = await ReadJson(await client.GetAsync("/api/production/summary/daily?from=2026-03-04&to=2026-03-04&shift=A"));
        var lower = await ReadJson(await client.GetAsync("/api/production/summary/daily?from=2026-03-04&to=2026-03-04&shift=a"));

        Assert.Equal(1, upper.GetProperty("totalOrders").GetInt32());
        Assert.Equal(100, upper.GetProperty("totalGood").GetInt32());

        // 大小寫不同必須取到完全同一組,否則現場輸入 a 與 A 會看到兩份數字
        Assert.Equal(upper.GetProperty("totalOrders").GetInt32(), lower.GetProperty("totalOrders").GetInt32());
        Assert.Equal(upper.GetProperty("totalGood").GetInt32(), lower.GetProperty("totalGood").GetInt32());
    }

    // ── AC-05 / AC-06 ─────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-05 月報每日一列依日期遞增,oee 由當日彙總重算而非逐筆平均")]
    public async Task MonthlySummary_DailyRows_RecomputeOeeFromDayTotals()
    {
        var db = "Summary-Monthly-" + Guid.NewGuid();
        var (client, factory) = CreateApp(db);

        var a1 = Row("2026-03-06", "A", target: 1000, good: 1000, defect: 0, run: 100, stop: 0, prep: 0);
        var a2 = Row("2026-03-06", "A", target: 100, good: 5, defect: 5, run: 10, stop: 90, prep: 0);
        var b1 = Row("2026-03-05", "A", target: 500, good: 450, defect: 50, run: 80, stop: 20, prep: 10);
        Seed(factory, a1, a2, b1);

        var json = await ReadJson(await client.GetAsync("/api/production/summary/monthly?from=2026-03-01&to=2026-03-31"));

        var rows = json.GetProperty("dailyRows").EnumerateArray().ToList();
        Assert.Equal(2, rows.Count);
        Assert.Equal("2026-03-05", rows[0].GetProperty("date").GetString());
        Assert.Equal("2026-03-06", rows[1].GetProperty("date").GetString());

        // 3/6 那列:拿當日彙總數據重算,而不是把 a1 / a2 的 oee 平均掉
        var expected = OeeCalculator.Calculate(110m, 90m, 0m, 1005, 5, 1100).Oee;
        var arithmetic = OeeCalculator.Round1((a1.Oee + a2.Oee) / 2m);

        Assert.NotEqual(arithmetic, expected);
        Assert.Equal(expected, rows[1].GetProperty("oee").GetDecimal());
        Assert.Equal(2, rows[1].GetProperty("orderCount").GetInt32());
    }

    [Fact(DisplayName = "AC-06 月報 totals 由整月彙總重算")]
    public async Task MonthlySummary_Totals_RecomputedFromWholeRange()
    {
        var db = "Summary-Totals-" + Guid.NewGuid();
        var (client, factory) = CreateApp(db);

        Seed(factory,
            Row("2026-04-01", "A", target: 1000, good: 900, defect: 100, run: 100, stop: 20, prep: 10),
            Row("2026-04-02", "A", target: 500, good: 400, defect: 50, run: 60, stop: 40, prep: 5));

        var json = await ReadJson(await client.GetAsync("/api/production/summary/monthly?from=2026-04-01&to=2026-04-30"));
        var totals = json.GetProperty("totals");

        var expected = OeeCalculator.Calculate(160m, 60m, 15m, 1300, 150, 1500);

        Assert.Equal(expected.Oee, totals.GetProperty("oee").GetDecimal());
        Assert.Equal(1300, totals.GetProperty("goodQty").GetInt32());
        Assert.Equal(150, totals.GetProperty("defectQty").GetInt32());
        Assert.Equal(1450, totals.GetProperty("totalQty").GetInt32());
        Assert.Equal(2, totals.GetProperty("orderCount").GetInt32());
        Assert.Equal(OeeCalculator.Utilization(160m, 60m, 15m), totals.GetProperty("utilizationRate").GetDecimal());
    }

    // ── AC-07 ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-07 停機原因依次數遞減,空原因歸入未分類")]
    public async Task StopReasonSummary_SortedByCount_BlankReasonIsUncategorized()
    {
        var db = "Summary-Stops-" + Guid.NewGuid();
        var (client, factory) = CreateApp(db);

        Seed(factory,
            Row("2026-05-01", "A", 100, 100, 0, 60, 30, 0, 100m,
                ("ST01", "換版", 10m), ("ST01", "換版", 12m), ("", "  ", 5m)),
            Row("2026-05-01", "A", 100, 100, 0, 60, 30, 0, 100m,
                ("ST01", "換版", 8m), ("ST02", "斷紙", 20m)));

        var json = await ReadJson(await client.GetAsync("/api/production/summary/stop-reasons?from=2026-05-01&to=2026-05-01"));
        var items = json.EnumerateArray().ToList();

        Assert.Equal(3, items.Count);

        // 換版 3 次排第一
        Assert.Equal("換版", items[0].GetProperty("reason").GetString());
        Assert.Equal(3, items[0].GetProperty("count").GetInt32());
        Assert.Equal(30m, items[0].GetProperty("totalDurationMinutes").GetDecimal());
        Assert.Equal("ST01", items[0].GetProperty("code").GetString());

        // 其餘兩項各 1 次,依總時長遞減 → 斷紙(20)在未分類(5)之前
        Assert.Equal("斷紙", items[1].GetProperty("reason").GetString());
        Assert.Equal("未分類", items[2].GetProperty("reason").GetString());
        Assert.Equal(5m, items[2].GetProperty("totalDurationMinutes").GetDecimal());
    }

    [Fact(DisplayName = "AC-07b 停機原因彙總不含下鑽明細")]
    public async Task StopReasonSummary_DoesNotIncludeDrilldownRecords()
    {
        var db = "Summary-NoDrill-" + Guid.NewGuid();
        var (client, factory) = CreateApp(db);

        Seed(factory, Row("2026-05-02", "A", 100, 100, 0, 60, 30, 0, 100m, ("ST01", "換版", 10m)));

        var body = await (await client.GetAsync("/api/production/summary/stop-reasons?from=2026-05-02&to=2026-05-02")).Content.ReadAsStringAsync();

        // 回應大小必須與區間內的訂單數無關,所以不得帶出任何訂單欄位
        Assert.DoesNotContain("records", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("orderNumber", body, StringComparison.OrdinalIgnoreCase);
    }

    // ── AC-08 ─────────────────────────────────────────────────────────────

    [Theory(DisplayName = "AC-08 日期格式不合法一律回 400")]
    [InlineData("/api/production/summary/daily?from=not-a-date")]
    [InlineData("/api/production/summary/daily?to=2026-13-45")]
    [InlineData("/api/production/summary/monthly?from=not-a-date")]
    [InlineData("/api/production/summary/stop-reasons?to=not-a-date")]
    public async Task Summaries_InvalidDate_ReturnBadRequest(string url)
    {
        var (client, _) = CreateApp("Summary-BadDate-" + Guid.NewGuid());

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── AC-09 ─────────────────────────────────────────────────────────────

    [Theory(DisplayName = "AC-09 未帶權杖一律回 401")]
    [InlineData("/api/production/summary/daily")]
    [InlineData("/api/production/summary/monthly")]
    [InlineData("/api/production/summary/stop-reasons")]
    public async Task Summaries_WithoutToken_ReturnUnauthorized(string url)
    {
        var (client, _) = CreateApp("Summary-NoAuth-" + Guid.NewGuid());
        client.DefaultRequestHeaders.Authorization = null;

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── AC-10 ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-10 超過列數上限回 400 並說明,不回部分結果")]
    public async Task Summaries_OverRowLimit_ReturnBadRequestNotPartialData()
    {
        var db = "Summary-Limit-" + Guid.NewGuid();
        var (client, factory) = CreateApp(db, maxSummaryRows: 2);

        Seed(factory,
            Row("2026-06-01", "A", 100, 100, 0, 60, 0, 0),
            Row("2026-06-01", "A", 100, 100, 0, 60, 0, 0),
            Row("2026-06-01", "A", 100, 100, 0, 60, 0, 0));

        var response = await client.GetAsync("/api/production/summary/daily?from=2026-06-01&to=2026-06-01");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        // 必須說得出「為什麼」與「怎麼辦」,不能只回一個空的 400
        Assert.Contains("3", body);
        Assert.Contains("縮小", body);
        // 不得夾帶任何部分彙總結果
        Assert.DoesNotContain("totalGood", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact(DisplayName = "AC-10b 剛好等於上限時正常回傳")]
    public async Task Summaries_AtRowLimit_Succeeds()
    {
        var db = "Summary-AtLimit-" + Guid.NewGuid();
        var (client, factory) = CreateApp(db, maxSummaryRows: 2);

        Seed(factory,
            Row("2026-06-02", "A", 100, 100, 0, 60, 0, 0),
            Row("2026-06-02", "A", 100, 100, 0, 60, 0, 0));

        var response = await client.GetAsync("/api/production/summary/daily?from=2026-06-02&to=2026-06-02");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await ReadJson(response)).GetProperty("totalOrders").GetInt32());
    }

    // ── AC-11 ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-11 區間過濾與分組依工廠日,不依 CompletedAt")]
    public async Task Summaries_FilterAndGroupByProductionDate_NotCompletedAt()
    {
        var db = "Summary-FactoryDay-" + Guid.NewGuid();
        var (client, factory) = CreateApp(db);

        // 同一個工廠日,但 CompletedAt 分別落在 UTC 的前一天深夜與當天早上。
        // 工廠日界是 08:00(Asia/Taipei),兩筆都屬於 2026-07-10 這個工廠日。
        var late = Row("2026-07-10", "A", 100, 100, 0, 60, 0, 0);
        late.CompletedAt = DateTime.SpecifyKind(DateTime.Parse("2026-07-09T23:30:00"), DateTimeKind.Utc);

        var early = Row("2026-07-10", "A", 100, 100, 0, 60, 0, 0);
        early.CompletedAt = DateTime.SpecifyKind(DateTime.Parse("2026-07-10T02:15:00"), DateTimeKind.Utc);

        // 對照組:工廠日在區間外,即使 CompletedAt 落在區間內也不得被算進來
        var outside = Row("2026-07-11", "A", 500, 500, 0, 60, 0, 0);
        outside.CompletedAt = DateTime.SpecifyKind(DateTime.Parse("2026-07-10T20:00:00"), DateTimeKind.Utc);

        Seed(factory, late, early, outside);

        var json = await ReadJson(await client.GetAsync("/api/production/summary/monthly?from=2026-07-10&to=2026-07-10"));
        var rows = json.GetProperty("dailyRows").EnumerateArray().ToList();

        Assert.Single(rows);
        Assert.Equal("2026-07-10", rows[0].GetProperty("date").GetString());
        Assert.Equal(2, rows[0].GetProperty("orderCount").GetInt32());
        Assert.Equal(200, rows[0].GetProperty("goodQty").GetInt32());
    }

    public void Dispose()
    {
        foreach (var factory in _factories) factory.Dispose();
        GC.SuppressFinalize(this);
    }
}
