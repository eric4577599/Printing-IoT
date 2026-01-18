using System.Text.Json;
using MQTTnet;
using MQTTnet.Client;
using StackExchange.Redis;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Models;
using PrintingIoT.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PrintingIoT.Worker;

public class MqttWorker : BackgroundService
{
    private readonly ILogger<MqttWorker> _logger;
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private IMqttClient? _mqttClient;
    private IConnectionMultiplexer? _redis;
    private readonly string _brokerAddress;
    private readonly int _brokerPort;
    
    // Concurrency Lock
    private string? _lockedDeviceId = null;
    private DateTime _lastLockUpdate = DateTime.MinValue;
    
    // Helper to identify "Real" Hardware (MAC Address format)
    private bool IsHardwareId(string id) => id.Length == 12 && !id.Contains("-"); 

    public MqttWorker(
        ILogger<MqttWorker> logger, 
        IConfiguration configuration, IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        
        _brokerAddress = _configuration["Mqtt:BrokerAddress"] ?? "localhost";
        _brokerPort = int.Parse(_configuration["Mqtt:Port"] ?? "1883");
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        // Redis Connection
        var redisConn = _configuration["Redis:ConnectionString"] ?? "localhost:6379";
        _logger.LogInformation($"Connecting to Redis at {redisConn}");
        _redis = await ConnectionMultiplexer.ConnectAsync(redisConn);

        // MQTT Client Setup
        var factory = new MqttFactory();
        _mqttClient = factory.CreateMqttClient();

        var mqttOptions = new MqttClientOptionsBuilder()
            .WithTcpServer(_brokerAddress, _brokerPort)
            .WithClientId("BackendWorker")
            .Build();

        _mqttClient.ApplicationMessageReceivedAsync += HandleMessageAsync;

        _logger.LogInformation($"Connecting to MQTT Broker at {_brokerAddress}:{_brokerPort}");
        await _mqttClient.ConnectAsync(mqttOptions, cancellationToken);
        
        // 1. Subscribe to Internal Updates
        await _mqttClient.SubscribeAsync("factory/machine/update");

        // 2. Subscribe to WISE Data (Dynamic Topic from Settings)
        var db = _redis.GetDatabase();
        var configJson = await db.StringGetAsync("config/communication");
        string wiseTopic = "Advantech/+/data"; // Default wildcard

        if (configJson.HasValue)
        {
            try
            {
                using var doc = JsonDocument.Parse(configJson.ToString());
                if (doc.RootElement.TryGetProperty("mqtt_topic", out var topicEl))
                {
                    var configured = topicEl.GetString();
                    if (!string.IsNullOrEmpty(configured))
                    {
                        wiseTopic = configured;
                        _logger.LogInformation($"Using Configured MQTT Topic: {wiseTopic}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse communication config from Redis");
            }
        }
        else
        {
             _logger.LogInformation($"No config found in Redis, using default topic: {wiseTopic}");
        }

        await _mqttClient.SubscribeAsync(wiseTopic);

        await base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            if (!_mqttClient.IsConnected)
            {
                _logger.LogWarning("MQTT Client disconnected. Reconnecting...");
            }
            await Task.Delay(10000, stoppingToken);
        }
    }

    private async Task HandleMessageAsync(MqttApplicationMessageReceivedEventArgs e)
    {
        try
        {
            var topic = e.ApplicationMessage.Topic;
            var payload = e.ApplicationMessage.ConvertPayloadToString();
            
            _logger.LogInformation($"Received message on {topic}: {payload}");

            if (topic == "factory/machine/update")
            {
                await ProcessMachineUpdate(payload);
            }
            var parts = topic.Split('/');
            if (parts.Length >= 3 && parts[0] == "Advantech" && parts[2] == "data")
            {
                await ProcessWiseUpdate(topic, payload);
            }
            else
            {
                _logger.LogWarning($"Ignored message on topic: {topic}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing MQTT message");
        }
    }

    // State for per-device speed calculation
    private class DeviceState
    {
        public double LastCount { get; set; } = -1;
        public double LastSmoothedSpeed { get; set; } = 0;
        public DateTime LastTime { get; set; } = DateTime.MinValue;
    }

    private readonly System.Collections.Concurrent.ConcurrentDictionary<string, DeviceState> _deviceStates = new();

    private const double WheelDiameterMm = 100.0; 
    private const double PulseRatio = 1.0; 

    private async Task ProcessWiseUpdate(string topic, string payload)
    {
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;

        // Extract Device ID
        var parts = topic.Split('/');
        var deviceId = parts.Length > 1 ? parts[1] : "WISE";
        
        // Get or Create State for this Device
        var state = _deviceStates.GetOrAdd(deviceId, _ => new DeviceState());

        // Logic: Use DI1 as Production Quantity (User Request)
        // With Session Persistence: Display = Raw(DI1) - Offset
        
        long currentRaw = 0;
        bool hasQty = false;

        // Prioritize DI1 as per latest user request
        if (root.TryGetProperty("di1", out var di1Element) && di1Element.ValueKind == JsonValueKind.Number)
        {
            currentRaw = di1Element.GetInt64();
            hasQty = true;
        }

        // --- DEVICE LOCKING LOGIC ---
        if (!CheckDeviceLock(deviceId)) return;
        
        // Take/Renew lock
        _lockedDeviceId = deviceId;
        _lastLockUpdate = DateTime.UtcNow;
        // ----------------------------
        
        decimal speed = 0;
        
        // 1. Get/Init Offset from Redis (Persistent Session)
        // Note: Ideally offset should also be per-device "factory/machine/{deviceId}/offset"
        // For now, keeping global "factory/machine/offset" as legacy/single-machine MVP, 
        // but arguably we should split it if we have multiple real machines.
        // Assuming user only cares about the REAL machine 74FE... for the UI "Production Qty".
        
        var db = _redis!.GetDatabase();
        long offset = 0;
        // REMOVED OFFSET LOGIC as per user request to use "di1 only"
        // Frontend will handle "Session Offset" for "Production Qty".
        // Backend simply relays the raw DI1 counter.
        
        decimal rawDI1 = (decimal)currentRaw;
        // decimal netLength = (decimal)(currentRaw - offset); // LEGACY

        var now = DateTime.UtcNow;

        // Read dynamic Max Speed from Redis (default 350 if missing)
        double maxSpeedDef = 350;
        try {
            var conf = await _redis.GetDatabase().StringGetAsync("config/communication");
            if (conf.HasValue) {
                using var d = JsonDocument.Parse(conf.ToString());
                if (d.RootElement.TryGetProperty("max_speed", out var ms)) maxSpeedDef = ms.GetDouble();
            }
        } catch {}

        // Reset Detection: If currentRaw drops significantly (e.g. PLC reset), reset state
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
            
            // Debounce or Stop
            if (diff == 0)
            {
                 state.LastSmoothedSpeed = 0;
                 speed = 0;
            }
            else if (timeDiff > 0.008) // ~0.5 seconds
            {
                decimal currentInstantSpeed = (decimal)(diff / timeDiff);
                if (currentInstantSpeed < 0) currentInstantSpeed = 0; 
                
                // Cap at Max Speed (Prevent physical impossible values)
                if (currentInstantSpeed > (decimal)maxSpeedDef) currentInstantSpeed = (decimal)maxSpeedDef;

                // EMA - Tune Alpha for smoother display (0.1 = Very Smooth, 0.2 = Responsive)
                double alpha = 0.1; 
                double smoothed = ((double)currentInstantSpeed * alpha) + (state.LastSmoothedSpeed * (1 - alpha));
                if (double.IsNaN(smoothed) || double.IsInfinity(smoothed)) smoothed = 0;
                
                // Zero-Clamp: If calculated speed is very low, force 0
                if (smoothed < 1.0) smoothed = 0;

                // Final Cap on Smoothed
                if (smoothed > maxSpeedDef) smoothed = maxSpeedDef;

                state.LastSmoothedSpeed = smoothed;
                speed = (decimal)smoothed;
            }
            // If timeDiff is huge (e.g. paused for hours), we should likely reset speed to 0?
            else if (timeDiff > 0.05) // Check stability
            {
                 // Keep previous speed? Or decay?
                 // Simple decay if no pulses
            }
        }
        
        if (hasQty) 
        {
            state.LastCount = (double)currentRaw;
             state.LastTime = now; // Only update time if we had quantity to process? 
             // Actually, always updating time is correct for delta-time calc.
        }
        // If not hasQty, do not update LastCount/Time? 
        // If invalid payload, we should probably ignore it entirely.
        if (hasQty) state.LastTime = now;
        
        // Final Safety
        if (speed < 0) speed = 0;

        var monitorData = new MonitorData(deviceId, speed, rawDI1, "1" /* Running */, now);
        
        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await db.StringSetAsync("factory/monitor", JsonSerializer.Serialize(monitorData, jsonOptions));
        await PublishMonitorUpdate(monitorData, jsonOptions);
    }
    


    private async Task ProcessMachineUpdate(string payload)
    {
        // Expected payload: { "deviceId": "d1", "speed": 120.5, "length": 5000, "status": 1 }
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;

        // Flexible Parsing (Case Insensitive / Alternative Names)
        string deviceId = "unknown";
        if (root.TryGetProperty("deviceId", out var dId)) deviceId = dId.GetString() ?? "unknown";
        
        decimal speed = 0;
        if (root.TryGetProperty("speed", out var sp)) speed = sp.GetDecimal();
        else if (root.TryGetProperty("line_speed", out var lsp)) speed = lsp.GetDecimal();

        decimal length = 0;
        if (root.TryGetProperty("length", out var len)) length = len.GetDecimal();
        else if (root.TryGetProperty("total_length", out var tlen)) length = tlen.GetDecimal();
        else if (root.TryGetProperty("d1", out var d1)) length = d1.GetDecimal();

        int statusInt = 0;
        if (root.TryGetProperty("status", out var st)) statusInt = st.GetInt32();
        else if (root.TryGetProperty("status_code", out var stc)) statusInt = stc.GetInt32();
        
        // Log mismatch debug
        if (deviceId == "unknown") _logger.LogWarning($"Sim Payload missing deviceId. Raw: {payload}");

        // Log mismatch debug
        if (deviceId == "unknown") _logger.LogWarning($"Sim Payload missing deviceId. Raw: {payload}");

        // --- DEVICE LOCKING LOGIC (SIM) ---
        if (!CheckDeviceLock(deviceId)) return;
        
        _lockedDeviceId = deviceId;
        _lastLockUpdate = DateTime.UtcNow;
        // ----------------------------------

        var log = new ProductionLog
        {
            DeviceId = deviceId,
            Speed = speed,
            TotalLength = length, // Keep DB log naming if EF entity not changed? Check Entity.
            Status = (MachineStatus)statusInt,
            Timestamp = DateTime.UtcNow
        };

        // 1. Save to Redis (Hot Data for Frontend)
        var db = _redis!.GetDatabase();
        // Use "length" from payload as DI1
        var monitorData = new MonitorData(deviceId, speed, length, log.Status.ToString(), log.Timestamp);
        
        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await db.StringSetAsync("factory/monitor", JsonSerializer.Serialize(monitorData, jsonOptions));
        
        await PublishMonitorUpdate(monitorData, jsonOptions);

        // 2. Save to DB
        using (var scope = _scopeFactory.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<PrintingContext>();
            // Only add if not recently added (Debounce?) - For now just add
            dbContext.ProductionLogs.Add(log);
            await dbContext.SaveChangesAsync();
        }
    }

    private bool CheckDeviceLock(string candidateId)
    {
        // 1. If no lock, allow (and set lock later)
        if (_lockedDeviceId == null) 
        {
            _logger.LogInformation($"[Lock] Init Lock to {candidateId}");
            return true;
        }

        // 2. If same device, allow
        if (_lockedDeviceId == candidateId) return true;

        var currentIsHardware = IsHardwareId(_lockedDeviceId);
        var candidateIsHardware = IsHardwareId(candidateId);

        // 3. If locked to Hardware, and Candidate is NOT Hardware -> REJECT PERMANENTLY
        if (currentIsHardware && !candidateIsHardware)
        {
            // _logger.LogWarning($"[Lock] REJECT {candidateId} (Soft) - Locked to {_lockedDeviceId} (Hard)");
            return false;
        }

        // 4. If locked to Hardware, and Candidate IS Hardware -> Allow switch only if lock expired (>30s)
        if (currentIsHardware && candidateIsHardware)
        {
             if ((DateTime.UtcNow - _lastLockUpdate).TotalSeconds < 30) return false;
             _logger.LogInformation($"[Lock] SWITCH Hardware {_lockedDeviceId} -> {candidateId}");
             return true;
        }

        // 5. If locked to Software/Sim (Weak Lock) -> Allow Switch logic
        // If Candidate is Hardware -> ALLOW IMMEDIATELY (Upgrade lock)
        if (candidateIsHardware) 
        {
            _logger.LogInformation($"[Lock] UPGRADE {_lockedDeviceId} (Soft) -> {candidateId} (Hard)");
            return true;
        }

        // If both are Software -> Check timeout
        if ((DateTime.UtcNow - _lastLockUpdate).TotalSeconds < 10) return false;
        
        _logger.LogInformation($"[Lock] SWITCH Software {_lockedDeviceId} -> {candidateId}");
        return true;
    }



    private async Task PublishMonitorUpdate(MonitorData data, JsonSerializerOptions? options = null)
    {
        if (_mqttClient != null && _mqttClient.IsConnected)
        {
            var message = new MqttApplicationMessageBuilder()
                .WithTopic("factory/monitor/update")
                .WithPayload(JsonSerializer.Serialize(data, options))
                .Build();

            await _mqttClient.PublishAsync(message);
        }
    }
}
