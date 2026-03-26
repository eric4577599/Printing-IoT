using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MMS.Core.Entities;
using MMS.Infrastructure.Data;

namespace MMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SchedulesController : ControllerBase
{
    private readonly MmsDbContext _context;

    public SchedulesController(MmsDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MaintenanceSchedule>>> GetSchedules()
    {
        return await _context.MaintenanceSchedules.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MaintenanceSchedule>> GetSchedule(Guid id)
    {
        var schedule = await _context.MaintenanceSchedules.FindAsync(id);
        if (schedule == null) return NotFound();
        return schedule;
    }

    [HttpPost]
    public async Task<ActionResult<MaintenanceSchedule>> PostSchedule(MaintenanceSchedule schedule)
    {
        _context.MaintenanceSchedules.Add(schedule);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSchedule), new { id = schedule.Id }, schedule);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutSchedule(Guid id, MaintenanceSchedule schedule)
    {
        if (id != schedule.Id) return BadRequest();
        _context.Entry(schedule).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSchedule(Guid id)
    {
        var schedule = await _context.MaintenanceSchedules.FindAsync(id);
        if (schedule == null) return NotFound();
        _context.MaintenanceSchedules.Remove(schedule);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
