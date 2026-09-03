using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Core.Services;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Infrastructure.Services;

namespace PrintingIoT.Tests.Services;

/// <summary>
/// ProductionService 單元測試(S3 / F2,對應 AC-03、AC-04、AC-05、AC-09)。
/// 以 InMemory 資料庫 + Moq 的 IOrderService 執行,不連任何真實資料庫。
/// </summary>
public class ProductionServiceTests : IDisposable
{
    private readonly PrintingContext _context;
    private readonly Mock<IOrderService> _orderService;
    private readonly ProductionService _service;

    public ProductionServiceTests()
    {
        var options = new DbContextOptionsBuilder<PrintingContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new PrintingContext(options);
        _orderService = new Mock<IOrderService>();

        _service = new ProductionService(
            _context,
            _orderService.Object,
            new FixedFactoryTimeProvider(),
            new Mock<ILogger<ProductionService>>().Object);
    }

    /// <summary>
    /// 測試用的工廠時間提供者:固定 UTC+08:00、日界 8,不依賴執行機器是否有 tzdata。
    /// </summary>
    private sealed class FixedFactoryTimeProvider : IFactoryTimeProvider
    {
        private readonly TimeZoneInfo _tz = TimeZoneInfo.CreateCustomTimeZone(
            "Test-UTC+8", TimeSpan.FromHours(8), "Test-UTC+8", "Test-UTC+8");

        public string TimeZoneId => "Test-UTC+8";
        public int DayBoundaryHour => 8;

        public DateOnly ResolveProductionDate(DateTime completedAtUtc)
            => FactoryDayCalculator.Resolve(completedAtUtc, _tz, DayBoundaryHour);
    }

    /// <summary>
    /// 組出一份合法的完工實績請求。
    /// 輸入:clientRecordId 冪等鍵、orderId 可選的工單 Id。
    /// 輸出:通過 §6 驗證的請求本體(含一筆不良、一筆停機明細)。
    /// </summary>
    private static ProductionCompletionRequest MakeRequest(string clientRecordId = "REC-001", Guid? orderId = null) => new()
    {
        ClientRecordId = clientRecordId,
        OrderId = orderId,
        OrderNumber = "ORD-2026-000123",
        DeviceId = "MACHINE_01",
        Operator = "王小明",
        Shift = "C",
        TargetQty = 5000,
        GoodQty = 4820,
        PrepTimeMinutes = 12.5m,
        RunTimeMinutes = 96m,
        StopTimeMinutes = 18m,
        AvgSpeed = 52m,
        ShortageReason = string.Empty,
        CompletedAt = new DateTime(2026, 9, 3, 16, 41, 12, DateTimeKind.Utc),
        Defects = new List<ProductionDefectRequest>
        {
            new() { Code = "A01", Reason = "壓扁", Qty = 120 },
        },
        Stops = new List<ProductionStopRequest>
        {
            new() { Code = "001", Reason = "送紙歪斜", StartedAt = new DateTime(2026, 9, 3, 23, 10, 0, DateTimeKind.Utc), DurationMinutes = 6.5m },
        },
    };

    // AC-03:orderId 指向存在的工單 → UpdateStatusAsync 真的被以 Completed 呼叫,回應 orderStatusUpdated = true
    [Fact]
    public async Task RecordCompletion_WithExistingOrder_UpdatesOrderStatusToCompleted()
    {
        var orderId = Guid.NewGuid();
        _orderService
            .Setup(s => s.UpdateStatusAsync(orderId, OrderStatus.Completed))
            .ReturnsAsync(true);

        var result = await _service.RecordCompletionAsync(MakeRequest(orderId: orderId));

        Assert.True(result.Success);
        Assert.True(result.OrderStatusUpdated);
        _orderService.Verify(s => s.UpdateStatusAsync(orderId, OrderStatus.Completed), Times.Once);
    }

    // AC-03 補強:UpdateStatusAsync 會設 CompletedAt —— 以真實 OrderService 驗證狀態與時間都落地
    [Fact]
    public async Task RecordCompletion_WithRealOrderService_SetsStatusAndCompletedAt()
    {
        var order = new Order { OrderNumber = "ORD-REAL", CustomerName = "客戶A", Quantity = 5000 };
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var realOrderService = new OrderService(_context, new Mock<ILogger<OrderService>>().Object);
        var service = new ProductionService(
            _context, realOrderService, new FixedFactoryTimeProvider(),
            new Mock<ILogger<ProductionService>>().Object);

        var result = await service.RecordCompletionAsync(MakeRequest("REC-REAL", order.Id));

        Assert.True(result.OrderStatusUpdated);

        var reloaded = await _context.Orders.SingleAsync(o => o.Id == order.Id);
        Assert.Equal(OrderStatus.Completed, reloaded.Status);
        Assert.NotNull(reloaded.CompletedAt);
    }

    // AC-04:orderId 指向不存在的工單 → 實績照常落地、orderStatusUpdated = false、不拋例外
    [Fact]
    public async Task RecordCompletion_WithMissingOrder_StillPersistsCompletion()
    {
        var orderId = Guid.NewGuid();
        _orderService
            .Setup(s => s.UpdateStatusAsync(orderId, OrderStatus.Completed))
            .ReturnsAsync(false);

        var result = await _service.RecordCompletionAsync(MakeRequest(orderId: orderId));

        Assert.True(result.Success);
        Assert.False(result.OrderStatusUpdated);
        Assert.Equal(1, await _context.ProductionCompletions.CountAsync());
    }

    // AC-04 補強:UpdateStatusAsync 拋例外時實績已落地不回滾
    [Fact]
    public async Task RecordCompletion_WhenOrderUpdateThrows_CompletionStillPersisted()
    {
        var orderId = Guid.NewGuid();
        _orderService
            .Setup(s => s.UpdateStatusAsync(orderId, OrderStatus.Completed))
            .ThrowsAsync(new InvalidOperationException("資料庫連線中斷"));

        var result = await _service.RecordCompletionAsync(MakeRequest(orderId: orderId));

        Assert.True(result.Success);
        Assert.False(result.OrderStatusUpdated);
        Assert.Equal(1, await _context.ProductionCompletions.CountAsync());
    }

    // AC-05:DefectQty / StopCount 一律由後端重算,請求另外帶不一致的值也不採信
    [Fact]
    public async Task RecordCompletion_RecalculatesDefectQtyAndStopCount()
    {
        var request = MakeRequest();
        request.Defects = new List<ProductionDefectRequest>
        {
            new() { Code = "A01", Reason = "壓扁", Qty = 70 },
            new() { Code = "A02", Reason = "印刷不良", Qty = 50 },
        };
        request.Stops = new List<ProductionStopRequest>
        {
            new() { Code = "001", Reason = "送紙歪斜", DurationMinutes = 3m },
            new() { Code = "005", Reason = "機械故障", DurationMinutes = 4m },
            new() { Code = "006", Reason = "其他", DurationMinutes = 1m },
        };

        var result = await _service.RecordCompletionAsync(request);

        Assert.Equal(120, result.DefectQty);   // 70 + 50
        Assert.Equal(3, result.StopCount);     // 三筆停機明細

        var row = await _context.ProductionCompletions.SingleAsync();
        Assert.Equal(120, row.DefectQty);
        Assert.Equal(3, row.StopCount);
    }

    // AC-05 補強:四個率值也由後端算,數值與 OeeCalculator(AC-10)一致
    [Fact]
    public async Task RecordCompletion_ComputesRatesWithOeeCalculator()
    {
        var result = await _service.RecordCompletionAsync(MakeRequest());

        Assert.Equal(94.6m, result.AvailabilityRate);
        Assert.Equal(96.4m, result.PerformanceRate);
        Assert.Equal(97.6m, result.QualityRate);
        Assert.Equal(89.0m, result.Oee);
    }

    // AC-05 補強:工廠日由後端算 —— UTC 16:41 = 台北 00:41,日界 8 → 前一日
    [Fact]
    public async Task RecordCompletion_ResolvesProductionDateWithFactoryDayRule()
    {
        var result = await _service.RecordCompletionAsync(MakeRequest());

        Assert.Equal(new DateOnly(2026, 9, 3), result.ProductionDate);
        Assert.Equal(new DateOnly(2026, 9, 3), (await _context.ProductionCompletions.SingleAsync()).ProductionDate);
    }

    // AC-09:刪除工單後,原本關聯的實績列仍存在且 OrderNumber 可讀
    [Fact]
    public async Task DeletingOrder_KeepsCompletionRow()
    {
        var order = new Order { OrderNumber = "ORD-DELETE-ME", CustomerName = "客戶A" };
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var realOrderService = new OrderService(_context, new Mock<ILogger<OrderService>>().Object);
        var service = new ProductionService(
            _context, realOrderService, new FixedFactoryTimeProvider(),
            new Mock<ILogger<ProductionService>>().Object);

        await service.RecordCompletionAsync(MakeRequest("REC-KEEP", order.Id));

        Assert.True(await realOrderService.DeleteOrderAsync(order.Id));
        Assert.Equal(0, await _context.Orders.CountAsync());

        var completion = await _context.ProductionCompletions.SingleAsync();
        Assert.Equal("ORD-2026-000123", completion.OrderNumber);   // 冗餘保存的單號仍可追溯
        Assert.Equal(order.Id, completion.OrderId);
    }

    // 冪等(服務層):同一 ClientRecordId 連送兩次只有一列,子表不重複
    [Fact]
    public async Task RecordCompletion_SameClientRecordIdTwice_IsIdempotent()
    {
        var first = await _service.RecordCompletionAsync(MakeRequest("REC-IDEMPOTENT"));
        var second = await _service.RecordCompletionAsync(MakeRequest("REC-IDEMPOTENT"));

        Assert.False(first.Duplicated);
        Assert.True(second.Duplicated);
        Assert.Equal(first.Id, second.Id);

        Assert.Equal(1, await _context.ProductionCompletions.CountAsync());
        Assert.Equal(1, await _context.ProductionDefects.CountAsync());
        Assert.Equal(1, await _context.ProductionStops.CountAsync());
    }

    // §8:stops 為空但 stopTimeMinutes > 0 → 照實落地,不補假明細
    [Fact]
    public async Task RecordCompletion_NoStopDetailsButStopTime_KeepsStopCountZero()
    {
        var request = MakeRequest("REC-NOSTOPS");
        request.Stops = new List<ProductionStopRequest>();

        var result = await _service.RecordCompletionAsync(request);

        Assert.Equal(0, result.StopCount);
        Assert.Equal(18m, (await _context.ProductionCompletions.SingleAsync()).StopTimeMinutes);
    }

    // §8:completedAt 缺漏 → 以伺服器 UtcNow 為準,並在回應中回傳實際採用值
    [Fact]
    public async Task RecordCompletion_WithoutCompletedAt_UsesServerUtcNow()
    {
        var before = DateTime.UtcNow.AddSeconds(-1);
        var request = MakeRequest("REC-NOTIME");
        request.CompletedAt = null;

        var result = await _service.RecordCompletionAsync(request);

        Assert.InRange(result.CompletedAt, before, DateTime.UtcNow.AddSeconds(1));
    }

    // §6:驗證失敗一律零寫入(服務層)
    [Theory]
    [InlineData("", "用戶端紀錄編號不可為空")]
    [InlineData("   ", "用戶端紀錄編號不可為空")]
    public async Task RecordCompletion_BlankClientRecordId_FailsWithoutWriting(string clientRecordId, string expected)
    {
        var request = MakeRequest();
        request.ClientRecordId = clientRecordId;

        var result = await _service.RecordCompletionAsync(request);

        Assert.False(result.Success);
        Assert.Equal(expected, result.Error);
        Assert.Equal(0, await _context.ProductionCompletions.CountAsync());
    }

    // §6:各欄位的驗證訊息為表列的正體中文
    [Fact]
    public async Task RecordCompletion_NegativeValues_ReturnSpecMessages()
    {
        await AssertError(r => r.GoodQty = -1, "良品數不可為負");
        await AssertError(r => r.TargetQty = -1, "目標數量不可為負");
        await AssertError(r => r.PrepTimeMinutes = -1m, "準備時間不可為負");
        await AssertError(r => r.RunTimeMinutes = -1m, "運轉時間不可為負");
        await AssertError(r => r.StopTimeMinutes = -1m, "停機時間不可為負");
        await AssertError(r => r.AvgSpeed = -1m, "平均車速不可為負");
        await AssertError(r => r.ClientRecordId = new string('x', 65), "用戶端紀錄編號超過 64 字元");
        await AssertError(r => r.OrderNumber = new string('x', 51), "訂單編號超過 50 字元");
        await AssertError(r => r.DeviceId = new string('x', 51), "設備編號超過 50 字元");
        await AssertError(r => r.Operator = new string('x', 101), "操作員超過 100 字元");
        await AssertError(r => r.Shift = new string('x', 21), "班別超過 20 字元");
        await AssertError(r => r.Defects![0].Qty = -1, "不良品數量不可為負");
        await AssertError(r => r.Defects![0].Code = new string('x', 21), "原因代碼超過 20 字元");
        await AssertError(r => r.Stops![0].Reason = new string('x', 101), "原因名稱超過 100 字元");
        await AssertError(r => r.Stops![0].DurationMinutes = -1m, "停機時長不可為負");
        await AssertError(
            r => r.Defects = Enumerable.Range(0, 201).Select(_ => new ProductionDefectRequest()).ToList(),
            "不良明細筆數超過上限 200");
        await AssertError(
            r => r.Stops = Enumerable.Range(0, 201).Select(_ => new ProductionStopRequest()).ToList(),
            "停機明細筆數超過上限 200");
    }

    /// <summary>
    /// 對合法請求施加一個破壞性修改,斷言回傳指定訊息且資料庫零寫入。
    /// 輸入:mutate 修改動作、expected 預期訊息;輸出:無(斷言)。
    /// </summary>
    private async Task AssertError(Action<ProductionCompletionRequest> mutate, string expected)
    {
        var request = MakeRequest(Guid.NewGuid().ToString("N")[..16]);
        mutate(request);

        var result = await _service.RecordCompletionAsync(request);

        Assert.False(result.Success);
        Assert.Equal(expected, result.Error);
        Assert.Equal(0, await _context.ProductionCompletions.CountAsync());
    }

    public void Dispose() => _context.Dispose();
}
