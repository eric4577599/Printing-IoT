using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Infrastructure.Services;

namespace PrintingIoT.Tests.Services;

/// <summary>
/// OrderService.SyncScheduleAsync 單元測試(Phase 2 全量鏡像同步)。
/// 驗證:依陣列順序 upsert 設 Sequence、刪除清單外的列、空清單保護、SpecJson passthrough。
/// </summary>
public class OrderServiceTests : IDisposable
{
    private readonly PrintingContext _context;
    private readonly OrderService _service;

    public OrderServiceTests()
    {
        var options = new DbContextOptionsBuilder<PrintingContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new PrintingContext(options);
        _service = new OrderService(_context, new Mock<ILogger<OrderService>>().Object);
    }

    private static Order MakeOrder(string number, int seq = 0, Guid id = default) => new()
    {
        Id = id == default ? Guid.NewGuid() : id,
        OrderNumber = number,
        CustomerName = "C-" + number,
        Quantity = 100,
        Sequence = seq,
    };

    [Fact]
    public async Task Sync_Empty_IsNoOp_ReturnsCurrent()
    {
        _context.Orders.Add(MakeOrder("A", 0));
        await _context.SaveChangesAsync();

        var result = await _service.SyncScheduleAsync(new List<Order>());

        Assert.Single(result);                       // 未被清空
        Assert.Equal(1, await _context.Orders.CountAsync());
    }

    [Fact]
    public async Task Sync_InsertsNewOrders_WithSequenceByIndex()
    {
        var incoming = new List<Order> { MakeOrder("A"), MakeOrder("B"), MakeOrder("C") };

        var result = (await _service.SyncScheduleAsync(incoming)).ToList();

        Assert.Equal(3, result.Count);
        Assert.Equal(new[] { "A", "B", "C" }, result.Select(o => o.OrderNumber));
        Assert.Equal(new[] { 0, 1, 2 }, result.Select(o => o.Sequence));
    }

    [Fact]
    public async Task Sync_UpdatesExisting_ResequencesAndDeletesMissing()
    {
        var keep = MakeOrder("KEEP", 0);
        var drop = MakeOrder("DROP", 1);
        _context.Orders.AddRange(keep, drop);
        await _context.SaveChangesAsync();

        // 新清單:新增 NEW 在前、保留 KEEP(改序)、不含 DROP
        var incoming = new List<Order>
        {
            MakeOrder("NEW"),
            MakeOrder("KEEP-EDITED", 0, keep.Id), // 同 id → 更新
        };

        var result = (await _service.SyncScheduleAsync(incoming)).ToList();

        Assert.Equal(2, result.Count);
        Assert.DoesNotContain(result, o => o.OrderNumber == "DROP");     // 清單外被刪
        var keptRow = result.Single(o => o.Id == keep.Id);
        Assert.Equal("KEEP-EDITED", keptRow.OrderNumber);               // 既有列被更新
        Assert.Equal(1, keptRow.Sequence);                              // 依陣列位置(index 1)
        Assert.Equal(0, result.Single(o => o.OrderNumber == "NEW").Sequence);
    }

    [Fact]
    public async Task Sync_PreservesSpecJson()
    {
        var incoming = new List<Order>
        {
            new() { Id = Guid.NewGuid(), OrderNumber = "A", SpecJson = "{\"boxLen\":300,\"dieCutType\":\"RSC\"}" },
        };

        var result = (await _service.SyncScheduleAsync(incoming)).ToList();

        Assert.Contains("boxLen", result[0].SpecJson);
        Assert.Contains("RSC", result[0].SpecJson);
    }

    [Fact]
    public async Task Sync_UsesProvidedGuid_ForUpsertIdentity()
    {
        var id = Guid.NewGuid();
        // 第一次:以指定 GUID 新建
        await _service.SyncScheduleAsync(new List<Order> { MakeOrder("A", 0, id) });
        // 第二次:同 GUID → 應更新而非新建(總數維持 1)
        await _service.SyncScheduleAsync(new List<Order> { MakeOrder("A2", 0, id) });

        Assert.Equal(1, await _context.Orders.CountAsync());
        Assert.Equal("A2", (await _context.Orders.FindAsync(id))!.OrderNumber);
    }

    public void Dispose() => _context.Dispose();
}
