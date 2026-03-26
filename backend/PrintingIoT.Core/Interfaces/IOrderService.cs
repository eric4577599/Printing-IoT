using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;

namespace PrintingIoT.Core.Interfaces;

public interface IOrderService
{
    Task<IEnumerable<Order>> GetOrdersAsync(OrderStatus? status = null);
    Task<Order?> GetOrderAsync(Guid id);
    Task<Order> CreateOrderAsync(Order order);
    Task<bool> UpdateStatusAsync(Guid id, OrderStatus status);
    Task<bool> DeleteOrderAsync(Guid id);
    Task<bool> ReorderSequenceAsync(List<Guid> orderedIds);
    
    // ERP Integration
    Task<int> PushOrdersAsync(List<OrderDto> orderDtos);
}
