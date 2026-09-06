using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Infrastructure.Services;

namespace PrintingIoT.Tests.Services;

/// <summary>
/// OrderService.SyncScheduleAsync 單元測試(S1 / DF-04 + DF-05:upsert 語意 + null 不覆寫)。
/// 驗證:清單外的列不被刪除、DeleteIds 明確刪除、依陣列位置設 Sequence、
/// null 欄位不覆寫而 ""/0 會覆寫、SpecJson passthrough。
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

    private static OrderSyncDto MakeDto(string number, Guid? id = null) => new()
    {
        Id = id,
        OrderNumber = number,
        CustomerName = "C-" + number,
        Quantity = 100,
    };

    private static ScheduleSyncRequest Req(IEnumerable<OrderSyncDto>? orders = null, IEnumerable<Guid>? deleteIds = null) => new()
    {
        Orders = orders?.ToList() ?? new List<OrderSyncDto>(),
        DeleteIds = deleteIds?.ToList() ?? new List<Guid>(),
    };

    // AC-08:Orders 與 DeleteIds 皆空 → 不動作,回傳現況
    [Fact]
    public async Task Sync_Empty_IsNoOp_ReturnsCurrent()
    {
        _context.Orders.Add(MakeOrder("A", 0));
        await _context.SaveChangesAsync();

        var result = await _service.SyncScheduleAsync(Req());

        Assert.Single(result);                       // 未被清空
        Assert.Equal(1, await _context.Orders.CountAsync());
    }

    // AC-06:Orders 中第 i 筆的 Sequence 等於 i
    [Fact]
    public async Task Sync_InsertsNewOrders_WithSequenceByIndex()
    {
        var incoming = new[] { MakeDto("A"), MakeDto("B"), MakeDto("C") };

        var result = (await _service.SyncScheduleAsync(Req(incoming))).ToList();

        Assert.Equal(3, result.Count);
        Assert.Equal(new[] { "A", "B", "C" }, result.Select(o => o.OrderNumber));
        Assert.Equal(new[] { 0, 1, 2 }, result.Select(o => o.Sequence));
    }

    // AC-01:同步清單中不含的既有訂單不會被刪除,且 Sequence 不變
    [Fact]
    public async Task Sync_DoesNotDeleteOrdersMissingFromList()
    {
        var keep = MakeOrder("KEEP", 0);
        var untouched = MakeOrder("UNTOUCHED", 7);
        _context.Orders.AddRange(keep, untouched);
        await _context.SaveChangesAsync();

        var incoming = new[]
        {
            MakeDto("NEW"),
            MakeDto("KEEP-EDITED", keep.Id),   // 同 id → 更新
        };

        var result = (await _service.SyncScheduleAsync(Req(incoming))).ToList();

        Assert.Equal(3, result.Count);
        var survivor = result.Single(o => o.Id == untouched.Id);
        Assert.Equal("UNTOUCHED", survivor.OrderNumber);
        Assert.Equal(7, survivor.Sequence);                             // Sequence 不被動到
        var keptRow = result.Single(o => o.Id == keep.Id);
        Assert.Equal("KEEP-EDITED", keptRow.OrderNumber);               // 既有列被更新
        Assert.Equal(1, keptRow.Sequence);                              // 依陣列位置(index 1)
        Assert.Equal(0, result.Single(o => o.OrderNumber == "NEW").Sequence);
    }

    // AC-02:DeleteIds 列出的既有訂單會被刪除;不存在的 id 靜默忽略
    [Fact]
    public async Task Sync_DeletesOnlyExplicitIds_AndIgnoresUnknownIds()
    {
        var keep = MakeOrder("KEEP", 0);
        var drop = MakeOrder("DROP", 1);
        _context.Orders.AddRange(keep, drop);
        await _context.SaveChangesAsync();

        var result = (await _service.SyncScheduleAsync(
            Req(new[] { MakeDto("KEEP", keep.Id) }, new[] { drop.Id, Guid.NewGuid() }))).ToList();

        Assert.Single(result);
        Assert.Equal(keep.Id, result[0].Id);
        Assert.Equal(1, await _context.Orders.CountAsync());
    }

    // AC-02 補充:Orders 為空、DeleteIds 有值 → 只執行刪除
    [Fact]
    public async Task Sync_EmptyOrders_WithDeleteIds_OnlyDeletes()
    {
        var keep = MakeOrder("KEEP", 3);
        var drop = MakeOrder("DROP", 4);
        _context.Orders.AddRange(keep, drop);
        await _context.SaveChangesAsync();

        var result = (await _service.SyncScheduleAsync(Req(null, new[] { drop.Id }))).ToList();

        Assert.Single(result);
        Assert.Equal("KEEP", result[0].OrderNumber);
        Assert.Equal(3, result[0].Sequence);   // 未被重排
    }

    // AC-03:同一 id 同時出現在 Orders 與 DeleteIds → 保留該列(不刪)
    [Fact]
    public async Task Sync_IdInBothOrdersAndDeleteIds_IsKept()
    {
        var row = MakeOrder("A", 0);
        _context.Orders.Add(row);
        await _context.SaveChangesAsync();

        var result = (await _service.SyncScheduleAsync(
            Req(new[] { MakeDto("A-EDITED", row.Id) }, new[] { row.Id }))).ToList();

        Assert.Single(result);
        Assert.Equal("A-EDITED", result[0].OrderNumber);
        Assert.Equal(1, await _context.Orders.CountAsync());
    }

    // AC-04:TargetLength = null、PaperSpec = null 不覆寫既有值(DF-05 後端側)
    [Fact]
    public async Task Sync_NullFields_DoNotOverwriteExistingValues()
    {
        var row = MakeOrder("A", 0);
        row.TargetLength = 5000m;
        row.PaperSpec = "AB";
        row.Status = OrderStatus.InProgress;
        row.SpecJson = "{\"boxLen\":300}";
        _context.Orders.Add(row);
        await _context.SaveChangesAsync();

        // 只送 OrderNumber,其餘皆 null(模擬前端未提供這些欄位)
        await _service.SyncScheduleAsync(Req(new[] { new OrderSyncDto { Id = row.Id, OrderNumber = "A" } }));

        var after = await _context.Orders.FindAsync(row.Id);
        Assert.Equal(5000m, after!.TargetLength);
        Assert.Equal("AB", after.PaperSpec);
        Assert.Equal(OrderStatus.InProgress, after.Status);   // 生產中的單不被打回 Pending
        Assert.Equal("{\"boxLen\":300}", after.SpecJson);
    }

    // AC-05:PaperSpec = ""、TargetLength = 0 會確實覆寫(明確清空語意)
    [Fact]
    public async Task Sync_ExplicitEmptyValues_DoOverwrite()
    {
        var row = MakeOrder("A", 0);
        row.TargetLength = 5000m;
        row.PaperSpec = "AB";
        _context.Orders.Add(row);
        await _context.SaveChangesAsync();

        await _service.SyncScheduleAsync(Req(new[]
        {
            new OrderSyncDto { Id = row.Id, OrderNumber = "A", PaperSpec = "", TargetLength = 0m },
        }));

        var after = await _context.Orders.FindAsync(row.Id);
        Assert.Equal(0m, after!.TargetLength);
        Assert.Equal(string.Empty, after.PaperSpec);
    }

    // AC-07:Id 未提供、OrderNumber 命中既有列 → 走更新,總筆數不變
    [Fact]
    public async Task Sync_MatchesByOrderNumber_WhenIdMissing()
    {
        var row = MakeOrder("ERP-001", 2);
        _context.Orders.Add(row);
        await _context.SaveChangesAsync();

        await _service.SyncScheduleAsync(Req(new[]
        {
            new OrderSyncDto { OrderNumber = "ERP-001", CustomerName = "新客戶" },
        }));

        Assert.Equal(1, await _context.Orders.CountAsync());
        var after = await _context.Orders.FindAsync(row.Id);
        Assert.Equal("新客戶", after!.CustomerName);
        Assert.Equal(0, after.Sequence);   // 依陣列位置重排
    }

    // AC-09:SpecJson passthrough 不回歸
    [Fact]
    public async Task Sync_PreservesSpecJson()
    {
        var incoming = new[]
        {
            new OrderSyncDto { Id = Guid.NewGuid(), OrderNumber = "A", SpecJson = "{\"boxLen\":300,\"dieCutType\":\"RSC\"}" },
        };

        var result = (await _service.SyncScheduleAsync(Req(incoming))).ToList();

        Assert.Contains("boxLen", result[0].SpecJson);
        Assert.Contains("RSC", result[0].SpecJson);
    }

    [Fact]
    public async Task Sync_UsesProvidedGuid_ForUpsertIdentity()
    {
        var id = Guid.NewGuid();
        // 第一次:以指定 GUID 新建
        await _service.SyncScheduleAsync(Req(new[] { MakeDto("A", id) }));
        // 第二次:同 GUID → 應更新而非新建(總數維持 1)
        await _service.SyncScheduleAsync(Req(new[] { MakeDto("A2", id) }));

        Assert.Equal(1, await _context.Orders.CountAsync());
        Assert.Equal("A2", (await _context.Orders.FindAsync(id))!.OrderNumber);
    }

    // Edge case:同一 id 在 Orders 出現兩次 → 後出現者勝,不建立第二列
    [Fact]
    public async Task Sync_DuplicateIdInSameRequest_UpdatesSingleRow()
    {
        var id = Guid.NewGuid();

        var result = (await _service.SyncScheduleAsync(Req(new[]
        {
            MakeDto("FIRST", id),
            MakeDto("SECOND", id),
        }))).ToList();

        Assert.Single(result);
        Assert.Equal("SECOND", result[0].OrderNumber);
        Assert.Equal(1, result[0].Sequence);   // 最終 Sequence 為後出現者的陣列位置
    }

    // Edge case:OrderNumber 空白且無 Id → 一律新建(不做空號比對)
    [Fact]
    public async Task Sync_BlankOrderNumber_AlwaysCreatesNewRow()
    {
        _context.Orders.Add(MakeOrder("   ", 0));
        await _context.SaveChangesAsync();

        var result = (await _service.SyncScheduleAsync(Req(new[] { new OrderSyncDto { OrderNumber = "   " } }))).ToList();

        Assert.Equal(2, result.Count);
    }

    // AC-35(S1 / v2.0):完工單留在後端(Status=Completed),鏡像同步不含它時
    // 既不會被刪除、也不會被改回 InProgress,Sequence 亦保持不變。
    [Fact]
    public async Task Sync_DoesNotResurrectOrDeleteCompletedOrder()
    {
        var completed = MakeOrder("DONE", 5);
        completed.Status = OrderStatus.Completed;
        var pending = MakeOrder("TODO", 0);
        _context.Orders.AddRange(completed, pending);
        await _context.SaveChangesAsync();

        // 前端佇列已不含完工單,只送 pending 那筆
        await _service.SyncScheduleAsync(Req(new[] { MakeDto("TODO", pending.Id) }));

        Assert.Equal(2, await _context.Orders.CountAsync());

        var kept = await _context.Orders.FindAsync(completed.Id);
        Assert.NotNull(kept);
        Assert.Equal(OrderStatus.Completed, kept!.Status);   // 沒被打回 InProgress
        Assert.Equal(5, kept.Sequence);                      // 也沒被重排
    }

    public void Dispose() => _context.Dispose();
}
