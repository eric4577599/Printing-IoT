using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.Core.Services;
using PrintingIoT.Infrastructure.Services;

namespace PrintingIoT.Tests.Services;

/// <summary>
/// FactoryDayCalculator 與 FactoryTimeProvider 單元測試(S3 / F4,對應 AC-15、AC-16)。
/// 規則見 docs/spec20260903-s3-v1.md §5.2。
/// </summary>
public class FactoryDayCalculatorTests
{
    /// <summary>
    /// 取得台北時區(容器缺 tzdata 時退回固定 UTC+08:00,讓測試在任何環境都成立)。
    /// 輸入:無;輸出:UTC+08:00 的 TimeZoneInfo。
    /// </summary>
    private static TimeZoneInfo TaipeiTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Taipei");
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return TimeZoneInfo.CreateCustomTimeZone("Test-UTC+8", TimeSpan.FromHours(8), "Test-UTC+8", "Test-UTC+8");
        }
    }

    /// <summary>
    /// 以設定值建立 FactoryTimeProvider。
    /// 輸入:時區 id 與日界(可為 null 表示不設定);輸出:FactoryTimeProvider 執行個體。
    /// </summary>
    private static FactoryTimeProvider CreateProvider(string? timeZoneId, string? dayBoundaryHour)
    {
        var values = new Dictionary<string, string?>();
        if (timeZoneId != null) values["Factory:TimeZone"] = timeZoneId;
        if (dayBoundaryHour != null) values["Factory:DayBoundaryHour"] = dayBoundaryHour;

        var configuration = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        return new FactoryTimeProvider(configuration, new Mock<ILogger<FactoryTimeProvider>>().Object);
    }

    // AC-15:§5.2 表中五列輸入輸出全部相符
    [Theory]
    // UTC 16:41 → 台北 09-04 00:41,日界 8 → 前一日 09-03(大夜班)
    [InlineData("2026-09-03T16:41:00Z", 8, "2026-09-03")]
    // UTC 23:59 → 台北 09-04 07:59,日界 8 → 仍為前一日 09-03
    [InlineData("2026-09-03T23:59:00Z", 8, "2026-09-03")]
    // UTC 00:00 → 台北 09-04 08:00,日界 8 → 換日,09-04
    [InlineData("2026-09-04T00:00:00Z", 8, "2026-09-04")]
    // UTC 05:00 → 台北 09-04 13:00,日界 8 → 09-04
    [InlineData("2026-09-04T05:00:00Z", 8, "2026-09-04")]
    // 日界 0 等同不調整 → 取台北當地日曆日 09-04
    [InlineData("2026-09-03T16:41:00Z", 0, "2026-09-04")]
    public void Resolve_MatchesSpecTable(string completedAtUtc, int dayBoundaryHour, string expected)
    {
        var utc = DateTime.Parse(completedAtUtc, null, System.Globalization.DateTimeStyles.AdjustToUniversal
                                                        | System.Globalization.DateTimeStyles.AssumeUniversal);

        var result = FactoryDayCalculator.Resolve(utc, TaipeiTimeZone(), dayBoundaryHour);

        Assert.Equal(DateOnly.Parse(expected), result);
    }

    // Kind 非 Utc 時一律視為 UTC,不因執行機器的本機時區而漂移
    [Fact]
    public void Resolve_UnspecifiedKind_TreatedAsUtc()
    {
        var unspecified = new DateTime(2026, 9, 3, 16, 41, 0, DateTimeKind.Unspecified);

        var result = FactoryDayCalculator.Resolve(unspecified, TaipeiTimeZone(), 8);

        Assert.Equal(new DateOnly(2026, 9, 3), result);
    }

    // 日界超出 0–23 → 夾到 0(等同不調整)
    [Theory]
    [InlineData(-1)]
    [InlineData(24)]
    [InlineData(99)]
    public void Resolve_OutOfRangeBoundary_ClampsToZero(int boundary)
    {
        var utc = new DateTime(2026, 9, 3, 16, 41, 0, DateTimeKind.Utc);

        var result = FactoryDayCalculator.Resolve(utc, TaipeiTimeZone(), boundary);

        // 日界 0 → 直接取台北當地日曆日 09-04
        Assert.Equal(new DateOnly(2026, 9, 4), result);
    }

    // AC-16:時區 id 不存在 → 不拋例外,退回 UTC+08:00(不可退回 UTC)
    [Fact]
    public void FactoryTimeProvider_UnknownTimeZone_FallsBackToUtcPlus8()
    {
        var provider = CreateProvider("Mars/Olympus_Mons", "8");

        Assert.Equal(FactoryTimeProvider.FallbackTimeZoneId, provider.TimeZoneId);

        // 第一列驗證「大夜班算前一日」;第二列才是區辨是否誤退回 UTC 的關鍵:
        //   UTC+8 → 台北 09-04 08:00 → 工廠日 09-04
        //   UTC   → 當地 09-04 00:00 → 小時 0 < 8 → 工廠日 09-03(錯)

        Assert.Equal(
            new DateOnly(2026, 9, 3),
            provider.ResolveProductionDate(new DateTime(2026, 9, 3, 16, 41, 0, DateTimeKind.Utc)));

        Assert.Equal(
            new DateOnly(2026, 9, 4),
            provider.ResolveProductionDate(new DateTime(2026, 9, 4, 0, 0, 0, DateTimeKind.Utc)));
    }

    // 設定缺漏時採預設值 Asia/Taipei + 日界 8
    [Fact]
    public void FactoryTimeProvider_MissingConfiguration_UsesDefaults()
    {
        var provider = CreateProvider(null, null);

        Assert.Equal(8, provider.DayBoundaryHour);
        Assert.Equal(
            new DateOnly(2026, 9, 3),
            provider.ResolveProductionDate(new DateTime(2026, 9, 3, 16, 41, 0, DateTimeKind.Utc)));
    }

    // 日界可由設定覆寫;設為 0 時等同當地日曆日
    [Fact]
    public void FactoryTimeProvider_BoundaryZero_UsesLocalCalendarDay()
    {
        var provider = CreateProvider("Asia/Taipei", "0");

        Assert.Equal(0, provider.DayBoundaryHour);
        Assert.Equal(
            new DateOnly(2026, 9, 4),
            provider.ResolveProductionDate(new DateTime(2026, 9, 3, 16, 41, 0, DateTimeKind.Utc)));
    }

    // 日界設定超出範圍 → 夾到 0 且不拋例外
    [Fact]
    public void FactoryTimeProvider_InvalidBoundary_ClampsToZero()
    {
        var provider = CreateProvider("Asia/Taipei", "99");

        Assert.Equal(0, provider.DayBoundaryHour);
    }
}
