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

    // Phase 2(排程拖拉後端持久化):編輯排程列時全欄位更新(含 SpecJson 規格 passthrough)。
    // 僅更新可由前端維護的欄位;Id/CreatedAt 不動。
    public async Task<bool> UpdateOrderAsync(Guid id, Order updated)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return false;

        order.OrderNumber = updated.OrderNumber;
        order.CustomerName = updated.CustomerName;
        order.Quantity = updated.Quantity;
        order.BoxType = updated.BoxType;
        order.PaperSpec = updated.PaperSpec;
        order.ProductCode = updated.ProductCode;
        order.Sequence = updated.Sequence;
        order.Status = updated.Status;
        order.TargetLength = updated.TargetLength;
        order.SpecJson = updated.SpecJson;

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

    // Phase 2(全量鏡像同步):以前端上傳的整份排程為準,upsert + 刪除清單外的列。
    // 安全機制:incoming 為空時「不動作」直接回傳現況,避免暫態把整個排程清空。
    public async Task<IEnumerable<Order>> SyncScheduleAsync(List<Order> incoming)
    {
        if (incoming == null || incoming.Count == 0)
            return await _context.Orders.OrderBy(o => o.Sequence).ToListAsync();

        var existing = await _context.Orders.ToListAsync();
        var existingById = existing.ToDictionary(o => o.Id);
        var incomingIds = new HashSet<Guid>();

        for (int i = 0; i < incoming.Count; i++)
        {
            var dto = incoming[i];
            if (dto.Id != Guid.Empty && existingById.TryGetValue(dto.Id, out var cur))
            {
                // 更新既有列(Sequence 依陣列位置)
                cur.OrderNumber = dto.OrderNumber;
                cur.CustomerName = dto.CustomerName;
                cur.Quantity = dto.Quantity;
                cur.BoxType = dto.BoxType;
                cur.PaperSpec = dto.PaperSpec;
                cur.ProductCode = dto.ProductCode;
                cur.TargetLength = dto.TargetLength;
                cur.Status = dto.Status;
                cur.SpecJson = dto.SpecJson;
                cur.Sequence = i;
                incomingIds.Add(cur.Id);
            }
            else
            {
                // 新列(採用前端提供的 GUID,無則新產生)
                var newOrder = dto;
                if (newOrder.Id == Guid.Empty) newOrder.Id = Guid.NewGuid();
                newOrder.Sequence = i;
                if (newOrder.CreatedAt == default) newOrder.CreatedAt = DateTime.UtcNow;
                _context.Orders.Add(newOrder);
                incomingIds.Add(newOrder.Id);
            }
        }

        // 刪除前端清單中不存在的列(鏡像)
        foreach (var e in existing)
        {
            if (!incomingIds.Contains(e.Id))
                _context.Orders.Remove(e);
        }

        await _context.SaveChangesAsync();
        return await _context.Orders.OrderBy(o => o.Sequence).ToListAsync();
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
