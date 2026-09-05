using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Interfaces;

namespace PrintingIoT.API.Controllers;

/// <summary>
/// S3 / F2:完工實績端點。
/// POST 落地(冪等)、GET 查詢區間、GET/{id} 取單筆含明細。
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProductionController : ControllerBase
{
    private readonly IProductionService _productionService;

    public ProductionController(IProductionService productionService)
    {
        _productionService = productionService;
    }

    /// <summary>
    /// 落地一筆完工實績。
    /// 輸入:ProductionCompletionRequest(JSON camelCase)。
    /// 輸出:201 Created(新落地)/ 200 OK(冪等命中)/ 400(驗證失敗,資料庫零寫入)。
    /// </summary>
    [HttpPost("completions")]
    public async Task<IActionResult> RecordCompletion([FromBody] ProductionCompletionRequest? request)
    {
        if (request == null)
            return BadRequest(new { success = false, error = "請求本體不可為空" });

        var result = await _productionService.RecordCompletionAsync(request);

        if (!result.Success)
            return BadRequest(new { success = false, error = result.Error });

        if (result.Duplicated)
            return Ok(result);

        return CreatedAtAction(nameof(GetCompletion), new { id = result.Id }, result);
    }

    /// <summary>
    /// 依工廠日區間查詢完工實績。
    /// 輸入:from / to(yyyy-MM-dd,含端點,可省略)、page(預設 1)、pageSize(預設 50、上限 500)。
    /// 輸出:200 與清單;日期格式不正確 → 400。
    /// </summary>
    [HttpGet("completions")]
    public async Task<IActionResult> GetCompletions(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (!TryParseDate(from, out var fromDate))
            return BadRequest(new { success = false, error = "起始日期格式不正確" });

        if (!TryParseDate(to, out var toDate))
            return BadRequest(new { success = false, error = "結束日期格式不正確" });

        var result = await _productionService.GetCompletionsAsync(fromDate, toDate, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// 取單筆完工實績(含 defects / stops 明細)。
    /// 輸入:id;輸出:200 與 DTO,查無 → 404。
    /// </summary>
    [HttpGet("completions/{id}")]
    public async Task<IActionResult> GetCompletion(Guid id)
    {
        var result = await _productionService.GetCompletionAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// 解析 yyyy-MM-dd 查詢參數。
    /// 輸入:字串(可為 null / 空白);輸出:是否合法,合法時 value 為對應 DateOnly(空白時為 null)。
    /// </summary>
    private static bool TryParseDate(string? raw, out DateOnly? value)
    {
        value = null;
        if (string.IsNullOrWhiteSpace(raw)) return true;

        if (!DateOnly.TryParse(raw, out var parsed)) return false;

        value = parsed;
        return true;
    }
}
