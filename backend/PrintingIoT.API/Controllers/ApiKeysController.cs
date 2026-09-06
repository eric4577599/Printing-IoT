using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.DTOs.Auth;
using PrintingIoT.Core.Security;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.API.Controllers;

/// <summary>
/// ApiKeysController — 機器對機器金鑰的管理(S7)。
///
/// 全數限 ADMIN(UserAdmin policy),且**只接受 JWT**:
/// 不讓一支金鑰拿自己去產生下一支,否則一旦外洩就無法靠撤銷收斂。
///
/// 明文金鑰只在 POST 的回應出現一次;列表與撤銷都只看得到前綴。
/// </summary>
[ApiController]
[Route("api/v1/apikeys")]
[Authorize(Policy = AppRoles.Policies.UserAdmin, AuthenticationSchemes = "Bearer")]
public class ApiKeysController : ControllerBase
{
    private readonly PrintingContext _context;
    private readonly ILogger<ApiKeysController> _logger;

    public ApiKeysController(PrintingContext context, ILogger<ApiKeysController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// 列出所有金鑰。
    /// 輸入:無;輸出:200 + ApiKeySummary 陣列(絕不含雜湊或明文);
    /// 邏輯:依建立時間新到舊排序,已撤銷的一併列出 —— 稽核要看得到撤銷紀錄。
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ApiKeySummary>>> GetApiKeys()
    {
        var keys = await _context.ApiKeys
            .OrderByDescending(k => k.CreatedAt)
            .ToListAsync();

        return Ok(keys.Select(ToSummary));
    }

    /// <summary>
    /// 建立一支新金鑰。
    /// 輸入:body CreateApiKeyRequest(名稱、選填到期時間);
    /// 輸出:201 + CreateApiKeyResponse(摘要 + **只此一次**的明文金鑰);
    /// 邏輯:名稱長度檢查 → 到期時間必須在未來 → 產生金鑰 → 只存前綴與雜湊。
    /// 明文不寫入任何日誌。
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CreateApiKeyResponse>> CreateApiKey([FromBody] CreateApiKeyRequest request)
    {
        var name = (request?.Name ?? string.Empty).Trim();
        if (name.Length is 0 or > 100)
            return BadRequest("Name is required and must be 1~100 characters.");

        if (request!.ExpiresAt is { } expiresAt && expiresAt.ToUniversalTime() <= DateTime.UtcNow)
            return BadRequest("ExpiresAt must be in the future.");

        var (plainKey, prefix, hash) = ApiKeyGenerator.Generate();

        var entity = new Core.Entities.Auth.ApiKey
        {
            Name = name,
            Prefix = prefix,
            KeyHash = hash,
            Role = AppRoles.ErpService,
            IsActive = true,
            ExpiresAt = request.ExpiresAt?.ToUniversalTime(),
            CreatedBy = User.Identity?.Name
        };

        _context.ApiKeys.Add(entity);
        await _context.SaveChangesAsync();

        _logger.LogInformation("已建立 API 金鑰 {Prefix}({Name}),建立者 {CreatedBy}", prefix, name, entity.CreatedBy);

        return CreatedAtAction(nameof(GetApiKeys), new CreateApiKeyResponse(ToSummary(entity), plainKey));
    }

    /// <summary>
    /// 撤銷一支金鑰。
    /// 輸入:路徑 id;輸出:200 + 撤銷後的摘要,查無此列回 404;
    /// 邏輯:只把 IsActive 設為 false,**不刪列** —— 刪掉就沒有「誰在什麼時候用過這支金鑰」的軌跡。
    ///       重複撤銷是冪等的。
    /// </summary>
    [HttpPost("{id:guid}/revoke")]
    public async Task<ActionResult<ApiKeySummary>> RevokeApiKey(Guid id)
    {
        var entity = await _context.ApiKeys.FirstOrDefaultAsync(k => k.Id == id);
        if (entity == null)
            return NotFound();

        if (entity.IsActive)
        {
            entity.IsActive = false;
            await _context.SaveChangesAsync();
            _logger.LogWarning("API 金鑰 {Prefix}({Name})已被 {User} 撤銷", entity.Prefix, entity.Name, User.Identity?.Name);
        }

        return Ok(ToSummary(entity));
    }

    /// <summary>
    /// 實體轉對外摘要。
    /// 輸入:金鑰實體;輸出:ApiKeySummary;
    /// 邏輯:單一投影出口,確保 KeyHash 不可能被某條路徑漏出去。
    /// </summary>
    private static ApiKeySummary ToSummary(Core.Entities.Auth.ApiKey k) => new(
        k.Id,
        k.Name,
        k.Prefix,
        k.Role,
        k.IsActive,
        k.ExpiresAt,
        k.LastUsedAt,
        k.CreatedAt,
        k.CreatedBy);
}
