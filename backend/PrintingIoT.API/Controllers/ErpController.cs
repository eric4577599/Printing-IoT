using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ErpController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ILogger<ErpController> _logger;
    private readonly IConfiguration _configuration;

    // S1 / SEC-05:批次筆數上限預設值(設定鍵 Erp:MaxPushBatchSize 取不到或無效時採用)
    private const int DefaultMaxPushBatchSize = 1000;

    public ErpController(IOrderService orderService, ILogger<ErpController> logger, IConfiguration configuration)
    {
        _orderService = orderService;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// S1 / SEC-05 + ERP-10:ERP 推單端點。
    /// 輸入:ERP 訂單陣列;輸出:整批結果(逐列成敗、失敗原因、後端 OrderId)。
    /// 邏輯:本體為 null 或超過批次上限 → 400 且不寫入任何一筆;其餘一律 200,
    ///       部分成功也回 200,呼叫端解析 results 判斷成敗。
    /// </summary>
    [HttpPost("push-orders")]
    public async Task<IActionResult> PushOrders([FromBody] List<OrderDto>? orderDtos)
    {
        if (orderDtos == null)
            return BadRequest(new { success = false, error = "請求本體不可為空" });

        var maxBatchSize = _configuration.GetValue<int?>("Erp:MaxPushBatchSize") ?? DefaultMaxPushBatchSize;
        if (maxBatchSize <= 0) maxBatchSize = DefaultMaxPushBatchSize;

        if (orderDtos.Count > maxBatchSize)
        {
            _logger.LogWarning("ERP 推單遭拒:批次 {Received} 筆超過上限 {MaxBatchSize}", orderDtos.Count, maxBatchSize);
            return BadRequest(new
            {
                success = false,
                error = "批次筆數超過上限",
                maxBatchSize,
                received = orderDtos.Count
            });
        }

        var result = await _orderService.PushOrdersAsync(orderDtos);
        return Ok(result);
    }
}
