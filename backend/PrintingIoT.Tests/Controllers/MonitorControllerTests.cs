using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.API.Controllers;
using PrintingIoT.Core.Models;
using PrintingIoT.Infrastructure.Data;
using StackExchange.Redis;
using System.Text.Json;

namespace PrintingIoT.Tests.Controllers;

/// <summary>
/// MonitorController 單元測試(B19:車速送不到前端)。
/// 根因:Worker 以 camelCase 把快照寫進 Redis,API 讀取時用了區分大小寫的預設設定,
/// 只有帶 JsonPropertyName 的 di1 對得上,其餘欄位全部落回預設值。
/// </summary>
public class MonitorControllerTests : IDisposable
{
    private readonly PrintingContext _context;

    public MonitorControllerTests()
    {
        var options = new DbContextOptionsBuilder<PrintingContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new PrintingContext(options);
    }

    public void Dispose() => _context.Dispose();

    /// <summary>
    /// 建立控制器,Redis 的 factory/monitor 回傳指定字串。
    /// 輸入:Redis 內容(null 代表沒有資料)。輸出:控制器。
    /// </summary>
    private MonitorController CreateController(string? redisValue)
    {
        var db = new Mock<IDatabase>();
        db.Setup(d => d.StringGetAsync("factory/monitor", It.IsAny<CommandFlags>()))
            .ReturnsAsync(redisValue is null ? RedisValue.Null : (RedisValue)redisValue);
        var redis = new Mock<IConnectionMultiplexer>();
        redis.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(db.Object);
        return new MonitorController(_context, redis.Object, new Mock<ILogger<MonitorController>>().Object);
    }

    /// <summary>以 Worker 實際使用的設定(camelCase)序列化,確保測試資料與正式資料同形。</summary>
    private static string WorkerJson(MonitorData data) =>
        JsonSerializer.Serialize(data, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

    [Fact]
    public async Task GetRealtimeData_WorkerCamelCaseJson_AllFieldsPreserved()
    {
        var ts = new DateTime(2026, 11, 13, 1, 2, 3, DateTimeKind.Utc);
        var json = WorkerJson(new MonitorData("PRESS-01", 50m, 1234m, "Running", ts, "wise"));

        var result = await CreateController(json).GetRealtimeData();

        var data = Assert.IsType<MonitorData>(result.Value);
        Assert.Equal("PRESS-01", data.DeviceId);
        Assert.Equal(50m, data.Speed);
        Assert.Equal(1234m, data.DI1);
        Assert.Equal("Running", data.Status);
        Assert.Equal(ts, data.Timestamp);
        Assert.Equal("wise", data.Source);
    }

    [Fact]
    public async Task GetRealtimeData_NoData_ReturnsNoContent()
    {
        var result = await CreateController(null).GetRealtimeData();

        Assert.IsType<NoContentResult>(result.Result);
    }
}
