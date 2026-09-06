using System.Text.Json;
using MQTTnet;
using MQTTnet.Client;
using StackExchange.Redis;
using PrintingIoT.Core.Models;
using PrintingIoT.Worker.Services;

namespace PrintingIoT.Worker;

public class MqttWorker : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly ILogger<MqttWorker> _logger;
    private readonly IConfiguration _configuration;
    private readonly IWisePayloadParser _wiseParser;
    private readonly ITelemetryPipeline _pipeline;
    private IMqttClient? _mqttClient;
    private IConnectionMultiplexer? _redis;
    private readonly string _brokerAddress;
    private readonly int _brokerPort;

    public MqttWorker(
        ILogger<MqttWorker> logger,
        IConfiguration configuration,
        IWisePayloadParser wiseParser,
        ITelemetryPipeline pipeline)
    {
        _logger = logger;
        _configuration = configuration;

        _brokerAddress = _configuration["Mqtt:BrokerAddress"] ?? "localhost";
        _brokerPort = int.Parse(_configuration["Mqtt:Port"] ?? "1883");

        _wiseParser = wiseParser;
        _pipeline = pipeline;
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
        // BackgroundService guarantees StartAsync completes (and assigns _mqttClient) before ExecuteAsync runs.
        while (!stoppingToken.IsCancellationRequested)
        {
            if (!_mqttClient!.IsConnected)
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

    /// <summary>
    /// 處理真機訊息。
    /// 輸入:MQTT topic 與 payload。邏輯:解析成 MachineSample 後交給統一管線,取得 MonitorData 才發布。
    /// 輸出:無;解析失敗(回 null)時什麼都不做。
    /// </summary>
    private async Task ProcessWiseUpdate(string topic, string payload)
    {
        var sample = await _wiseParser.ParseAsync(topic, payload);
        var monitorData = await _pipeline.ProcessAsync(sample);
        if (monitorData != null) await PublishMonitorUpdate(monitorData, JsonOptions);
    }

    /// <summary>
    /// 處理模擬器訊息。
    /// 輸入:payload。邏輯:與真機共用同一條管線,只差在解析器。
    /// 輸出:無;解析失敗或被設備鎖擋下時不發布。
    /// </summary>
    private async Task ProcessMachineUpdate(string payload)
    {
        var sample = SimulatorPayloadParser.Parse(payload, _logger);
        var monitorData = await _pipeline.ProcessAsync(sample);
        if (monitorData != null) await PublishMonitorUpdate(monitorData, JsonOptions);
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
