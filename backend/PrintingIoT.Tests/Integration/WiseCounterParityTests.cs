using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.API.Controllers;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Worker.Services;
using StackExchange.Redis;
using Xunit;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// 與 MM 的 WISE 數字對照(工單 T-20261119-13;MM `docs/spec20261122-1.md` §3、§5)。
/// 走真實的 WisePayloadParser → TelemetryPipeline → IntegrationController.Counter,
/// 只有 Redis / 速度 / 設備鎖以 Moq 假造,資料庫用 EF Core InMemory。
/// 取樣時間由測試指定(解析器本身蓋的是當下時間),以便控制歷史寫入的節流。
/// </summary>
public class WiseCounterParityTests
{
    private const string Topic = "Advantech/DEV-W3/data";
    private const int IntervalSeconds = 6; // 與展示環境目前的 data_log_interval 相同

    private readonly ServiceProvider _provider;
    private readonly WisePayloadParser _parser;
    private readonly TelemetryPipeline _pipeline;
    private readonly DateTime _t0 = new(2026, 11, 27, 0, 0, 0, DateTimeKind.Utc);

    public WiseCounterParityTests()
    {
        var mapping = new Mock<ISignalMappingProvider>();
        mapping.Setup(m => m.GetMappingAsync()).ReturnsAsync(new SignalMapping("di1", "di0"));
        mapping.Setup(m => m.GetDataLogIntervalSecondsAsync()).ReturnsAsync(IntervalSeconds);

        var redis = new Mock<IConnectionMultiplexer>();
        redis.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(new Mock<IDatabase>().Object);
        var locks = new Mock<IDeviceLockManager>();
        locks.Setup(l => l.TryAcquireLock(It.IsAny<string>())).Returns(true);
        var speed = new Mock<ISpeedCalculator>();
        speed.Setup(s => s.CalculateSpeedAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<DateTime>(), It.IsAny<bool>())).ReturnsAsync(0m);

        var dbName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<PrintingContext>(o => o.UseInMemoryDatabase(dbName));
        _provider = services.BuildServiceProvider();

        _parser = new WisePayloadParser(new Mock<ILogger<WisePayloadParser>>().Object, mapping.Object);
        _pipeline = new TelemetryPipeline(new Mock<ILogger<TelemetryPipeline>>().Object, speed.Object, locks.Object,
            redis.Object, _provider.GetRequiredService<IServiceScopeFactory>(), mapping.Object);
    }

    /// <summary>送一則 WISE 訊息。輸入:payload、距起點的秒數;輸出:是否成立為取樣(false = 整包被跳過)。</summary>
    private async Task<bool> SendAsync(string payload, double atSeconds)
    {
        var sample = await _parser.ParseAsync(Topic, payload);
        if (sample == null) return false;
        await _pipeline.ProcessAsync(sample with { TimestampUtc = _t0.AddSeconds(atSeconds) });
        return true;
    }

    /// <summary>呼叫 counter 端點。輸出:(HTTP 狀態, items 的 (id,count,resetBefore) 清單, nextSinceId)。</summary>
    private async Task<(int Status, List<(long Id, long Count, bool Reset)> Items, long Next)> CounterAsync(string deviceId, long? sinceId)
    {
        using var scope = _provider.CreateScope();
        var controller = new IntegrationController(scope.ServiceProvider.GetRequiredService<PrintingContext>(),
            new ConfigurationBuilder().Build())
        { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };

        var result = (ObjectResult)await controller.Counter(deviceId, sinceId, null, null);
        var status = result.StatusCode ?? 200;
        if (status != 200) return (status, new(), sinceId ?? 0);

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Value));
        var items = doc.RootElement.GetProperty("items").EnumerateArray()
            .Select(i => (i.GetProperty("id").GetInt64(), i.GetProperty("count").GetInt64(), i.GetProperty("resetBefore").GetBoolean()))
            .ToList();
        return (status, items, doc.RootElement.GetProperty("nextSinceId").GetInt64());
    }

    /// <summary>依契約 §4 模擬 MM 路徑 I3 的累加:resetBefore=false 加差值,true 把新值當增量。</summary>
    private static long Accumulate(long total, ref long last, IEnumerable<(long Id, long Count, bool Reset)> items)
    {
        foreach (var i in items)
        {
            total += i.Reset ? i.Count : i.Count - last;
            last = i.Count;
        }
        return total;
    }

    // MM spec §3 範例序列 100 → 250 → 30 → 80,每筆間隔超過節流秒數(每筆都會寫入歷史)
    [Fact]
    public async Task Counter_MatchesMmTable_WhenEverySampleIsLogged()
    {
        long total = 0, last;
        var readings = new List<long>();

        Assert.True(await SendAsync("""{"di0":1,"di1":100}""", 0));
        var baseline = await CounterAsync("dev-w3", null); // deviceId 不分大小寫
        Assert.Equal(200, baseline.Status);
        Assert.Equal((100L, false), (baseline.Items.Single().Count, baseline.Items.Single().Reset));
        last = 100; readings.Add(total);                    // 首次只取基準,不計入
        var cursor = baseline.Next;

        var step = 0;
        foreach (var n in new[] { 250, 30, 80 })
        {
            step++;
            Assert.True(await SendAsync($$"""{"di0":1,"di1":{{n}}}""", step * (IntervalSeconds + 1)));
            var poll = await CounterAsync("DEV-W3", cursor);
            total = Accumulate(total, ref last, poll.Items);
            cursor = poll.Next;
            readings.Add(total);
        }

        Assert.Equal(new long[] { 0, 150, 180, 230 }, readings); // 與 MM spec §3 的 I3 欄一致

        // 同一段若一次輪詢取回:旗標為 false / true / false
        var batch = await CounterAsync("DEV-W3", baseline.Next);
        Assert.Equal(new[] { (250L, false), (30L, true), (80L, false) }, batch.Items.Select(i => (i.Count, i.Reset)));
    }

    // 節流:同狀態且未達 data_log_interval 的訊息不寫歷史,counter 端點看不到
    [Fact]
    public async Task Counter_SkipsSamplesInsideLogInterval()
    {
        await SendAsync("""{"di0":1,"di1":100}""", 0);
        await SendAsync("""{"di0":1,"di1":250}""", 1);
        await SendAsync("""{"di0":1,"di1":30}""", 2);
        await SendAsync("""{"di0":1,"di1":80}""", 3);

        var baseline = await CounterAsync("DEV-W3", null);
        Assert.Equal(100, baseline.Items.Single().Count);
        Assert.Empty((await CounterAsync("DEV-W3", baseline.Next)).Items);
    }

    // 節流造成的盲區:兩次寫入之間歸零、且新值已超過前一筆 → resetBefore=false,歸零看不出來
    [Fact]
    public async Task Counter_CannotSeeReset_WhenNewValueAlreadyExceedsPrevious()
    {
        await SendAsync("""{"di0":1,"di1":250}""", 0);
        var baseline = await CounterAsync("DEV-W3", null);
        await SendAsync("""{"di0":1,"di1":10}""", 1);    // 歸零後的第一筆,落在節流區間內,不寫歷史
        await SendAsync("""{"di0":1,"di1":300}""", 7);   // 實際歸零後已跑 300 張

        var poll = await CounterAsync("DEV-W3", baseline.Next);
        Assert.Equal(new[] { (300L, false) }, poll.Items.Select(i => (i.Count, i.Reset)));
        // MM 依契約只會加 300 − 250 = 50,實際是 300
    }

    // 狀態改變一定寫歷史,不受節流限制
    [Fact]
    public async Task Counter_LogsImmediately_OnStatusChange()
    {
        await SendAsync("""{"di0":1,"di1":100}""", 0);
        var baseline = await CounterAsync("DEV-W3", null);
        await SendAsync("""{"di0":0,"di1":120}""", 1);

        var poll = await CounterAsync("DEV-W3", baseline.Next);
        Assert.Equal(new[] { (120L, false) }, poll.Items.Select(i => (i.Count, i.Reset)));
    }

    // 計數值解讀:與 MM spec §2 逐項對照(第三欄 = 本系統是否採用這筆)
    [Theory]
    [InlineData("""{"di0":1,"di1":12345.0}""", true, 12345)]   // 浮點取整數部分:與 MM 相同
    [InlineData("""{"di0":1,"di1":12345.9}""", true, 12345)]   // 截斷不四捨五入
    [InlineData("""{"di0":1,"DI-1":77}""", true, 77)]          // 欄位名正規化:與 MM 相同
    [InlineData("""{"di0":1,"di1":"250"}""", true, 250)]       // 數值字串:本系統採用,MM 不更新
    [InlineData("""{"di0":1,"di1":-5}""", true, -5)]           // 負數:本系統採用,MM 不更新
    [InlineData("""{"di0":1,"di1":true}""", false, 0)]         // 布林:兩邊都不採用
    [InlineData("""{"di0":1,"di1":[1]}""", false, 0)]          // 陣列:兩邊都不採用
    [InlineData("""{"di0":1}""", false, 0)]                    // 缺計數欄位:兩邊都不採用
    [InlineData("""{"di0":1,"di1":""", false, 0)]              // JSON 壞掉:整包丟棄
    public async Task Parser_CountInterpretation(string payload, bool accepted, long expected)
    {
        Assert.Equal(accepted, await SendAsync(payload, 0));
        var res = await CounterAsync("DEV-W3", null);
        if (!accepted) { Assert.Equal(404, res.Status); return; } // 沒有任何紀錄的設備 → 404
        Assert.Equal(expected, res.Items.Single().Count);
    }

    // 沒出現過的設備 → 404;游標超過最大 id → 410
    [Fact]
    public async Task Counter_UnknownDevice404_CursorBeyondMax410()
    {
        Assert.Equal(404, (await CounterAsync("NOPE", null)).Status);
        await SendAsync("""{"di0":1,"di1":100}""", 0);
        var baseline = await CounterAsync("DEV-W3", null);
        Assert.Equal(410, (await CounterAsync("DEV-W3", baseline.Next + 1000)).Status);
    }
}
