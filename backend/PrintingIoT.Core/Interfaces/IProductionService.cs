using PrintingIoT.Core.DTOs;

namespace PrintingIoT.Core.Interfaces;

/// <summary>
/// S3 / F2:完工實績落地與查詢。
/// </summary>
public interface IProductionService
{
    /// <summary>
    /// 落地一筆完工實績(冪等)。
    /// 輸入:ProductionCompletionRequest。
    /// 輸出:落地結果;驗證失敗時 Success = false 且 Error 為正體中文訊息、資料庫零寫入。
    /// </summary>
    Task<ProductionCompletionResultDto> RecordCompletionAsync(ProductionCompletionRequest request);

    /// <summary>
    /// 依工廠日區間查詢完工實績(含明細)。
    /// 輸入:from / to 工廠日(含端點,可為 null)、page(&lt; 1 夾到 1)、pageSize(夾到 1–500)。
    /// 輸出:依 ProductionDate 再 CompletedAt 遞減排序的清單。
    /// </summary>
    Task<IEnumerable<ProductionCompletionDto>> GetCompletionsAsync(DateOnly? from, DateOnly? to, int page, int pageSize);

    /// <summary>
    /// 取單筆完工實績(含明細);查無回 null。
    /// </summary>
    Task<ProductionCompletionDto?> GetCompletionAsync(Guid id);

    /// <summary>
    /// S8 / §1.1:日報彙總。
    /// 輸入:from / to 工廠日(含端點,可為 null)、shift 班別(可為 null,比對不分大小寫)。
    /// 輸出:成功時 Data 為彙總結果(空區間為全 0,不是 null);
    ///       區間內完工列超過上限時 Success = false 且 Error 說明請縮小區間。
    /// </summary>
    Task<SummaryResultDto<DailySummaryDto>> GetDailySummaryAsync(DateOnly? from, DateOnly? to, string? shift);

    /// <summary>
    /// S8 / §1.2:月報彙總(每日一列 + 整月總計)。
    /// 輸入同上。輸出:DailyRows 依日期遞增;每列與 Totals 的 oee 皆由該層級的彙總數據重算,
    /// 不是把下一層的率值平均掉。
    /// </summary>
    Task<SummaryResultDto<MonthlySummaryDto>> GetMonthlySummaryAsync(DateOnly? from, DateOnly? to, string? shift);

    /// <summary>
    /// S8 / §1.3:停機原因彙總,依次數遞減。
    /// 輸入同上。輸出:每個原因一項,不含下鑽明細(明細走 GetCompletionsAsync)。
    /// </summary>
    Task<SummaryResultDto<List<StopReasonSummaryDto>>> GetStopReasonSummaryAsync(DateOnly? from, DateOnly? to, string? shift);
}
