using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Infrastructure.Data;
using Microsoft.Extensions.Logging;

namespace PrintingIoT.Infrastructure.Services;

public class OrderService : IOrderService
{
    private readonly PrintingContext _context;
    private readonly ILogger<OrderService> _logger;

    public OrderService(PrintingContext context, ILogger<OrderService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<Order>> GetOrdersAsync(OrderStatus? status = null)
    {
        var query = _context.Orders.AsQueryable();
        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status);
        }
        return await query.OrderByDescending(o => o.CreatedAt).ToListAsync();
    }

    public async Task<Order?> GetOrderAsync(Guid id)
    {
        return await _context.Orders.FindAsync(id);
    }

    public async Task<Order> CreateOrderAsync(Order order)
    {
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();
        return order;
    }

    public async Task<bool> UpdateStatusAsync(Guid id, OrderStatus status)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return false;

        order.Status = status;
        if (status == OrderStatus.Completed)
        {
            order.CompletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteOrderAsync(Guid id)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return false;

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReorderSequenceAsync(List<Guid> orderedIds)
    {
        var orders = await _context.Orders
            .Where(o => orderedIds.Contains(o.Id))
            .ToListAsync();

        foreach (var order in orders)
        {
            var index = orderedIds.IndexOf(order.Id);
            if (index != -1)
            {
                order.Sequence = index + 1;
                order.Status = OrderStatus.Pending;
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> PushOrdersAsync(List<OrderDto> orderDtos)
    {
        if (orderDtos == null || !orderDtos.Any())
            return 0;

        var existingProducts = await _context.Products.ToDictionaryAsync(p => p.ProductCode);

        foreach (var dto in orderDtos)
        {
            var order = new Order
            {
                OrderNumber = dto.OrderNumber,
                CustomerName = dto.CustomerName,
                TargetLength = dto.TargetLength,
                BoxType = dto.BoxType ?? "",
                PaperSpec = dto.PaperSpec ?? "",
                Quantity = dto.Quantity,
                ProductCode = dto.ProductCode ?? "",
                Sequence = 0,
                Status = OrderStatus.Pending,
                DeliveryDate = dto.DeliveryDate,
                ProductionBatch = dto.ProductionBatch ?? "",
                TraceCode = dto.TraceCode ?? ""
            };

            if (!string.IsNullOrEmpty(order.ProductCode))
            {
                if (existingProducts.TryGetValue(order.ProductCode, out var product))
                {
                    order.OptPhase = product.OptimizationPhase;
                    order.OptGap = product.OptimizationGap;
                    _logger.LogInformation($"Optimization data applied for Order {order.OrderNumber} (Product {order.ProductCode})");
                }
                else
                {
                    var newProduct = new Product
                    {
                        ProductCode = order.ProductCode,
                        Name = $"Auto-created for {dto.OrderNumber}",
                        OptimizationPhase = 0,
                        OptimizationGap = 0
                    };

                    _context.Products.Add(newProduct);
                    existingProducts[newProduct.ProductCode] = newProduct;
                    _logger.LogInformation($"New Product created: {order.ProductCode}");
                }
            }

            _context.Orders.Add(order);
        }

        await _context.SaveChangesAsync();
        return orderDtos.Count;
    }
}
