using System.Text.Json;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace PrintingIoT.Worker.Services;

public interface ISignalMappingProvider
{
    /// <summary>取得訊號欄位對映(計數 / 運轉訊號)。</summary>
    Task<SignalMapping> GetMappingAsync();

    /// <summary>取得歷史寫入節流間隔(秒)。</summary>
    Task<int> GetDataLogIntervalSecondsAsync();
}

/// <summary>
/// 從 Redis 鍵 config/communication 讀取訊號設定,沿用 SpeedCalculator 既有的「定期重讀快取」作法。
/// 設定改動後最遲 refreshInterval(正式環境 60 秒)生效,不需重啟服務。
/// </summary>
public class SignalMappingProvider : ISignalMappingProvider
{
    /// <summary>計數訊號預設值。</summary>
    public const string DefaultCountSignal = "DI-1";

    /// <summary>運轉訊號預設值。</summary>
    public const string DefaultMotorSignal = "DI-0";

    /// <summary>歷史寫入節流間隔預設值(秒)。</summary>
    public const int DefaultDataLogIntervalSeconds = 300;

    private const string ConfigKey = "config/communication";
    private const int MaxDataLogIntervalSeconds = 3600;

    private readonly ILogger<SignalMappingProvider> _logger;
    private readonly IConnectionMultiplexer _redis;
    private readonly TimeSpan _refreshInterval;
    private readonly SemaphoreSlim _gate = new(1, 1);

    // 上一次成功解析出來的值;啟動即失敗時保持預設值
    private SignalMapping _mapping = new(
        SignalNameNormalizer.Normalize(DefaultCountSignal),
        SignalNameNormalizer.Normalize(DefaultMotorSignal));
    private int _dataLogIntervalSeconds = DefaultDataLogIntervalSeconds;
    private DateTime _lastFetch = DateTime.MinValue;

    /// <summary>
    /// 建構式。
    /// 輸入:記錄器、Redis 連線、可選的重讀間隔(測試可傳 TimeSpan.Zero 立即重讀)。
    /// </summary>
    public SignalMappingProvider(
        ILogger<SignalMappingProvider> logger,
        IConnectionMultiplexer redis,
        TimeSpan? refreshInterval = null)
    {
        _logger = logger;
        _redis = redis;
        _refreshInterval = refreshInterval ?? TimeSpan.FromSeconds(60);
    }

    /// <summary>
    /// 取得訊號欄位對映。
    /// 輸入:無。邏輯:必要時重讀 Redis 設定。輸出:正規化後的 SignalMapping。
    /// </summary>
    public async Task<SignalMapping> GetMappingAsync()
    {
        await RefreshIfNeededAsync();
        return _mapping;
    }

    /// <summary>
    /// 取得歷史寫入節流間隔。
    /// 輸入:無。邏輯:必要時重讀 Redis 設定。輸出:1~3600 之間的秒數,異常值回到預設 300。
    /// </summary>
    public async Task<int> GetDataLogIntervalSecondsAsync()
    {
        await RefreshIfNeededAsync();
        return _dataLogIntervalSeconds;
    }

    /// <summary>
    /// 依重讀間隔決定是否重新讀取 Redis 設定。
    /// 邏輯:距上次讀取未滿 refreshInterval 直接沿用快取;讀取或解析失敗只記警告並沿用上一次成功的值,絕不拋例外。
    /// </summary>
    private async Task RefreshIfNeededAsync()
    {
        if (_lastFetch != DateTime.MinValue && (DateTime.UtcNow - _lastFetch) < _refreshInterval) return;

        await _gate.WaitAsync();
        try
        {
            if (_lastFetch != DateTime.MinValue && (DateTime.UtcNow - _lastFetch) < _refreshInterval) return;

            var raw = await _redis.GetDatabase().StringGetAsync(ConfigKey);
            if (!raw.HasValue)
            {
                // 無設定鍵屬正常情形(尚未設定過),沿用目前值即可
                _lastFetch = DateTime.UtcNow;
                return;
            }

            using var doc = JsonDocument.Parse(raw.ToString());
            var root = doc.RootElement;

            var count = ReadStringSetting(root, "plc_count_signal", DefaultCountSignal);
            var motor = ReadStringSetting(root, "plc_motor_signal", DefaultMotorSignal);
            _mapping = new SignalMapping(
                SignalNameNormalizer.Normalize(count),
                SignalNameNormalizer.Normalize(motor));

            _dataLogIntervalSeconds = ReadDataLogInterval(root);
            _lastFetch = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogWarning($"Failed to refresh signal mapping config, keeping previous values: {ex.Message}");
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// 讀取字串設定。
    /// 輸入:JSON 根元素、鍵名、預設值。輸出:缺值或空字串時回傳預設值。
    /// </summary>
    private static string ReadStringSetting(JsonElement root, string key, string fallback)
    {
        if (root.ValueKind != JsonValueKind.Object) return fallback;
        if (!root.TryGetProperty(key, out var el)) return fallback;
        if (el.ValueKind != JsonValueKind.String) return fallback;

        var value = el.GetString();
        return string.IsNullOrWhiteSpace(value) ? fallback : value;
    }

    /// <summary>
    /// 讀取歷史寫入節流間隔。
    /// 輸入:JSON 根元素。邏輯:非數字、&lt;= 0、&gt; 3600 一律回到預設 300。輸出:秒數。
    /// </summary>
    private static int ReadDataLogInterval(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object) return DefaultDataLogIntervalSeconds;
        if (!root.TryGetProperty("data_log_interval", out var el)) return DefaultDataLogIntervalSeconds;

        double seconds;
        if (el.ValueKind == JsonValueKind.Number)
        {
            seconds = el.GetDouble();
        }
        else if (el.ValueKind == JsonValueKind.String
                 && double.TryParse(el.GetString(), System.Globalization.NumberStyles.Any,
                                    System.Globalization.CultureInfo.InvariantCulture, out var parsed))
        {
            seconds = parsed;
        }
        else
        {
            return DefaultDataLogIntervalSeconds;
        }

        if (double.IsNaN(seconds) || seconds <= 0 || seconds > MaxDataLogIntervalSeconds)
            return DefaultDataLogIntervalSeconds;

        return (int)seconds;
    }
}
