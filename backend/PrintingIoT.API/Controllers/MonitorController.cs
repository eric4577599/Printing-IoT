using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Models;
using PrintingIoT.Infrastructure.Data;
using StackExchange.Redis;

namespace PrintingIoT.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MonitorController : ControllerBase
{
    private readonly PrintingContext _context;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<MonitorController> _logger;

    public MonitorController(PrintingContext context, IConnectionMultiplexer redis, ILogger<MonitorController> logger)
    {
        _context = context;
        _redis = redis;
        _logger = logger;
    }

    [HttpGet("realtime")]
    public async Task<ActionResult<MonitorData>> GetRealtimeData()
    {
        var db = _redis.GetDatabase();
        var data = await db.StringGetAsync("factory/monitor");

        if (data.IsNullOrEmpty)
        {
            return NoContent();
        }

        return JsonSerializer.Deserialize<MonitorData>(data!)!;
    }

    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<ProductionLog>>> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 50;

        return await _context.ProductionLogs
            .OrderByDescending(p => p.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }
}
