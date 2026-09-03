using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Infrastructure.Services;

namespace PrintingIoT.Tests.Services;

/// <summary>
/// OrderService.PushOrdersAsync 單元測試(S1 / ERP-02 + SEC-05 + ERP-10)。
/// 驗證:依 OrderNumber upsert 的冪等性、同批次重複單號、驗證失敗列不落地、
/// 產品碼先查再建、產品碼唯一索引已宣告。
/// </summary>
public class ErpPushOrdersTests : IDisposable
{
    private readonly PrintingContext _context;
    private readonly OrderService _service;

    public ErpPushOrdersTests()
    {
        var options = new DbContextOptionsBuilder<PrintingContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new PrintingContext(options);
        _service = new OrderService(_context, new Mock<ILogger<OrderService>>().Object);
    }

    private static OrderDto MakeDto(string number, string customer = "客戶A", string? productCode = null) => new()
    {
        OrderNumber = number,
        CustomerName = customer,
        TargetLength = 1000m,
        Quantity = 500,
        BoxType = "A Type",
        PaperSpec = "AB",
        ProductCode = productCode,
    };

    // AC-10:同一批連送兩次,Orders 筆數不變(冪等),第二次為欄位更新
    [Fact]
    public async Task Push_SameBatchTwice_IsIdempotent()
    {
        var batch = new List<OrderDto> { MakeDto("ERP-001"), MakeDto("ERP-002") };

        var first = await _service.PushOrdersAsync(batch);
        Assert.True(first.Success);
        Assert.Equal(2, await _context.Orders.CountAsync());

        var second = await _service.PushOrdersAsync(new List<OrderDto>
        {
            MakeDto("ERP-001", "客戶B"),
            MakeDto("ERP-002", "客戶B"),
        });

        Assert.True(second.Success);
        Assert.Equal(2, await _context.Orders.CountAsync());
        Assert.All(await _context.Orders.ToListAsync(), o => Assert.Equal("客戶B", o.CustomerName));
        // 兩次的 OrderId 相同(同一列被更新而非新建)
        Assert.Equal(
            first.Results.Select(r => r.OrderId).OrderBy(g => g),
            second.Results.Select(r => r.OrderId).OrderBy(g => g));
    }

    // AC-11:同一批次內兩筆相同 OrderNumber → 資料庫只有一列,兩列結果皆成功且 OrderId 相同
    [Fact]
    public async Task Push_DuplicateOrderNumberInSameBatch_WritesSingleRow()
    {
        var result = await _service.PushOrdersAsync(new List<OrderDto>
        {
            MakeDto("ERP-001", "客戶A"),
            MakeDto("ERP-001", "客戶B"),
        });

        Assert.True(result.Success);
        Assert.Equal(2, result.Results.Count);
        Assert.All(result.Results, r => Assert.True(r.Success));
        Assert.Equal(result.Results[0].OrderId, result.Results[1].OrderId);
        Assert.Equal(1, await _context.Orders.CountAsync());
        Assert.Equal("客戶B", (await _context.Orders.SingleAsync()).CustomerName);   // 後者勝
    }

    // AC-12:更新既有訂單時,Status 與 Sequence 不被重設
    [Fact]
    public async Task Push_UpdateExisting_KeepsStatusAndSequence()
    {
        var existing = new Order
        {
            OrderNumber = "ERP-001",
            CustomerName = "舊客戶",
            Status = OrderStatus.InProgress,
            Sequence = 5,
            SpecJson = "{\"boxLen\":300}",
        };
        _context.Orders.Add(existing);
        await _context.SaveChangesAsync();

        await _service.PushOrdersAsync(new List<OrderDto> { MakeDto("ERP-001", "新客戶") });

        var after = await _context.Orders.SingleAsync();
        Assert.Equal("新客戶", after.CustomerName);          // ERP 為權威來源
        Assert.Equal(OrderStatus.InProgress, after.Status);  // 不打回 Pending
        Assert.Equal(5, after.Sequence);                     // 不清掉排程位置
        Assert.Equal("{\"boxLen\":300}", after.SpecJson);    // 不清掉規格 payload
        Assert.Equal(existing.Id, after.Id);
    }

    // AC-13:第 2 筆單號過長 → 該列失敗且不落地,第 1、3 筆照寫
    [Fact]
    public async Task Push_RowExceedingOrderNumberLength_FailsWithoutBlockingOthers()
    {
        var tooLong = new string('X', 51);
        var result = await _service.PushOrdersAsync(new List<OrderDto>
        {
            MakeDto("ERP-001"),
            MakeDto(tooLong),
            MakeDto("ERP-003"),
        });

        Assert.False(result.Success);
        Assert.Equal(3, result.Total);
        Assert.Equal(2, result.Succeeded);
        Assert.Equal(1, result.Failed);

        Assert.False(result.Results[1].Success);
        Assert.False(string.IsNullOrEmpty(result.Results[1].Error));
        Assert.Null(result.Results[1].OrderId);
        Assert.Equal(1, result.Results[1].Index);

        Assert.True(result.Results[0].Success);
        Assert.NotNull(result.Results[0].OrderId);
        Assert.True(result.Results[2].Success);

        Assert.Equal(2, await _context.Orders.CountAsync());
        Assert.DoesNotContain(await _context.Orders.ToListAsync(), o => o.OrderNumber == tooLong);
    }

    // AC-14:兩筆共用同一不存在的 ProductCode → Products 只新增 1 筆;再推一次仍為 1 筆
    [Fact]
    public async Task Push_SameProductCodeTwice_CreatesOnePlaceholderProduct()
    {
        var batch = new List<OrderDto>
        {
            MakeDto("ERP-001", productCode: "P-001"),
            MakeDto("ERP-002", productCode: "P-001"),
        };

        await _service.PushOrdersAsync(batch);
        Assert.Equal(1, await _context.Products.CountAsync());

        await _service.PushOrdersAsync(batch);
        Assert.Equal(1, await _context.Products.CountAsync());
    }

    // AC-15:Product 實體有 IsUnique 且鍵為 ProductCode 的索引
    [Fact]
    public void Product_HasUniqueIndexOnProductCode()
    {
        var entity = _context.Model.FindEntityType(typeof(Product));
        Assert.NotNull(entity);

        var index = entity!.GetIndexes()
            .FirstOrDefault(i => i.Properties.Count == 1 && i.Properties[0].Name == nameof(Product.ProductCode));

        Assert.NotNull(index);
        Assert.True(index!.IsUnique);
    }

    // AC-16:OrderNumber 為空白的列回失敗,不寫入,其他列不受影響
    [Fact]
    public async Task Push_BlankOrderNumber_FailsRowOnly()
    {
        var result = await _service.PushOrdersAsync(new List<OrderDto>
        {
            MakeDto("   "),
            MakeDto("ERP-002"),
        });

        Assert.False(result.Results[0].Success);
        Assert.Equal("訂單編號不可為空", result.Results[0].Error);
        Assert.True(result.Results[1].Success);
        Assert.Equal(1, await _context.Orders.CountAsync());
    }

    // Edge case:整批都驗證失敗 → success = false、succeeded = 0、資料庫零寫入
    [Fact]
    public async Task Push_AllRowsInvalid_WritesNothing()
    {
        var result = await _service.PushOrdersAsync(new List<OrderDto>
        {
            MakeDto(""),
            new() { OrderNumber = "ERP-002", Quantity = -1 },
        });

        Assert.False(result.Success);
        Assert.Equal(0, result.Succeeded);
        Assert.Equal(2, result.Failed);
        Assert.Equal(0, await _context.Orders.CountAsync());
    }

    // Edge case:空陣列 → total = 0、results 為空,不視為錯誤
    [Fact]
    public async Task Push_EmptyList_ReturnsEmptyResult()
    {
        var result = await _service.PushOrdersAsync(new List<OrderDto>());

        Assert.True(result.Success);
        Assert.Equal(0, result.Total);
        Assert.Empty(result.Results);
    }

    // Edge case:ProductCode 為空字串 → 不建立佔位產品,該列仍算成功
    [Fact]
    public async Task Push_EmptyProductCode_DoesNotCreateProduct()
    {
        var result = await _service.PushOrdersAsync(new List<OrderDto> { MakeDto("ERP-001", productCode: "") });

        Assert.True(result.Success);
        Assert.Equal(0, await _context.Products.CountAsync());
        var order = await _context.Orders.SingleAsync();
        Assert.Null(order.OptPhase);
        Assert.Null(order.OptGap);
    }

    // Edge case:命中既有產品 → 套用最佳化參數,不新增產品
    [Fact]
    public async Task Push_ExistingProduct_AppliesOptimizationValues()
    {
        _context.Products.Add(new Product { ProductCode = "P-001", Name = "既有品", OptimizationPhase = 12.5m, OptimizationGap = 3m });
        await _context.SaveChangesAsync();

        await _service.PushOrdersAsync(new List<OrderDto> { MakeDto("ERP-001", productCode: "P-001") });

        Assert.Equal(1, await _context.Products.CountAsync());
        var order = await _context.Orders.SingleAsync();
        Assert.Equal(12.5m, order.OptPhase);
        Assert.Equal(3m, order.OptGap);
    }

    public void Dispose() => _context.Dispose();
}
