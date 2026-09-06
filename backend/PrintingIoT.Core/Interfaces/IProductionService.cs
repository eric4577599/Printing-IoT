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
}
