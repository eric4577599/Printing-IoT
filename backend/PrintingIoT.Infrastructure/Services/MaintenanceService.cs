using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities.Maintenance;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.Infrastructure.Services;

public class MaintenanceService : IMaintenanceService
{
    private readonly PrintingContext _context;

    public MaintenanceService(PrintingContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MaintenanceSchedule>> GetSchedulesAsync()
    {
        return await _context.MaintenanceSchedules.ToListAsync();
    }

    public async Task<MaintenanceSchedule> CreateScheduleAsync(MaintenanceSchedule schedule)
    {
        _context.MaintenanceSchedules.Add(schedule);
        await _context.SaveChangesAsync();
        return schedule;
    }

    public async Task<IEnumerable<SparePart>> GetPartsAsync()
    {
        return await _context.SpareParts.ToListAsync();
    }

    public async Task<SparePart> CreatePartAsync(SparePart part)
    {
        _context.SpareParts.Add(part);
        await _context.SaveChangesAsync();
        return part;
    }

    public async Task<IEnumerable<MaintenanceRecord>> GetRecordsAsync()
    {
        return await _context.MaintenanceRecords
            .Include(r => r.Schedule)
            .Include(r => r.Part)
            .OrderByDescending(r => r.ExecutionDate)
            .ToListAsync();
    }

    public async Task<MaintenanceRecord> CreateRecordAsync(MaintenanceRecord record)
    {
        // 扣減庫存邏輯（移出 Controller）
        if (record.PartId.HasValue && record.QuantityUsed > 0)
        {
            var part = await _context.SpareParts.FindAsync(record.PartId);
            if (part != null)
            {
                part.StockQuantity -= record.QuantityUsed;
            }
        }

        _context.MaintenanceRecords.Add(record);
        await _context.SaveChangesAsync();
        return record;
    }
}
