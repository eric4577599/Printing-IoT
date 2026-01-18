using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities.Maintenance;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceController : ControllerBase
{
    private readonly PrintingContext _context;

    public MaintenanceController(PrintingContext context)
    {
        _context = context;
    }

    // --- SCHEDULES ---

    [HttpGet("schedules")]
    public async Task<ActionResult<IEnumerable<MaintenanceSchedule>>> GetSchedules()
    {
        return await _context.MaintenanceSchedules.ToListAsync();
    }

    [HttpPost("schedules")]
    public async Task<ActionResult<MaintenanceSchedule>> CreateSchedule(MaintenanceSchedule schedule)
    {
        _context.MaintenanceSchedules.Add(schedule);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSchedules), new { id = schedule.Id }, schedule);
    }

    // --- PARTS ---

    [HttpGet("parts")]
    public async Task<ActionResult<IEnumerable<SparePart>>> GetParts()
    {
        return await _context.SpareParts.ToListAsync();
    }

    [HttpPost("parts")]
    public async Task<ActionResult<SparePart>> CreatePart(SparePart part)
    {
        _context.SpareParts.Add(part);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetParts), new { id = part.Id }, part);
    }

    // --- RECORDS ---

    [HttpGet("records")]
    public async Task<ActionResult<IEnumerable<MaintenanceRecord>>> GetRecords()
    {
        return await _context.MaintenanceRecords
            .Include(r => r.Schedule)
            .Include(r => r.Part)
            .OrderByDescending(r => r.ExecutionDate)
            .ToListAsync();
    }

    [HttpPost("records")]
    public async Task<ActionResult<MaintenanceRecord>> CreateRecord(MaintenanceRecord record)
    {
        // Deduct stock if part used
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
        return CreatedAtAction(nameof(GetRecords), new { id = record.Id }, record);
    }
}
