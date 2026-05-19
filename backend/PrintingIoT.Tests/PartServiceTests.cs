using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.DTOs.Parts;
using PrintingIoT.Core.Entities.Parts;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Infrastructure.Services;

namespace PrintingIoT.Tests;

/// <summary>
/// PartService Unit Tests — 零件服務單元測試
/// Phase 3.10: Tests PartService with InMemory database
/// 
/// Error-Test Traceability:
/// - BUG-P3-xxx → Test Case maps here if bugs are discovered
/// </summary>
public class PartServiceTests : IDisposable
{
    private readonly PrintingContext _context;
    private readonly PartService _service;

    public PartServiceTests()
    {
        var options = new DbContextOptionsBuilder<PrintingContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new PrintingContext(options);
        _service = new PartService(_context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetPartsAsync_ReturnsEmpty_WhenNoData()
    {
        var result = await _service.GetPartsAsync(null);
        Assert.Empty(result);
    }

    [Fact]
    public async Task CreatePartAsync_ReturnsGuid_WhenValid()
    {
        var dto = new CreatePartDto(
            InternalPN: "PN-001",
            Name: "Test Part",
            Unit: "pcs",
            Specification: "Test Spec",
            Category: "Bearing",
            SafeStockLevel: 10,
            Suppliers: null
        );

        var id = await _service.CreatePartAsync(dto);
        Assert.NotEqual(Guid.Empty, id);

        var parts = await _service.GetPartsAsync(null);
        Assert.Single(parts);
        Assert.Equal("PN-001", parts.First().InternalPN);
    }

    [Fact]
    public async Task CreatePartAsync_ThrowsOnDuplicate()
    {
        var dto = new CreatePartDto("PN-DUP", "Dup Part", "pcs", null, null, 0, null);

        await _service.CreatePartAsync(dto);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.CreatePartAsync(dto));
    }

    [Fact]
    public async Task GetPartsAsync_FiltersKeyword()
    {
        await _service.CreatePartAsync(new CreatePartDto("PN-A", "Alpha", "pcs", null, null, 0, null));
        await _service.CreatePartAsync(new CreatePartDto("PN-B", "Beta", "pcs", null, null, 0, null));

        var result = (await _service.GetPartsAsync("Alpha")).ToList();
        Assert.Single(result);
        Assert.Equal("PN-A", result[0].InternalPN);
    }

    [Fact]
    public async Task CreatePartAsync_WithSupplier_CreatesRelationship()
    {
        var dto = new CreatePartDto(
            InternalPN: "PN-SUP",
            Name: "Part With Supplier",
            Unit: "pcs",
            Specification: null,
            Category: null,
            SafeStockLevel: 5,
            Suppliers: new List<CreateSupplierPartDto>
            {
                new CreateSupplierPartDto("Supplier A", "MFR-001", 100.50m, true)
            }
        );

        var id = await _service.CreatePartAsync(dto);

        var parts = (await _service.GetPartsAsync(null)).ToList();
        Assert.Single(parts);
        Assert.Single(parts[0].Suppliers);
        Assert.Equal("Supplier A", parts[0].Suppliers[0].SupplierName);
        Assert.True(parts[0].Suppliers[0].IsPreferred);
    }

    [Fact]
    public async Task CreatePartAsync_WithExistingSupplier_ReusesSupplier()
    {
        // Create first part with Supplier A
        await _service.CreatePartAsync(new CreatePartDto(
            "PN-1", "Part 1", "pcs", null, null, 0,
            new List<CreateSupplierPartDto>
            {
                new("Supplier A", "MFR-001", null, false)
            }
        ));

        // Create second part with same Supplier A
        await _service.CreatePartAsync(new CreatePartDto(
            "PN-2", "Part 2", "pcs", null, null, 0,
            new List<CreateSupplierPartDto>
            {
                new("Supplier A", "MFR-002", null, true)
            }
        ));

        // Should only have 1 Supplier record (reused)
        Assert.Equal(1, await _context.Suppliers.CountAsync());
        Assert.Equal(2, await _context.Parts.CountAsync());
        Assert.Equal(2, await _context.SupplierParts.CountAsync());
    }
}
