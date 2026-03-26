using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace PrintingIoT.Worker.Services;

public interface ISpeedCalculator
{
    Task<decimal> CalculateSpeedAsync(string deviceId, long currentRaw, DateTime now, bool hasQty);
}

public class SpeedCalculator : ISpeedCalculator
{
    private class DeviceState
    {
        public double LastCount { get; set; } = -1;
        public double LastSmoothedSpeed { get; set; } = 0;
        public DateTime LastTime { get; set; } = DateTime.MinValue;
    }

    private readonly ConcurrentDictionary<string, DeviceState> _deviceStates = new();
    private readonly ILogger<SpeedCalculator> _logger;
    private readonly IConnectionMultiplexer _redis;
    private double _maxSpeedCache = 350;
    private DateTime _lastConfigFetch = DateTime.MinValue;

    public SpeedCalculator(ILogger<SpeedCalculator> logger, IConnectionMultiplexer redis)
    {
        _logger = logger;
        _redis = redis;
    }

    public async Task<decimal> CalculateSpeedAsync(string deviceId, long currentRaw, DateTime now, bool hasQty)
    {
        var state = _deviceStates.GetOrAdd(deviceId, _ => new DeviceState());
        decimal speed = 0;

        await RefreshMaxSpeedCacheAsync();

        // Reset Detection
        if (state.LastCount != -1 && currentRaw < state.LastCount)
        {
            _logger.LogInformation($"Count Reset Detected for {deviceId}: {state.LastCount} -> {currentRaw}");
            state.LastCount = currentRaw;
            state.LastSmoothedSpeed = 0;
            speed = 0;
        }
        else if (state.LastCount != -1 && hasQty)
        {
            var diff = currentRaw - (long)state.LastCount; 
            var timeDiff = (now - state.LastTime).TotalMinutes;
            
            if (diff == 0)
            {
                state.LastSmoothedSpeed = 0;
                speed = 0;
            }
            else if (timeDiff > 0.008) // ~0.5 seconds
            {
                decimal currentInstantSpeed = (decimal)(diff / timeDiff);
                if (currentInstantSpeed < 0) currentInstantSpeed = 0; 
                
                if (currentInstantSpeed > (decimal)_maxSpeedCache) 
                    currentInstantSpeed = (decimal)_maxSpeedCache;

                // EMA 
                double alpha = 0.1; 
                double smoothed = ((double)currentInstantSpeed * alpha) + (state.LastSmoothedSpeed * (1 - alpha));
                if (double.IsNaN(smoothed) || double.IsInfinity(smoothed)) smoothed = 0;
                
                if (smoothed < 1.0) smoothed = 0;
                if (smoothed > _maxSpeedCache) smoothed = _maxSpeedCache;

                state.LastSmoothedSpeed = smoothed;
                speed = (decimal)smoothed;
            }
        }
        
        if (hasQty) 
        {
            state.LastCount = (double)currentRaw;
            state.LastTime = now;
        }
        
        return speed < 0 ? 0 : speed;
    }

    private async Task RefreshMaxSpeedCacheAsync()
    {
        if ((DateTime.UtcNow - _lastConfigFetch).TotalMinutes < 1) return;

        try 
        {
            var conf = await _redis.GetDatabase().StringGetAsync("config/communication");
            if (conf.HasValue) 
            {
                using var d = JsonDocument.Parse(conf.ToString());
                if (d.RootElement.TryGetProperty("max_speed", out var ms)) 
                {
                    _maxSpeedCache = ms.GetDouble();
                }
            }
            _lastConfigFetch = DateTime.UtcNow;
        } 
        catch (Exception ex)
        {
            _logger.LogWarning($"Failed to refresh max speed cache: {ex.Message}");
        }
    }
}
