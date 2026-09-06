using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Models;
using PrintingIoT.Infrastructure.Data;
using StackExchange.Redis;

namespace PrintingIoT.Worker.Services;

public interface ITelemetryPipeline
{
    Task<MonitorData?> ProcessAsync(MachineSample? sample);
}

/// <summary>
/// 統一遙測管線:真機與模擬器共用同一條「上鎖 → 算速度 → 寫快照 → 寫歷史」流程,
/// 差異只留在最前面的 payload 解析器。管線不碰 MQTT,發布由 MqttWorker 負責,以利測試。
/// </summary>
public class TelemetryPipeline : ITelemetryPipeline
{
    /// <summary>節流狀態:記錄每台設備上次寫入歷史的時間與當時狀態。</summary>
    private record LogState(DateTime LastWriteUtc, MachineStatus LastStatus);

    private static readonly JsonSerializerOptions JsonOptions =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly ConcurrentDictionary<string, LogState> _logStates = new();

    private readonly ILogger<TelemetryPipeline> _logger;
    private readonly ISpeedCalculator _speedCalculator;
    private readonly IDeviceLockManager _lockManager;
    private readonly IConnectionMultiplexer _redis;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ISignalMappingProvider _mappingProvider;

    public TelemetryPipeline(
        ILogger<TelemetryPipeline> logger,
        ISpeedCalculator speedCalculator,
        IDeviceLockManager lockManager,
        IConnectionMultiplexer redis,
        IServiceScopeFactory scopeFactory,
        ISignalMappingProvider mappingProvider)
    {
        _logger = logger;
        _speedCalculator = speedCalculator;
        _lockManager = lockManager;
        _redis = redis;
        _scopeFactory = scopeFactory;
        _mappingProvider = mappingProvider;
    }

    /// <summary>
    /// 處理一筆取樣。
    /// 輸入:已解析的 MachineSample(可為 null)。
    /// 邏輯:null 或搶不到設備鎖直接跳過;否則算速度 → 寫 Redis 快照 → 依節流規則寫 ProductionLogs。
    /// 輸出:組好的 MonitorData(供呼叫端發布),或 null 表示本筆不處理。
    /// </summary>
    public async Task<MonitorData?> ProcessAsync(MachineSample? sample)
    {
        if (sample == null) return null;

        if (!_lockManager.TryAcquireLock(sample.DeviceId)) return null;

        // 管線只在確定有計數時才被呼叫,因此 hasQty 恆為 true
        var speed = sample.ProvidedSpeed
            ?? await _speedCalculator.CalculateSpeedAsync(sample.DeviceId, sample.Count, sample.TimestampUtc, true);

        var monitorData = new MonitorData(
            sample.DeviceId,
            speed,
            sample.Count,
            sample.Status.ToString(),
            sample.TimestampUtc,
            sample.Source.ToString().ToLowerInvariant());

        await _redis.GetDatabase().StringSetAsync("factory/monitor", JsonSerializer.Serialize(monitorData, JsonOptions));

        if (await ShouldWriteLogAsync(sample))
        {
            await WriteProductionLogAsync(sample, speed);
        }

        return monitorData;
    }

    /// <summary>
    /// 判定本筆是否要寫入歷史(節流)。
    /// 輸入:取樣。邏輯:該設備第一筆必寫;狀態與上次寫入不同必寫;距上次寫入達 data_log_interval 必寫。
    /// 輸出:true 表示要寫。判定為 true 時同時更新節流狀態。
    /// </summary>
    private async Task<bool> ShouldWriteLogAsync(MachineSample sample)
    {
        var intervalSeconds = await _mappingProvider.GetDataLogIntervalSecondsAsync();
        var interval = TimeSpan.FromSeconds(intervalSeconds);

        var shouldWrite = true;
        if (_logStates.TryGetValue(sample.DeviceId, out var state))
        {
            shouldWrite = state.LastStatus != sample.Status
                          || (sample.TimestampUtc - state.LastWriteUtc) >= interval;
        }

        if (shouldWrite)
        {
            _logStates[sample.DeviceId] = new LogState(sample.TimestampUtc, sample.Status);
        }

        return shouldWrite;
    }

    /// <summary>
    /// 寫入一列 ProductionLog。
    /// 輸入:取樣與已算好的速度。邏輯:以 IServiceScopeFactory 取 PrintingContext 新增後存檔。
    /// 輸出:無;寫入失敗只記 LogError,不影響即時快照與發布。
    /// </summary>
    private async Task WriteProductionLogAsync(MachineSample sample, decimal speed)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<PrintingContext>();
            dbContext.ProductionLogs.Add(new ProductionLog
            {
                DeviceId = sample.DeviceId,
                Speed = speed,
                TotalLength = sample.Count,
                Status = sample.Status,
                Source = sample.Source,
                Timestamp = sample.TimestampUtc
            });
            await dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to write ProductionLog for {sample.DeviceId}");
        }
    }
}
