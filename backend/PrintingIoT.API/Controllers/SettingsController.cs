using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly PrintingContext _context;
    private readonly StackExchange.Redis.IConnectionMultiplexer _redis;
    private const string RedisKey = "config/communication";

    public SettingsController(PrintingContext context, StackExchange.Redis.IConnectionMultiplexer redis)
    {
        _context = context;
        _redis = redis;
    }

    [HttpGet("communication")]
    public async Task<IActionResult> GetCommunicationSettings()
    {
        var db = _redis.GetDatabase();
        var json = await db.StringGetAsync(RedisKey);
        if (json.HasValue)
        {
            return Ok(System.Text.Json.JsonSerializer.Deserialize<object>(json.ToString()));
        }
        
        // Default
        return Ok(new { 
            plc_enabled = true,
            plc_simulate = false,
            plc_device_type = "wise",
            plc_ip = "192.168.1.1",
            plc_port = 502,
            mqtt_broker_url = "mqtt.infotech-consultant.com",
            mqtt_topic = "Advantech/+/data", // Default wildcard, user can change to specific
            machine_id = "MACHINE_01",
            data_log_interval = 300
        });
    }

    [HttpPut("communication")]
    public async Task<IActionResult> UpdateCommunicationSettings([FromBody] object settings)
    {
        var db = _redis.GetDatabase();
        await db.StringSetAsync(RedisKey, System.Text.Json.JsonSerializer.Serialize(settings));
        return Ok(new { success = true });
    }

    [HttpGet("machine-sections")]
    public async Task<ActionResult<IEnumerable<MachineSection>>> GetMachineSections()
    {
        return await _context.MachineSections.OrderBy(s => s.DisplayOrder).ToListAsync();
    }

    [HttpPost("machine-sections")]
    public async Task<ActionResult<MachineSection>> CreateMachineSection(MachineSection section)
    {
        _context.MachineSections.Add(section);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetMachineSections), new { id = section.Id }, section);
    }

    [HttpPut("machine-sections/{id}")]
    public async Task<IActionResult> UpdateMachineSection(Guid id, MachineSection section)
    {
        if (id != section.Id) return BadRequest();
        
        _context.Entry(section).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("machine-sections/{id}")]
    public async Task<IActionResult> DeleteMachineSection(Guid id)
    {
        var section = await _context.MachineSections.FindAsync(id);
        if (section == null) return NotFound();

        _context.MachineSections.Remove(section);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }
    [HttpGet("box-types")]
    public async Task<IActionResult> GetBoxTypes()
    {
        var db = _redis.GetDatabase();
        var json = await db.StringGetAsync("config/box-types");
        if (json.HasValue)
        {
            return Ok(System.Text.Json.JsonSerializer.Deserialize<List<object>>(json.ToString()));
        }
        return Ok(new List<object>()); 
    }

    [HttpPut("box-types")]
    public async Task<IActionResult> UpdateBoxTypes([FromBody] List<object> types)
    {
        var db = _redis.GetDatabase();
        await db.StringSetAsync("config/box-types", System.Text.Json.JsonSerializer.Serialize(types));
        return Ok(new { success = true });
    }
}
