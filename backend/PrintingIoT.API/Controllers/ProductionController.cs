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
    /// S8 / §1.1:日報彙總。
    /// 輸入:from / to(yyyy-MM-dd,含端點,可省略)、shift(班別,可省略,不分大小寫)。
    /// 輸出:200 與彙總物件(空區間為全 0,**不是 404**);日期格式錯 → 400;
    ///       區間資料量超過上限 → 400 並請縮小區間(不回部分結果)。
    /// </summary>
    [HttpGet("summary/daily")]
    public async Task<IActionResult> GetDailySummary(
        [FromQuery] string? from, [FromQuery] string? to, [FromQuery] string? shift)
    {
        if (!TryParseRange(from, to, out var fromDate, out var toDate, out var rangeError))
            return BadRequest(new { success = false, error = rangeError });

        var result = await _productionService.GetDailySummaryAsync(fromDate, toDate, shift);
        return result.Success ? Ok(result.Data) : BadRequest(new { success = false, error = result.Error });
    }

    /// <summary>
    /// S8 / §1.2:月報彙總(每日一列 + 整月總計)。
    /// 輸入與錯誤行為同 GetDailySummary;輸出 200 與 { dailyRows, totals }。
    /// </summary>
    [HttpGet("summary/monthly")]
    public async Task<IActionResult> GetMonthlySummary(
        [FromQuery] string? from, [FromQuery] string? to, [FromQuery] string? shift)
    {
        if (!TryParseRange(from, to, out var fromDate, out var toDate, out var rangeError))
            return BadRequest(new { success = false, error = rangeError });

        var result = await _productionService.GetMonthlySummaryAsync(fromDate, toDate, shift);
        return result.Success ? Ok(result.Data) : BadRequest(new { success = false, error = result.Error });
    }

    /// <summary>
    /// S8 / §1.3:停機原因彙總,依次數遞減。
    /// 輸入與錯誤行為同 GetDailySummary;輸出 200 與陣列(無停機時為空陣列)。
    /// 刻意不含下鑽明細 —— 展開列要的訂單資料走 GET completions。
    /// </summary>
    [HttpGet("summary/stop-reasons")]
    public async Task<IActionResult> GetStopReasonSummary(
        [FromQuery] string? from, [FromQuery] string? to, [FromQuery] string? shift)
    {
        if (!TryParseRange(from, to, out var fromDate, out var toDate, out var rangeError))
            return BadRequest(new { success = false, error = rangeError });

        var result = await _productionService.GetStopReasonSummaryAsync(fromDate, toDate, shift);
        return result.Success ? Ok(result.Data) : BadRequest(new { success = false, error = result.Error });
    }

    /// <summary>
    /// 解析三支彙總端點共用的 from / to 參數。
    /// 輸入:兩個字串;輸出:是否合法,不合法時 error 為對應的正體中文訊息。
    /// 訊息與既有 GetCompletions 一致,避免同樣的錯誤在不同端點有兩種說法。
    /// </summary>
    private static bool TryParseRange(
        string? from, string? to, out DateOnly? fromDate, out DateOnly? toDate, out string? error)
    {
        toDate = null;
        error = null;

        if (!TryParseDate(from, out fromDate))
        {
            error = "起始日期格式不正確";
            return false;
        }

        if (!TryParseDate(to, out toDate))
        {
            error = "結束日期格式不正確";
            return false;
        }

        return true;
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
