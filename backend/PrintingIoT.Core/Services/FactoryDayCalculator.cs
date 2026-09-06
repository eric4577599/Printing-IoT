namespace PrintingIoT.Core.Services;

/// <summary>
/// S3 / F4:工廠日(ProductionDate)換算的權威實作(純靜態、無相依)。
///
/// 規則見 docs/spec20260903-s3-v1.md §5.2:
/// ProductionDate =(完工時間換算工廠時區後的當地日期)−(當地小時 &lt; 日界 ? 1 天 : 0 天)。
/// 大夜班在台北 00:00–08:00 完工,工廠日仍算前一日;舊寫法用 toISOString()(UTC)取日會落在錯誤的日子。
/// </summary>
public static class FactoryDayCalculator
{
    /// <summary>
    /// 將 UTC 完工時間換算為工廠日。
    /// 輸入:completedAtUtc 完工時間(Kind 非 Utc 時一律視為 UTC)、timeZone 工廠時區、
    ///       dayBoundaryHour 日界小時(0–23,超出範圍夾到 0 = 不調整)。
    /// 輸出:工廠日 DateOnly。
    /// 邏輯:先換算成工廠時區當地時間,當地小時小於日界就退回前一日,否則取當地日曆日。
    /// </summary>
    public static DateOnly Resolve(DateTime completedAtUtc, TimeZoneInfo timeZone, int dayBoundaryHour)
    {
        ArgumentNullException.ThrowIfNull(timeZone);

        var utc = completedAtUtc.Kind == DateTimeKind.Utc
            ? completedAtUtc
            : DateTime.SpecifyKind(completedAtUtc, DateTimeKind.Utc);

        // 日界超出 0–23 視為 0(等同不調整);呼叫端負責記 warning
        var boundary = dayBoundaryHour is >= 0 and <= 23 ? dayBoundaryHour : 0;

        var local = TimeZoneInfo.ConvertTimeFromUtc(utc, timeZone);
        var localDate = DateOnly.FromDateTime(local);

        return local.Hour < boundary ? localDate.AddDays(-1) : localDate;
    }
}
