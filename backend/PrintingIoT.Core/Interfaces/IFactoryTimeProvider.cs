namespace PrintingIoT.Core.Interfaces;

/// <summary>
/// S3 / F4:工廠時區與日界的設定來源,提供工廠日換算。
/// 設定鍵 Factory:TimeZone(IANA id,預設 Asia/Taipei)與 Factory:DayBoundaryHour(預設 8)。
/// </summary>
public interface IFactoryTimeProvider
{
    /// <summary>實際採用的時區 id(退回自訂時區時為 fallback 名稱)。</summary>
    string TimeZoneId { get; }

    /// <summary>實際採用的日界小時(0–23)。</summary>
    int DayBoundaryHour { get; }

    /// <summary>
    /// 依工廠時區與日界把 UTC 完工時間換算成工廠日。
    /// 輸入:completedAtUtc(Kind 非 Utc 時視為 UTC);輸出:工廠日 DateOnly。
    /// </summary>
    DateOnly ResolveProductionDate(DateTime completedAtUtc);
}
