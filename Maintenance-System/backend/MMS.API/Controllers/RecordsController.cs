using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MMS.Core.Entities;
using MMS.Infrastructure.Data;

namespace MMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecordsController : ControllerBase
{
    private readonly MmsDbContext _context;

    public RecordsController(MmsDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MaintenanceRecord>>> GetRecords()
    {
        return await _context.MaintenanceRecords.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MaintenanceRecord>> GetRecord(Guid id)
    {
        var record = await _context.MaintenanceRecords.FindAsync(id);
        if (record == null) return NotFound();
        return record;
    }

    [HttpPost]
    public async Task<ActionResult<MaintenanceRecord>> PostRecord(MaintenanceRecord record)
    {
        _context.MaintenanceRecords.Add(record);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetRecord), new { id = record.Id }, record);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRecord(Guid id)
    {
        var record = await _context.MaintenanceRecords.FindAsync(id);
        if (record == null) return NotFound();
        _context.MaintenanceRecords.Remove(record);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
