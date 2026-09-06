using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Core.Services;

namespace PrintingIoT.Infrastructure.Services;

/// <summary>
/// S3 / F4:工廠時區與日界的設定來源。
/// 讀 Factory:TimeZone(IANA id,預設 Asia/Taipei)與 Factory:DayBoundaryHour(預設 8)。
/// 時區 id 在容器內找不到(缺 tzdata)時退回固定 UTC+08:00 的自訂時區,**不退回 UTC** ——
/// 退回 UTC 等於把「大夜班工廠日算錯」這個 bug 原樣裝回去。
/// </summary>
public class FactoryTimeProvider : IFactoryTimeProvider
{
    /// <summary>設定缺漏時的預設時區 id。</summary>
    public const string DefaultTimeZoneId = "Asia/Taipei";

    /// <summary>設定缺漏時的預設日界小時。</summary>
    public const int DefaultDayBoundaryHour = 8;

    /// <summary>找不到時區 id 時採用的固定 UTC+08:00 自訂時區名稱。</summary>
    public const string FallbackTimeZoneId = "PrintingIoT-Fallback";

    private readonly TimeZoneInfo _timeZone;

    public string TimeZoneId { get; }

    public int DayBoundaryHour { get; }

    /// <summary>
    /// 由設定建立工廠時間提供者。
    /// 輸入:configuration(讀 Factory:TimeZone / Factory:DayBoundaryHour)、logger。
    /// 輸出:已解析時區與日界的執行個體;解析失敗一律降級而不拋例外。
    /// 邏輯:時區找不到 → 記 warning 並用 UTC+08:00 自訂時區;日界超出 0–23 → 記 warning 並夾到 0。
    /// </summary>
    public FactoryTimeProvider(IConfiguration configuration, ILogger<FactoryTimeProvider> logger)
    {
        var configuredId = configuration["Factory:TimeZone"];
        if (string.IsNullOrWhiteSpace(configuredId)) configuredId = DefaultTimeZoneId;

        try
        {
            _timeZone = TimeZoneInfo.FindSystemTimeZoneById(configuredId);
            TimeZoneId = configuredId;
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            logger.LogWarning(ex,
                "找不到工廠時區 {TimeZoneId},退回固定 UTC+08:00(不退回 UTC,以免大夜班工廠日算錯)", configuredId);
            _timeZone = TimeZoneInfo.CreateCustomTimeZone(
                FallbackTimeZoneId, TimeSpan.FromHours(8), FallbackTimeZoneId, FallbackTimeZoneId);
            TimeZoneId = FallbackTimeZoneId;
        }

        // 以索引子 + TryParse 讀取(不引入 Configuration.Binder 相依);缺漏或無法解析一律用預設值
        var rawBoundary = configuration["Factory:DayBoundaryHour"];
        var boundary = int.TryParse(rawBoundary, out var parsed) ? parsed : DefaultDayBoundaryHour;
        if (boundary is < 0 or > 23)
        {
            logger.LogWarning("工廠日界 {Boundary} 超出 0–23,改用 0(等同不調整)", boundary);
            boundary = 0;
        }
        DayBoundaryHour = boundary;
    }

    /// <summary>
    /// 依工廠時區與日界換算工廠日。
    /// 輸入:completedAtUtc;輸出:工廠日 DateOnly。委派給 FactoryDayCalculator(唯一規則實作)。
    /// </summary>
    public DateOnly ResolveProductionDate(DateTime completedAtUtc)
        => FactoryDayCalculator.Resolve(completedAtUtc, _timeZone, DayBoundaryHour);
}
