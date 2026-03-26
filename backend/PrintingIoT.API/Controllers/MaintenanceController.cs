using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities.Maintenance;
using PrintingIoT.Core.Interfaces;

namespace PrintingIoT.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceController : ControllerBase
{
    private readonly IMaintenanceService _maintenanceService;

    public MaintenanceController(IMaintenanceService maintenanceService)
    {
        _maintenanceService = maintenanceService;
    }

    // --- SCHEDULES ---

    [HttpGet("schedules")]
    public async Task<ActionResult<IEnumerable<MaintenanceSchedule>>> GetSchedules()
    {
        var schedules = await _maintenanceService.GetSchedulesAsync();
        return Ok(schedules);
    }

    [HttpPost("schedules")]
    public async Task<ActionResult<MaintenanceSchedule>> CreateSchedule(MaintenanceSchedule schedule)
    {
        var createdSchedule = await _maintenanceService.CreateScheduleAsync(schedule);
        return CreatedAtAction(nameof(GetSchedules), new { id = createdSchedule.Id }, createdSchedule);
    }

    // --- PARTS ---

    [HttpGet("parts")]
    public async Task<ActionResult<IEnumerable<SparePart>>> GetParts()
    {
        var parts = await _maintenanceService.GetPartsAsync();
        return Ok(parts);
    }

    [HttpPost("parts")]
    public async Task<ActionResult<SparePart>> CreatePart(SparePart part)
    {
        var createdPart = await _maintenanceService.CreatePartAsync(part);
        return CreatedAtAction(nameof(GetParts), new { id = createdPart.Id }, createdPart);
    }

    // --- RECORDS ---

    [HttpGet("records")]
    public async Task<ActionResult<IEnumerable<MaintenanceRecord>>> GetRecords()
    {
        var records = await _maintenanceService.GetRecordsAsync();
        return Ok(records);
    }

    [HttpPost("records")]
    public async Task<ActionResult<MaintenanceRecord>> CreateRecord(MaintenanceRecord record)
    {
        var createdRecord = await _maintenanceService.CreateRecordAsync(record);
        return CreatedAtAction(nameof(GetRecords), new { id = createdRecord.Id }, createdRecord);
    }
}
