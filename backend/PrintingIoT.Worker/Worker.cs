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
    private MqttClientOptions? _mqttOptions;
    private long _lastMessageTicks = DateTime.UtcNow.Ticks;

    /// <summary>連線正常時的檢查間隔。</summary>
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(10);
    /// <summary>重連退避上限。</summary>
    private static readonly TimeSpan MaxBackoff = TimeSpan.FromSeconds(60);
    /// <summary>連線中但這麼久沒收到任何訊息,就印警告讓失聰看得見。</summary>
    private static readonly TimeSpan SilenceWarning = TimeSpan.FromMinutes(10);

    /// <summary>
    /// 計算第 N 次連續重連失敗後的等待時間。
    /// 輸入:連續失敗次數(從 1 起)。邏輯:2 秒起每次加倍,上限 60 秒。輸出:等待時間。
    /// </summary>
    public static TimeSpan NextBackoff(int failures)
    {
        if (failures <= 0) return TimeSpan.Zero;
        var seconds = 2.0 * Math.Pow(2, Math.Min(failures - 1, 10));
        return TimeSpan.FromSeconds(Math.Min(seconds, MaxBackoff.TotalSeconds));
    }

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

        _mqttOptions = new MqttClientOptionsBuilder()
            .WithTcpServer(_brokerAddress, _brokerPort)
            .WithClientId("BackendWorker")
            .Build();

        _mqttClient.ApplicationMessageReceivedAsync += HandleMessageAsync;

        _logger.LogInformation($"Connecting to MQTT Broker at {_brokerAddress}:{_brokerPort}");
        await _mqttClient.ConnectAsync(_mqttOptions, cancellationToken);
        await SubscribeAllAsync();

        await base.StartAsync(cancellationToken);
    }

    /// <summary>
    /// 訂閱模擬器與真機 topic。
    /// 輸入:無(topic 每次都重讀 Redis `config/communication`)。邏輯:連線建立或重建後都要呼叫,
    /// 因為 clean session 的訂閱不會跟著重連保留。輸出:無。
    /// </summary>
    private async Task SubscribeAllAsync()
    {
        await _mqttClient!.SubscribeAsync("factory/machine/update");

        var db = _redis!.GetDatabase();
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
    }

    /// <summary>
    /// 連線看守迴圈。
    /// 輸入:停止權杖。邏輯:斷線時真正重連並重新訂閱,失敗以指數退避重試(上限 60 秒);
    /// 連線中但長時間沒有任何訊息則印警告。輸出:無,直到停止。
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // BackgroundService guarantees StartAsync completes (and assigns _mqttClient) before ExecuteAsync runs.
        var failures = 0;
        var silenceWarned = false;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!_mqttClient!.IsConnected)
                {
                    _logger.LogWarning("MQTT Client disconnected. Reconnecting...");
                    await _mqttClient.ConnectAsync(_mqttOptions!, stoppingToken);
                    await SubscribeAllAsync();
                    failures = 0;
                    Interlocked.Exchange(ref _lastMessageTicks, DateTime.UtcNow.Ticks);
                    silenceWarned = false;
                    _logger.LogInformation("MQTT Client reconnected and resubscribed.");
                }
                else
                {
                    var silent = DateTime.UtcNow - new DateTime(Interlocked.Read(ref _lastMessageTicks), DateTimeKind.Utc);
                    if (silent > SilenceWarning && !silenceWarned)
                    {
                        _logger.LogWarning("MQTT connected but no message received for {Minutes:F0} minutes.", silent.TotalMinutes);
                        silenceWarned = true;
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                failures++;
                var wait = NextBackoff(failures);
                _logger.LogError(ex, "MQTT reconnect failed (attempt {Failures}); retry in {Wait}s", failures, wait.TotalSeconds);
                try { await Task.Delay(wait, stoppingToken); } catch (OperationCanceledException) { break; }
                continue;
            }

            try { await Task.Delay(CheckInterval, stoppingToken); } catch (OperationCanceledException) { break; }
        }
    }

    private async Task HandleMessageAsync(MqttApplicationMessageReceivedEventArgs e)
    {
        try
        {
            Interlocked.Exchange(ref _lastMessageTicks, DateTime.UtcNow.Ticks);
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
