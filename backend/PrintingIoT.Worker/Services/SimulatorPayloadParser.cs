using System.Text.Json;
using Microsoft.Extensions.Logging;
using PrintingIoT.Core.Entities;

namespace PrintingIoT.Worker.Services;

/// <summary>
/// 模擬器 payload 解析器,沿用現行欄位順序,只把「未知」誠實表達出來。
/// </summary>
public static class SimulatorPayloadParser
{
    /// <summary>模擬器 payload 缺 deviceId 時使用的常數,取代舊有的 "unknown"。</summary>
    public const string FallbackDeviceId = "SIMULATOR";

    /// <summary>
    /// 解析一則模擬器訊息。
    /// 輸入:JSON payload,以及可選的記錄器(靜態方法無 DI,由呼叫端傳入)。
    /// 邏輯:speed → line_speed 取速度;length → total_length → d1 取計數;status → status_code 取狀態碼,
    ///       僅接受已定義的 0–4,其餘為 Unknown;deviceId 缺漏時退回 "SIMULATOR" 並記警告。
    /// 輸出:MachineSample,或 null(JSON 壞掉、或計數欄位一個都取不到)。
    /// </summary>
    public static MachineSample? Parse(string payload, ILogger? logger = null)
    {
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(payload);
        }
        catch (Exception ex)
        {
            logger?.LogWarning($"Simulator payload is not valid JSON, skipped. Error={ex.Message}");
            return null;
        }

        using (doc)
        {
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                logger?.LogWarning("Simulator payload is not a JSON object, skipped.");
                return null;
            }

            var deviceId = FallbackDeviceId;
            if (root.TryGetProperty("deviceId", out var dId)
                && dId.ValueKind == JsonValueKind.String
                && !string.IsNullOrWhiteSpace(dId.GetString()))
            {
                deviceId = dId.GetString()!;
            }
            else
            {
                logger?.LogWarning($"Simulator payload missing deviceId, using '{FallbackDeviceId}'. Raw: {payload}");
            }

            decimal? providedSpeed = null;
            if (TryReadDecimal(root, "speed", out var sp)) providedSpeed = sp;
            else if (TryReadDecimal(root, "line_speed", out var lsp)) providedSpeed = lsp;

            decimal length;
            if (!TryReadDecimal(root, "length", out length)
                && !TryReadDecimal(root, "total_length", out length)
                && !TryReadDecimal(root, "d1", out length))
            {
                logger?.LogWarning($"Simulator payload has no count field (length/total_length/d1), skipped. Device={deviceId}");
                return null;
            }

            var status = MachineStatus.Unknown;
            if (TryReadInt(root, "status", out var statusInt) || TryReadInt(root, "status_code", out statusInt))
            {
                if (Enum.IsDefined(typeof(MachineStatus), statusInt)) status = (MachineStatus)statusInt;
            }

            return new MachineSample(
                DeviceId: deviceId,
                Source: TelemetrySource.Simulator,
                Count: (long)length,
                ProvidedSpeed: providedSpeed,
                Status: status,
                TimestampUtc: DateTime.UtcNow);
        }
    }

    /// <summary>
    /// 讀取數值欄位。
    /// 輸入:JSON 根元素、欄位名。輸出:是否成功與 decimal 值(非數字視為取不到)。
    /// </summary>
    private static bool TryReadDecimal(JsonElement root, string name, out decimal value)
    {
        value = 0;
        if (!root.TryGetProperty(name, out var el)) return false;
        if (el.ValueKind != JsonValueKind.Number) return false;
        return el.TryGetDecimal(out value);
    }

    /// <summary>
    /// 讀取整數欄位。
    /// 輸入:JSON 根元素、欄位名。輸出:是否成功與 int 值。
    /// </summary>
    private static bool TryReadInt(JsonElement root, string name, out int value)
    {
        value = 0;
        if (!root.TryGetProperty(name, out var el)) return false;
        if (el.ValueKind != JsonValueKind.Number) return false;
        return el.TryGetInt32(out value);
    }
}
