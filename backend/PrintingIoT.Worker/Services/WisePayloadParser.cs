using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using PrintingIoT.Core.Entities;

namespace PrintingIoT.Worker.Services;

public interface IWisePayloadParser
{
    Task<MachineSample?> ParseAsync(string topic, string payload);
}

/// <summary>
/// 真機(Advantech WISE)payload 解析器:依設定的訊號欄位取出計數與運轉狀態。
/// 取不到計數就整包跳過;運轉狀態無法判讀一律回 Unknown,絕不假裝在運轉。
/// </summary>
public class WisePayloadParser : IWisePayloadParser
{
    /// <summary>topic 取不到裝置代號時的後備值(維持現況)。</summary>
    public const string FallbackDeviceId = "WISE";

    private readonly ILogger<WisePayloadParser> _logger;
    private readonly ISignalMappingProvider _mappingProvider;

    public WisePayloadParser(ILogger<WisePayloadParser> logger, ISignalMappingProvider mappingProvider)
    {
        _logger = logger;
        _mappingProvider = mappingProvider;
    }

    /// <summary>
    /// 解析一則真機訊息。
    /// 輸入:MQTT topic(Advantech/{deviceId}/data)與 JSON payload。
    /// 邏輯:topic 第 2 段取裝置代號;依設定的 CountField 取計數(數字或可解析的數值字串),
    ///       依 MotorField 判定運轉狀態;JSON 壞掉或取不到計數一律回 null 讓呼叫端跳過。
    /// 輸出:MachineSample,或 null 表示這包不成立。
    /// </summary>
    public async Task<MachineSample?> ParseAsync(string topic, string payload)
    {
        var mapping = await _mappingProvider.GetMappingAsync();

        var parts = (topic ?? string.Empty).Split('/');
        var deviceId = parts.Length > 1 && !string.IsNullOrWhiteSpace(parts[1]) ? parts[1] : FallbackDeviceId;

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(payload);
        }
        catch (Exception ex)
        {
            _logger.LogWarning($"WISE payload is not valid JSON, skipped. Device={deviceId}, Error={ex.Message}");
            return null;
        }

        using (doc)
        {
            var root = doc.RootElement;

            if (!JsonSignalReader.TryGetSignal(root, mapping.CountField, out var countEl, out var countMatches)
                || !TryReadCount(countEl, out var count))
            {
                _logger.LogWarning(
                    $"WISE payload has no readable count signal '{mapping.CountField}', sample skipped. Device={deviceId}");
                return null;
            }

            if (countMatches > 1)
            {
                _logger.LogWarning(
                    $"WISE payload has {countMatches} properties matching count signal '{mapping.CountField}', using the first one. Device={deviceId}");
            }

            var status = ReadStatus(root, mapping.MotorField, deviceId);

            return new MachineSample(
                DeviceId: deviceId,
                Source: TelemetrySource.Wise,
                Count: count,
                ProvidedSpeed: null,           // 真機速度由 SpeedCalculator 推算
                Status: status,
                TimestampUtc: DateTime.UtcNow);
        }
    }

    /// <summary>
    /// 讀取計數值。
    /// 輸入:JSON 元素。邏輯:數字直接取值;字串以 InvariantCulture 解析(WISE 韌體常以字串送數值);
    ///       小數以 (long) 截斷;true/false/null/非數字字串一律視為取不到。
    /// 輸出:是否成功,以及截斷後的計數。
    /// </summary>
    private static bool TryReadCount(JsonElement element, out long count)
    {
        count = 0;

        if (element.ValueKind == JsonValueKind.Number)
        {
            if (!element.TryGetDouble(out var num) || double.IsNaN(num) || double.IsInfinity(num)) return false;
            count = (long)num;
            return true;
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            var text = element.GetString();
            if (string.IsNullOrWhiteSpace(text)) return false;
            if (!double.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed)) return false;
            if (double.IsNaN(parsed) || double.IsInfinity(parsed)) return false;
            count = (long)parsed;
            return true;
        }

        return false;
    }

    /// <summary>
    /// 依運轉訊號欄位判定機台狀態。
    /// 輸入:JSON 根元素、正規化後的運轉訊號欄位名、裝置代號(僅供記錄)。
    /// 邏輯:數字非 0 → Running,0 → Idle;true/false → Running/Idle;
    ///       字串 1/true/on → Running,0/false/off → Idle;其餘與缺欄位一律 Unknown。
    /// 輸出:MachineStatus,任何情況都不會憑空回 Running。
    /// </summary>
    private MachineStatus ReadStatus(JsonElement root, string motorField, string deviceId)
    {
        if (!JsonSignalReader.TryGetSignal(root, motorField, out var el, out var matches))
        {
            _logger.LogWarning($"WISE payload has no motor signal '{motorField}', status reported as Unknown. Device={deviceId}");
            return MachineStatus.Unknown;
        }

        if (matches > 1)
        {
            _logger.LogWarning(
                $"WISE payload has {matches} properties matching motor signal '{motorField}', using the first one. Device={deviceId}");
        }

        switch (el.ValueKind)
        {
            case JsonValueKind.Number:
                if (!el.TryGetDouble(out var num) || double.IsNaN(num)) return MachineStatus.Unknown;
                return num != 0 ? MachineStatus.Running : MachineStatus.Idle;

            case JsonValueKind.True:
                return MachineStatus.Running;

            case JsonValueKind.False:
                return MachineStatus.Idle;

            case JsonValueKind.String:
                var text = (el.GetString() ?? string.Empty).Trim().ToLowerInvariant();
                if (text == "1" || text == "true" || text == "on") return MachineStatus.Running;
                if (text == "0" || text == "false" || text == "off") return MachineStatus.Idle;
                _logger.LogWarning($"WISE motor signal '{motorField}' has unrecognized value '{text}', status reported as Unknown. Device={deviceId}");
                return MachineStatus.Unknown;

            default:
                return MachineStatus.Unknown;
        }
    }
}
