using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Worker.Services;
using StackExchange.Redis;
using Xunit;

namespace PrintingIoT.Tests.Worker;

/// <summary>
/// S2:統一遙測管線(AC-01、AC-02、AC-07、AC-12)。
/// 以 EF Core InMemory 建 IServiceScopeFactory,Redis / 速度 / 設備鎖以 Moq 假造。
/// </summary>
public class TelemetryPipelineTests
{
    private readonly Mock<ILogger<TelemetryPipeline>> _loggerMock = new();
    private readonly Mock<ISpeedCalculator> _speedMock = new();
    private readonly Mock<IDeviceLockManager> _lockMock = new();
    private readonly Mock<IConnectionMultiplexer> _redisMock = new();
    private readonly Mock<IDatabase> _dbMock = new();
    private readonly Mock<ISignalMappingProvider> _mappingMock = new();
    private readonly ServiceProvider _provider;

    public TelemetryPipelineTests()
    {
        _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_dbMock.Object);
        _lockMock.Setup(l => l.TryAcquireLock(It.IsAny<string>())).Returns(true);
        _speedMock.Setup(s => s.CalculateSpeedAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<DateTime>(), It.IsAny<bool>()))
                  .ReturnsAsync(42m);
        _mappingMock.Setup(m => m.GetDataLogIntervalSecondsAsync()).ReturnsAsync(300);
        _mappingMock.Setup(m => m.GetMappingAsync()).ReturnsAsync(new SignalMapping("di1", "di0"));

        // 資料庫名稱必須先算好:放在 lambda 內每次建 DbContext 都會產生新名稱,兩個 scope 就看不到彼此的資料
        var dbName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<PrintingContext>(o => o.UseInMemoryDatabase(dbName));
        _provider = services.BuildServiceProvider();
    }

    /// <summary>建立受測管線。輸出:接好所有假造相依的 TelemetryPipeline。</summary>
    private TelemetryPipeline CreatePipeline() => new(
        _loggerMock.Object,
        _speedMock.Object,
        _lockMock.Object,
        _redisMock.Object,
        _provider.GetRequiredService<IServiceScopeFactory>(),
        _mappingMock.Object);

    /// <summary>讀出目前 InMemory 資料庫中的所有 ProductionLogs。</summary>
    private List<ProductionLog> ReadLogs()
    {
        using var scope = _provider.CreateScope();
        return scope.ServiceProvider.GetRequiredService<PrintingContext>()
                    .ProductionLogs.AsNoTracking().ToList();
    }

    // AC-01:WISE 取樣會寫入 ProductionLogs,欄位與輸入一致
    [Fact]
    public async Task TelemetryPipeline_ShouldWriteProductionLog_ForWiseSample()
    {
        var pipeline = CreatePipeline();
        var now = DateTime.UtcNow;
        var sample = new MachineSample("74FE48123456", TelemetrySource.Wise, 12345, null, MachineStatus.Running, now);

        var monitorData = await pipeline.ProcessAsync(sample);

        var logs = ReadLogs();
        Assert.Single(logs);
        Assert.Equal("74FE48123456", logs[0].DeviceId);
        Assert.Equal(12345m, logs[0].TotalLength);
        Assert.Equal(MachineStatus.Running, logs[0].Status);
        Assert.Equal(42m, logs[0].Speed);

        Assert.NotNull(monitorData);
        Assert.Equal("Running", monitorData!.Status);
        Assert.Equal("wise", monitorData.Source);
        Assert.Equal(12345m, monitorData.DI1);
    }

    // AC-02:兩條路徑寫出的列可用 Source 分離
    [Fact]
    public async Task TelemetryPipeline_ShouldTagSource_PerPath()
    {
        var pipeline = CreatePipeline();
        var now = DateTime.UtcNow;

        await pipeline.ProcessAsync(new MachineSample("74FE48123456", TelemetrySource.Wise, 100, null, MachineStatus.Running, now));
        await pipeline.ProcessAsync(new MachineSample("SIMULATOR", TelemetrySource.Simulator, 200, 5m, MachineStatus.Running, now));

        var logs = ReadLogs();
        Assert.Equal(2, logs.Count);
        Assert.Equal(TelemetrySource.Wise, logs.Single(l => l.DeviceId == "74FE48123456").Source);
        Assert.Equal(TelemetrySource.Simulator, logs.Single(l => l.DeviceId == "SIMULATOR").Source);
        Assert.Single(logs, l => l.Source != TelemetrySource.Simulator);
    }

    // 模擬器已提供速度時不呼叫 SpeedCalculator,直接沿用該速度
    [Fact]
    public async Task TelemetryPipeline_ShouldUseProvidedSpeed_ForSimulatorSample()
    {
        var pipeline = CreatePipeline();

        var monitorData = await pipeline.ProcessAsync(
            new MachineSample("SIMULATOR", TelemetrySource.Simulator, 200, 33m, MachineStatus.Idle, DateTime.UtcNow));

        Assert.NotNull(monitorData);
        Assert.Equal(33m, monitorData!.Speed);
        Assert.Equal("simulator", monitorData.Source);
        _speedMock.Verify(s => s.CalculateSpeedAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<DateTime>(), It.IsAny<bool>()), Times.Never);
    }

    // AC-07:sample 為 null 時什麼都不做 —— 沒有 Redis 寫入、沒有資料庫新列
    [Fact]
    public async Task TelemetryPipeline_ShouldSkipEverything_WhenSampleIsNull()
    {
        var pipeline = CreatePipeline();

        var monitorData = await pipeline.ProcessAsync(null);

        Assert.Null(monitorData);
        Assert.Empty(ReadLogs());
        _dbMock.Verify(d => d.StringSetAsync(
            It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<TimeSpan?>(),
            It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()), Times.Never);
    }

    // 設備鎖拒絕時同樣不寫快照、不寫歷史、不發布
    [Fact]
    public async Task TelemetryPipeline_ShouldSkipEverything_WhenLockRejected()
    {
        _lockMock.Setup(l => l.TryAcquireLock(It.IsAny<string>())).Returns(false);
        var pipeline = CreatePipeline();

        var monitorData = await pipeline.ProcessAsync(
            new MachineSample("sim", TelemetrySource.Simulator, 1, 1m, MachineStatus.Running, DateTime.UtcNow));

        Assert.Null(monitorData);
        Assert.Empty(ReadLogs());
        _dbMock.Verify(d => d.StringSetAsync(
            It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<TimeSpan?>(),
            It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()), Times.Never);
    }

    // AC-12:同狀態且未達間隔的連續兩筆只寫 1 列;超過間隔才再寫
    [Fact]
    public async Task TelemetryPipeline_ShouldThrottleLogs_ByInterval()
    {
        var pipeline = CreatePipeline();
        var t0 = DateTime.UtcNow;

        await pipeline.ProcessAsync(new MachineSample("dev-1", TelemetrySource.Wise, 100, null, MachineStatus.Running, t0));
        await pipeline.ProcessAsync(new MachineSample("dev-1", TelemetrySource.Wise, 101, null, MachineStatus.Running, t0.AddSeconds(1)));

        Assert.Single(ReadLogs());

        await pipeline.ProcessAsync(new MachineSample("dev-1", TelemetrySource.Wise, 200, null, MachineStatus.Running, t0.AddSeconds(300)));

        Assert.Equal(2, ReadLogs().Count);
    }

    // AC-12:狀態轉換即使未達間隔也必須留下紀錄
    [Fact]
    public async Task TelemetryPipeline_ShouldWriteLog_OnStatusChange()
    {
        var pipeline = CreatePipeline();
        var t0 = DateTime.UtcNow;

        await pipeline.ProcessAsync(new MachineSample("dev-1", TelemetrySource.Wise, 100, null, MachineStatus.Running, t0));
        await pipeline.ProcessAsync(new MachineSample("dev-1", TelemetrySource.Wise, 100, null, MachineStatus.Idle, t0.AddSeconds(2)));

        var logs = ReadLogs();
        Assert.Equal(2, logs.Count);
        Assert.Contains(logs, l => l.Status == MachineStatus.Idle);
    }

    // 節流狀態以 deviceId 分開記錄,多台設備交錯不互相影響
    [Fact]
    public async Task TelemetryPipeline_ShouldTrackThrottleState_PerDevice()
    {
        var pipeline = CreatePipeline();
        var t0 = DateTime.UtcNow;

        await pipeline.ProcessAsync(new MachineSample("dev-1", TelemetrySource.Wise, 100, null, MachineStatus.Running, t0));
        await pipeline.ProcessAsync(new MachineSample("dev-2", TelemetrySource.Wise, 100, null, MachineStatus.Running, t0));
        await pipeline.ProcessAsync(new MachineSample("dev-1", TelemetrySource.Wise, 101, null, MachineStatus.Running, t0.AddSeconds(1)));

        var logs = ReadLogs();
        Assert.Equal(2, logs.Count);
    }

    // 資料庫寫入失敗時,即時快照仍照常回傳
    [Fact]
    public async Task TelemetryPipeline_ShouldStillReturnMonitorData_WhenDbFails()
    {
        var brokenProvider = new ServiceCollection().BuildServiceProvider(); // 取不到 PrintingContext
        var pipeline = new TelemetryPipeline(
            _loggerMock.Object, _speedMock.Object, _lockMock.Object, _redisMock.Object,
            brokenProvider.GetRequiredService<IServiceScopeFactory>(), _mappingMock.Object);

        var monitorData = await pipeline.ProcessAsync(
            new MachineSample("dev-1", TelemetrySource.Wise, 100, null, MachineStatus.Running, DateTime.UtcNow));

        Assert.NotNull(monitorData);
        Assert.Equal("Running", monitorData!.Status);
    }
}
