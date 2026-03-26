using System.Text.Json;
using MQTTnet;
using MQTTnet.Client;
using StackExchange.Redis;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Models;
using PrintingIoT.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Worker.Services;

namespace PrintingIoT.Worker;

public class MqttWorker : BackgroundService
{
    private readonly ILogger<MqttWorker> _logger;
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ISpeedCalculator _speedCalculator;
    private readonly IDeviceLockManager _lockManager;
    private IMqttClient? _mqttClient;
    private IConnectionMultiplexer? _redis;
    private readonly string _brokerAddress;
    private readonly int _brokerPort;

    public MqttWorker(
        ILogger<MqttWorker> logger, 
        IConfiguration configuration, 
        IServiceScopeFactory scopeFactory,
        ISpeedCalculator speedCalculator,
        IDeviceLockManager lockManager)
    {
        _logger = logger;
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        
        _brokerAddress = _configuration["Mqtt:BrokerAddress"] ?? "localhost";
        _brokerPort = int.Parse(_configuration["Mqtt:Port"] ?? "1883");
        
        _speedCalculator = speedCalculator;
        _lockManager = lockManager;
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        var redisConn = _configuration["Redis:ConnectionString"] ?? "localhost:6379";
        _logger.LogInformation($"Connecting to Redis at {redisConn}");
        _redis = await ConnectionMultiplexer.ConnectAsync(redisConn);

        var factory = new MqttFactory();
        _mqttClient = factory.CreateMqttClient();

        var mqttOptions = new MqttClientOptionsBuilder()
            .WithTcpServer(_brokerAddress, _brokerPort)
            .WithClientId("BackendWorker")
            .Build();

        _mqttClient.ApplicationMessageReceivedAsync += HandleMessageAsync;

        _logger.LogInformation($"Connecting to MQTT Broker at {_brokerAddress}:{_brokerPort}");
        await _mqttClient.ConnectAsync(mqttOptions, cancellationToken);
        
        await _mqttClient.SubscribeAsync("factory/machine/update");

        var db = _redis.GetDatabase();
        var configJson = await db.StringGetAsync("config/communication");
        string wiseTopic = "Advantech/+/data"; 

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

            if (topic == "factory/machine/update")
            {
                await ProcessMachineUpdate(payload);
            }
            var parts = topic.Split('/');
            if (parts.Length >= 3 && parts[0] == "Advantech" && parts[2] == "data")
            {
                await ProcessWiseUpdate(topic, payload);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing MQTT message");
        }
    }

    private async Task ProcessWiseUpdate(string topic, string payload)
    {
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;

        var parts = topic.Split('/');
        var deviceId = parts.Length > 1 ? parts[1] : "WISE";

        long currentRaw = 0;
        bool hasQty = false;

        if (root.TryGetProperty("di1", out var di1Element) && di1Element.ValueKind == JsonValueKind.Number)
        {
            currentRaw = di1Element.GetInt64();
            hasQty = true;
        }

        if (!_lockManager.TryAcquireLock(deviceId)) return;
        
        var now = DateTime.UtcNow;
        decimal speed = await _speedCalculator.CalculateSpeedAsync(deviceId, currentRaw, now, hasQty);

        var monitorData = new MonitorData(deviceId, speed, currentRaw, "1", now);
        
        var db = _redis!.GetDatabase();
        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await db.StringSetAsync("factory/monitor", JsonSerializer.Serialize(monitorData, jsonOptions));
        await PublishMonitorUpdate(monitorData, jsonOptions);
    }

    private async Task ProcessMachineUpdate(string payload)
    {
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;

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
        
        if (deviceId == "unknown") _logger.LogWarning($"Sim Payload missing deviceId. Raw: {payload}");

        if (!_lockManager.TryAcquireLock(deviceId)) return;

        var log = new ProductionLog
        {
            DeviceId = deviceId,
            Speed = speed,
            TotalLength = length,
            Status = (MachineStatus)statusInt,
            Timestamp = DateTime.UtcNow
        };

        var db = _redis!.GetDatabase();
        var monitorData = new MonitorData(deviceId, speed, length, log.Status.ToString(), log.Timestamp);
        
        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await db.StringSetAsync("factory/monitor", JsonSerializer.Serialize(monitorData, jsonOptions));
        
        await PublishMonitorUpdate(monitorData, jsonOptions);

        using (var scope = _scopeFactory.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<PrintingContext>();
            dbContext.ProductionLogs.Add(log);
            await dbContext.SaveChangesAsync();
        }
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
