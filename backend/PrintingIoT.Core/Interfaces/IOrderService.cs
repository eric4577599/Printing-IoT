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

    // Phase 2(全量鏡像同步):前端每次排程變動上傳整份清單,後端依陣列順序 upsert(Sequence=index)
    // 並刪除清單中不存在的列。回傳同步後的正規清單(依 Sequence)。
    Task<IEnumerable<Order>> SyncScheduleAsync(List<Order> incoming);
    
    // ERP Integration
    Task<int> PushOrdersAsync(List<OrderDto> orderDtos);
}
