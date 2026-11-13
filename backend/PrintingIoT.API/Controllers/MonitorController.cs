using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Models;
using PrintingIoT.Infrastructure.Data;
using StackExchange.Redis;

namespace PrintingIoT.API.Controllers;

[Authorize]
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

    /// <summary>
    /// 讀取 Redis 快照用的設定。Worker 以 camelCase 寫入,必須不分大小寫才讀得回
    /// (B19:原本用預設的區分大小寫設定,只有 di1 對得上,車速與設備代碼都變預設值)。
    /// </summary>
    private static readonly JsonSerializerOptions SnapshotOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// 取得即時監控快照。輸入:無。邏輯:讀 Redis 的 factory/monitor 並反序列化。
    /// 輸出:快照;Redis 沒有資料時回 204。
    /// </summary>
    [HttpGet("realtime")]
    public async Task<ActionResult<MonitorData>> GetRealtimeData()
    {
        var db = _redis.GetDatabase();
        var data = await db.StringGetAsync("factory/monitor");

        if (data.IsNullOrEmpty)
        {
            return NoContent();
        }

        return JsonSerializer.Deserialize<MonitorData>(data!, SnapshotOptions)!;
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
