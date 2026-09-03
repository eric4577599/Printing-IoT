using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Interfaces;

namespace PrintingIoT.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(IOrderService orderService, ILogger<OrdersController> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Order>>> GetOrders([FromQuery] OrderStatus? status)
    {
        var orders = await _orderService.GetOrdersAsync(status);
        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Order>> GetOrder(Guid id)
    {
        var order = await _orderService.GetOrderAsync(id);
        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpPost]
    public async Task<ActionResult<Order>> CreateOrder(Order order)
    {
        var createdOrder = await _orderService.CreateOrderAsync(order);
        return CreatedAtAction(nameof(GetOrder), new { id = createdOrder.Id }, createdOrder);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] OrderStatus status)
    {
        var success = await _orderService.UpdateStatusAsync(id, status);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateOrder(Guid id, [FromBody] Order updated)
    {
        var success = await _orderService.UpdateOrderAsync(id, updated);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(Guid id)
    {
        var success = await _orderService.DeleteOrderAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderSequence([FromBody] List<Guid> orderedIds)
    {
        await _orderService.ReorderSequenceAsync(orderedIds);
        return Ok(new { success = true });
    }

    // S1 / DF-04(排程同步改 upsert 語意):前端上傳 { orders, deleteIds },
    // 後端只 upsert 清單內的列並刪除 deleteIds 明確列出的列,清單外的既有排程一律保留。
    [HttpPost("sync")]
    public async Task<ActionResult<IEnumerable<Order>>> SyncSchedule([FromBody] ScheduleSyncRequest? request)
    {
        if (request == null)
            return BadRequest(new { success = false, error = "請求本體不可為空" });

        var result = await _orderService.SyncScheduleAsync(request);
        return Ok(result);
    }
}
