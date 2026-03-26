using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ErpController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ILogger<ErpController> _logger;

    public ErpController(IOrderService orderService, ILogger<ErpController> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    [HttpPost("push-orders")]
    public async Task<IActionResult> PushOrders([FromBody] List<OrderDto> orderDtos)
    {
        var count = await _orderService.PushOrdersAsync(orderDtos);
        return Ok(new { success = true, count = count });
    }
}


