using Microsoft.EntityFrameworkCore;
using SmartParts.API.Data;
using SmartParts.API.DTOs;
using SmartParts.API.Entities;

namespace SmartParts.API.Services;

public class PartService : IPartService
{
    private readonly SmartPartsDbContext _context;

    public PartService(SmartPartsDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PartDto>> GetPartsAsync(string? keyword)
    {
        var query = _context.Parts
            .Include(p => p.SupplierParts)
            .ThenInclude(sp => sp.Supplier)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(p => 
                p.InternalPN.Contains(keyword) || 
                p.Name.Contains(keyword) ||
                (p.Specification != null && p.Specification.Contains(keyword)));
        }

        var parts = await query.ToListAsync();

        return parts.Select(p => new PartDto(
            p.Id,
            p.InternalPN,
            p.Name,
            p.Specification ?? "",
            p.SafeStockLevel,
            p.SupplierParts.Select(sp => new SupplierPartDto(
                sp.SupplierId,
                sp.Supplier.Name,
                sp.ManufacturerPN ?? "",
                sp.IsPreferred
            )).ToList()
        ));
    }

    public async Task<Guid> CreatePartAsync(CreatePartDto dto)
    {
        if (await _context.Parts.AnyAsync(p => p.InternalPN == dto.InternalPN))
        {
            throw new InvalidOperationException($"Part with InternalPN '{dto.InternalPN}' already exists.");
        }

        var part = new Part
        {
            InternalPN = dto.InternalPN,
            Name = dto.Name,
            Unit = dto.Unit,
            Specification = dto.Specification,
            Category = dto.Category,
            SafeStockLevel = dto.SafeStockLevel
        };

        if (dto.Suppliers != null)
        {
            foreach (var supDto in dto.Suppliers)
            {
                var supplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.Name == supDto.SupplierName);
                if (supplier == null)
                {
                    supplier = new Supplier { Name = supDto.SupplierName };
                    _context.Suppliers.Add(supplier);
                }

                part.SupplierParts.Add(new SupplierPart
                {
                    Supplier = supplier,
                    ManufacturerPN = supDto.ManufacturerPN,
                    Price = supDto.Price,
                    IsPreferred = supDto.IsPreferred
                });
            }
        }

        _context.Parts.Add(part);
        await _context.SaveChangesAsync();
        return part.Id;
    }
}
