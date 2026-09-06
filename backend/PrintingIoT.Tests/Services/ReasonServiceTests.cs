using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Infrastructure.Services;

namespace PrintingIoT.Tests.Services;

/// <summary>
/// ReasonService 單元測試(S3 / F5,對應 AC-21、AC-22)。
/// 以 InMemory 資料庫執行,不連任何真實資料庫。
/// </summary>
public class ReasonServiceTests : IDisposable
{
    private readonly PrintingContext _context;
    private readonly ReasonService _service;

    public ReasonServiceTests()
    {
        var options = new DbContextOptionsBuilder<PrintingContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new PrintingContext(options);
        _service = new ReasonService(_context, new Mock<ILogger<ReasonService>>().Object);
    }

    /// <summary>
    /// 建立一筆停機原因供後續測試使用。
    /// 輸入:code 代碼、name 名稱;輸出:建立後的 DTO。
    /// </summary>
    private async Task<ReasonCodeDto> SeedStopReasonAsync(string code = "001", string name = "送紙歪斜")
    {
        var (created, conflict) = await _service.CreateReasonAsync(ReasonType.Stop, new ReasonCreateRequest
        {
            Code = code,
            Name = name,
            Category = "Feed",
            DisplayOrder = 1,
        });

        Assert.False(conflict);
        Assert.NotNull(created);
        return created!;
    }

    // AC-21:PUT 只改 Name / Category / DisplayOrder / IsActive;帶了不同的 code / type 也不生效
    [Fact]
    public async Task UpdateReason_IgnoresCodeAndTypeChanges()
    {
        var created = await SeedStopReasonAsync();

        var success = await _service.UpdateReasonAsync(created.Id, new ReasonUpdateRequest
        {
            Code = "999",          // 忽略欄位
            Type = "defect",       // 忽略欄位
            Name = "送紙嚴重歪斜",
            Category = "Machine",
            DisplayOrder = 7,
            IsActive = true,
        });

        Assert.True(success);

        var row = await _context.ReasonCodes.SingleAsync(r => r.Id == created.Id);
        Assert.Equal("001", row.Code);                 // Code 不變
        Assert.Equal(ReasonType.Stop, row.Type);       // Type 不變
        Assert.Equal("送紙嚴重歪斜", row.Name);
        Assert.Equal("Machine", row.Category);
        Assert.Equal(7, row.DisplayOrder);
        Assert.NotNull(row.UpdatedAt);
    }

    // AC-21 補強:查無該列 → false
    [Fact]
    public async Task UpdateReason_MissingId_ReturnsFalse()
    {
        var success = await _service.UpdateReasonAsync(Guid.NewGuid(), new ReasonUpdateRequest { Name = "X" });

        Assert.False(success);
    }

    // AC-22:DELETE 為軟刪除 —— IsActive = false,預設 GET 讀不到、includeInactive=true 讀得到,重複刪仍成功
    [Fact]
    public async Task DeleteReason_IsSoftDeleteAndIdempotent()
    {
        var created = await SeedStopReasonAsync();

        Assert.True(await _service.DeleteReasonAsync(created.Id));

        var row = await _context.ReasonCodes.SingleAsync(r => r.Id == created.Id);
        Assert.False(row.IsActive);

        var active = await _service.GetReasonsAsync(ReasonType.Stop);
        Assert.Empty(active);

        var all = await _service.GetReasonsAsync(ReasonType.Stop, includeInactive: true);
        Assert.Single(all);

        // 重複刪除仍成功(端點據此回 204)
        Assert.True(await _service.DeleteReasonAsync(created.Id));
        Assert.Equal(1, await _context.ReasonCodes.CountAsync());   // 沒有硬刪
    }

    // AC-22 補強:查無該列 → false(端點回 404)
    [Fact]
    public async Task DeleteReason_MissingId_ReturnsFalse()
    {
        Assert.False(await _service.DeleteReasonAsync(Guid.NewGuid()));
    }

    // 軟刪除後可用 PUT 的 IsActive = true 復原
    [Fact]
    public async Task UpdateReason_CanReactivateSoftDeletedRow()
    {
        var created = await SeedStopReasonAsync();
        await _service.DeleteReasonAsync(created.Id);

        await _service.UpdateReasonAsync(created.Id, new ReasonUpdateRequest { IsActive = true });

        Assert.Single(await _service.GetReasonsAsync(ReasonType.Stop));
    }

    // 建立:(Type, Code) 重複 → Conflict 且不新增第二列
    [Fact]
    public async Task CreateReason_DuplicateTypeAndCode_ReturnsConflict()
    {
        await SeedStopReasonAsync();

        var (created, conflict) = await _service.CreateReasonAsync(ReasonType.Stop, new ReasonCreateRequest
        {
            Code = "001",
            Name = "另一個名稱",
        });

        Assert.True(conflict);
        Assert.Null(created);
        Assert.Equal(1, await _context.ReasonCodes.CountAsync());
    }

    // 建立:相同 Code 但不同 Type 不算重複(停機 001 與不良 001 是兩筆)
    [Fact]
    public async Task CreateReason_SameCodeDifferentType_IsAllowed()
    {
        await SeedStopReasonAsync();

        var (created, conflict) = await _service.CreateReasonAsync(ReasonType.Defect, new ReasonCreateRequest
        {
            Code = "001",
            Name = "壓扁",
        });

        Assert.False(conflict);
        Assert.NotNull(created);
        Assert.Equal(2, await _context.ReasonCodes.CountAsync());
    }

    // 建立:Category 未填時存 General
    [Fact]
    public async Task CreateReason_WithoutCategory_DefaultsToGeneral()
    {
        var (created, _) = await _service.CreateReasonAsync(ReasonType.Defect, new ReasonCreateRequest
        {
            Code = "A01",
            Name = "壓扁",
        });

        Assert.Equal("General", created!.Category);
    }

    // 查詢:依 DisplayOrder 再 Code 升冪,且兩種類別互不混入
    [Fact]
    public async Task GetReasons_SortsByDisplayOrderThenCode_AndFiltersByType()
    {
        await _service.CreateReasonAsync(ReasonType.Stop, new ReasonCreateRequest { Code = "003", Name = "紙張破裂", DisplayOrder = 2 });
        await _service.CreateReasonAsync(ReasonType.Stop, new ReasonCreateRequest { Code = "002", Name = "印刷不清", DisplayOrder = 2 });
        await _service.CreateReasonAsync(ReasonType.Stop, new ReasonCreateRequest { Code = "001", Name = "送紙歪斜", DisplayOrder = 1 });
        await _service.CreateReasonAsync(ReasonType.Defect, new ReasonCreateRequest { Code = "A01", Name = "壓扁", DisplayOrder = 1 });

        var stops = (await _service.GetReasonsAsync(ReasonType.Stop)).ToList();
        Assert.Equal(new[] { "001", "002", "003" }, stops.Select(r => r.Code));
        Assert.All(stops, r => Assert.Equal("stop", r.Type));

        var defects = (await _service.GetReasonsAsync(ReasonType.Defect)).ToList();
        Assert.Single(defects);
        Assert.Equal("defect", defects[0].Type);
    }

    public void Dispose() => _context.Dispose();
}
