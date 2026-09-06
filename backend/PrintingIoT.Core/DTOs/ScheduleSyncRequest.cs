using PrintingIoT.Core.Entities;

namespace PrintingIoT.Core.DTOs;

/// <summary>
/// 排程同步請求(S1 / DF-04):把原本的「裸陣列 + 全量鏡像刪除」改成
/// 「upsert 清單 + 明確刪除清單」,清單外的既有訂單一律保留。
/// </summary>
public class ScheduleSyncRequest
{
    /// <summary>要新增或更新的排程列;第 i 筆的 Sequence 會被設為 i。</summary>
    public List<OrderSyncDto> Orders { get; set; } = new();

    /// <summary>明確要刪除的訂單 Id;未列入者一律不刪(找不到的 id 靜默忽略)。</summary>
    public List<Guid> DeleteIds { get; set; } = new();
}

/// <summary>
/// 排程同步的單列 payload(S1 / DF-05):所有欄位皆為 nullable,
/// null 代表「呼叫端未提供」→ 後端不覆寫既有值;非 null(含 "" 與 0)才視為明確指定。
/// </summary>
public class OrderSyncDto
{
    public Guid? Id { get; set; }
    public string? OrderNumber { get; set; }
    public string? CustomerName { get; set; }
    public decimal? TargetLength { get; set; }
    public OrderStatus? Status { get; set; }

    /// <summary>保留供相容,後端忽略(排序一律以陣列位置為準)。</summary>
    public int? Sequence { get; set; }

    public string? BoxType { get; set; }
    public string? PaperSpec { get; set; }
    public int? Quantity { get; set; }
    public string? ProductCode { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string? ProductionBatch { get; set; }
    public string? TraceCode { get; set; }
    public string? SpecJson { get; set; }
}
