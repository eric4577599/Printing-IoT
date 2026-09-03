using Microsoft.AspNetCore.Mvc;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Interfaces;

namespace PrintingIoT.API.Controllers;

/// <summary>
/// S3 / F5:停機 / 不良原因主檔端點。
/// 設定頁維護、現場彈窗讀取,兩邊終於是同一份資料。
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReasonsController : ControllerBase
{
    private readonly IReasonService _reasonService;

    public ReasonsController(IReasonService reasonService)
    {
        _reasonService = reasonService;
    }

    /// <summary>
    /// 取得指定類別的原因清單。
    /// 輸入:type("stop" / "defect",必填)、includeInactive(預設 false)。
    /// 輸出:200 與依 DisplayOrder→Code 升冪的清單;type 缺少或不合法 → 400。
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetReasons([FromQuery] string? type, [FromQuery] bool includeInactive = false)
    {
        if (!TryParseType(type, out var reasonType))
            return BadRequest(new { success = false, error = "原因類別必須為 stop 或 defect" });

        var result = await _reasonService.GetReasonsAsync(reasonType, includeInactive);
        return Ok(result);
    }

    /// <summary>
    /// 取單筆原因。輸入:id;輸出:200 或 404。
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetReason(Guid id)
    {
        var result = await _reasonService.GetReasonAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// 建立原因。
    /// 輸入:type 查詢參數或本體的 type 欄位、ReasonCreateRequest。
    /// 輸出:201;code / name 空白 → 400;(type, code) 已存在 → 409。
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateReason([FromQuery] string? type, [FromBody] ReasonCreateWithTypeRequest? request)
    {
        if (request == null)
            return BadRequest(new { success = false, error = "請求本體不可為空" });

        // type 可放查詢字串或本體,兩者皆缺 → 400
        if (!TryParseType(type ?? request.Type, out var reasonType))
            return BadRequest(new { success = false, error = "原因類別必須為 stop 或 defect" });

        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { success = false, error = "原因代碼不可為空" });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, error = "原因名稱不可為空" });

        var (created, conflict) = await _reasonService.CreateReasonAsync(reasonType, request);
        if (conflict)
            return Conflict(new { success = false, error = "同類別下已有相同的原因代碼" });

        return CreatedAtAction(nameof(GetReason), new { id = created!.Id }, created);
    }

    /// <summary>
    /// 更新原因(只改 Name / Category / DisplayOrder / IsActive)。
    /// 輸入:id 與 ReasonUpdateRequest;輸出:204,查無 → 404。
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReason(Guid id, [FromBody] ReasonUpdateRequest? request)
    {
        if (request == null)
            return BadRequest(new { success = false, error = "請求本體不可為空" });

        var success = await _reasonService.UpdateReasonAsync(id, request);
        if (!success) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// 軟刪除原因。輸入:id;輸出:204(重複刪除仍 204),查無 → 404。
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReason(Guid id)
    {
        var success = await _reasonService.DeleteReasonAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// 解析原因類別字面值。
    /// 輸入:"stop" / "defect"(不分大小寫);輸出:是否合法與對應列舉。
    /// </summary>
    private static bool TryParseType(string? raw, out ReasonType type)
    {
        type = ReasonType.Stop;
        if (string.IsNullOrWhiteSpace(raw)) return false;

        switch (raw.Trim().ToLowerInvariant())
        {
            case "stop":
                type = ReasonType.Stop;
                return true;
            case "defect":
                type = ReasonType.Defect;
                return true;
            default:
                return false;
        }
    }
}

/// <summary>
/// 建立原因的請求本體(允許把 type 放在本體內,讓前端一次送完整資料)。
/// </summary>
public class ReasonCreateWithTypeRequest : ReasonCreateRequest
{
    /// <summary>"stop" / "defect";查詢字串已帶 type 時可省略。</summary>
    public string? Type { get; set; }
}
