using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;

namespace PrintingIoT.Core.Interfaces;

public interface IOrderService
{
    Task<IEnumerable<Order>> GetOrdersAsync(OrderStatus? status = null);
    Task<Order?> GetOrderAsync(Guid id);
    Task<Order> CreateOrderAsync(Order order);
    Task<bool> UpdateStatusAsync(Guid id, OrderStatus status);
    Task<bool> UpdateOrderAsync(Guid id, Order updated);
    Task<bool> DeleteOrderAsync(Guid id);
    Task<bool> ReorderSequenceAsync(List<Guid> orderedIds);

    // S1 / DF-04:排程同步改 upsert 語意 —— 依 Id → OrderNumber 比對既有列,
    // 清單外的列一律保留,只刪 DeleteIds 明確列出的列。回傳同步後的正規清單(依 Sequence)。
    Task<IEnumerable<Order>> SyncScheduleAsync(ScheduleSyncRequest request);

    // ERP Integration
    // S1 / ERP-02 + ERP-10:依 OrderNumber upsert(冪等),回傳逐列結果。
    Task<ErpPushResponseDto> PushOrdersAsync(List<OrderDto> orderDtos);
}
