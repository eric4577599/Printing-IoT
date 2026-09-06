using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;

namespace PrintingIoT.Core.Interfaces;

/// <summary>
/// S3 / F5:停機 / 不良原因主檔的維護與查詢。
/// </summary>
public interface IReasonService
{
    /// <summary>
    /// 依類別取得原因清單。
    /// 輸入:type 停機 / 不良、includeInactive 是否含已軟刪除的列。
    /// 輸出:依 DisplayOrder 再 Code 升冪的清單。
    /// </summary>
    Task<IEnumerable<ReasonCodeDto>> GetReasonsAsync(ReasonType type, bool includeInactive = false);

    /// <summary>取單筆;查無回 null。</summary>
    Task<ReasonCodeDto?> GetReasonAsync(Guid id);

    /// <summary>
    /// 建立原因。
    /// 輸入:type 與請求本體。
    /// 輸出:(Created, Conflict) —— (Type, Code) 已存在時 Conflict = true 且 Created 為 null。
    /// </summary>
    Task<(ReasonCodeDto? Created, bool Conflict)> CreateReasonAsync(ReasonType type, ReasonCreateRequest request);

    /// <summary>
    /// 更新原因;只套用 Name / Category / DisplayOrder / IsActive,Type 與 Code 不可改。
    /// 輸出:查無該列時 false。
    /// </summary>
    Task<bool> UpdateReasonAsync(Guid id, ReasonUpdateRequest request);

    /// <summary>
    /// 軟刪除(IsActive = false)。查無回 false;已是 false 仍回 true(冪等)。
    /// </summary>
    Task<bool> DeleteReasonAsync(Guid id);
}
