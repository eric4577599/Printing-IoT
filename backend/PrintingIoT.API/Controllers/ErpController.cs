using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ErpController : ControllerBase
{
    private readonly PrintingContext _context;
    private readonly ILogger<ErpController> _logger;

    public ErpController(PrintingContext context, ILogger<ErpController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // Endpoint for ERP to push scheduled orders
    [HttpPost("push-orders")]
    public async Task<IActionResult> PushOrders([FromBody] List<OrderDto> orderDtos)
    {
        if (orderDtos == null || !orderDtos.Any())
            return BadRequest("No orders provided.");

        var existingProducts = await _context.Products.ToDictionaryAsync(p => p.ProductCode);
        
        foreach (var dto in orderDtos)
        {
            // Map DTO to Entity
            var order = new Order
            {
                OrderNumber = dto.OrderNumber,
                CustomerName = dto.CustomerName,
                TargetLength = dto.TargetLength,
                BoxType = dto.BoxType ?? "",
                PaperSpec = dto.PaperSpec ?? "",
                Quantity = dto.Quantity,
                ProductCode = dto.ProductCode ?? "",
                Sequence = 0, // Default to pool
                Status = OrderStatus.Pending
            };

            // Optimization Logic
            if (!string.IsNullOrEmpty(order.ProductCode))
            {
                if (existingProducts.TryGetValue(order.ProductCode, out var product))
                {
                    // Found: Auto-fill optimization data (Best Known Settings)
                    order.OptPhase = product.OptimizationPhase;
                    order.OptGap = product.OptimizationGap;
                    _logger.LogInformation($"Optimization data applied for Order {order.OrderNumber} (Product {order.ProductCode})");
                }
                else
                {
                    // Not Found: Create new Product (Auto-learn mode)
                    // We initialize with 0 or default values. 
                    // Future: Maybe ERP sends the initial phase/gap? For now, we assume learning.
                    var newProduct = new Product
                    {
                        ProductCode = order.ProductCode,
                        Name = $"Auto-created for {dto.OrderNumber}",
                        OptimizationPhase = 0,
                        OptimizationGap = 0
                    };
                    
                    _context.Products.Add(newProduct);
                    existingProducts[newProduct.ProductCode] = newProduct; // Add to local cache for subsequent orders in same batch
                    _logger.LogInformation($"New Product created: {order.ProductCode}");
                }
            }

            _context.Orders.Add(order);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, count = orderDtos.Count });
    }
}

// Simple DTO for incoming ERP payload
public class OrderDto
{
    public string OrderNumber { get; set; }
    public string CustomerName { get; set; }
    public decimal TargetLength { get; set; }
    public string ProductCode { get; set; }
    public string BoxType { get; set; }
    public string PaperSpec { get; set; }
    public int Quantity { get; set; }
}
