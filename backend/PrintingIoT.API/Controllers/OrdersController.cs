using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly PrintingContext _context;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(PrintingContext context, ILogger<OrdersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Order>>> GetOrders([FromQuery] OrderStatus? status)
    {
        var query = _context.Orders.AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status);
        }

        return await query.OrderByDescending(o => o.CreatedAt).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Order>> GetOrder(Guid id)
    {
        var order = await _context.Orders.FindAsync(id);

        if (order == null)
        {
            return NotFound();
        }

        return order;
    }

    [HttpPost]
    public async Task<ActionResult<Order>> CreateOrder(Order order)
    {
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] OrderStatus status)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null)
        {
            return NotFound();
        }

        order.Status = status;
        if (status == OrderStatus.Completed)
        {
            order.CompletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(Guid id)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null)
        {
            return NotFound();
        }

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderSequence([FromBody] List<Guid> orderedIds)
    {
        var orders = await _context.Orders
            .Where(o => orderedIds.Contains(o.Id))
            .ToListAsync();

        foreach (var order in orders)
        {
            var index = orderedIds.IndexOf(order.Id);
            if (index != -1)
            {
                // Sequence 1-based provided by list order
                order.Sequence = index + 1;
                order.Status = OrderStatus.Pending; // Ensure it's marked as pending/scheduled
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }
}
