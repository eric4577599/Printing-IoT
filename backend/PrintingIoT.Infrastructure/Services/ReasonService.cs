using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.Infrastructure.Services;

/// <summary>
/// S3 / F5:停機 / 不良原因主檔服務。
/// 設定頁與現場彈窗共用這一份資料;刪除採軟刪除,避免舊報表出現孤兒代碼。
/// </summary>
public class ReasonService : IReasonService
{
    private readonly PrintingContext _context;
    private readonly ILogger<ReasonService> _logger;

    private const int MaxCodeLength = 20;
    private const int MaxNameLength = 100;
    private const int MaxCategoryLength = 50;

    public ReasonService(PrintingContext context, ILogger<ReasonService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// 依類別取得原因清單。
    /// 輸入:type、includeInactive;輸出:依 DisplayOrder 再 Code 升冪的 DTO 清單。
    /// </summary>
    public async Task<IEnumerable<ReasonCodeDto>> GetReasonsAsync(ReasonType type, bool includeInactive = false)
    {
        var query = _context.ReasonCodes.AsNoTracking().Where(r => r.Type == type);
        if (!includeInactive) query = query.Where(r => r.IsActive);

        var rows = await query
            .OrderBy(r => r.DisplayOrder)
            .ThenBy(r => r.Code)
            .ToListAsync();

        return rows.Select(ReasonCodeDto.From).ToList();
    }

    /// <summary>取單筆;輸入 id,輸出 DTO 或 null。</summary>
    public async Task<ReasonCodeDto?> GetReasonAsync(Guid id)
    {
        var row = await _context.ReasonCodes.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        return row == null ? null : ReasonCodeDto.From(row);
    }

    /// <summary>
    /// 建立原因。
    /// 輸入:type 與請求本體(Code / Name 必填)。
    /// 輸出:(Created, Conflict) —— (Type, Code) 已存在時回 (null, true),不新增任何列。
    /// </summary>
    public async Task<(ReasonCodeDto? Created, bool Conflict)> CreateReasonAsync(ReasonType type, ReasonCreateRequest request)
    {
        var code = (request.Code ?? string.Empty).Trim();
        var name = (request.Name ?? string.Empty).Trim();

        var duplicated = await _context.ReasonCodes.AnyAsync(r => r.Type == type && r.Code == code);
        if (duplicated)
        {
            _logger.LogWarning("原因代碼 {Type}/{Code} 已存在,拒絕重複建立", type, code);
            return (null, true);
        }

        var entity = new ReasonCode
        {
            Type = type,
            Code = Truncate(code, MaxCodeLength),
            Name = Truncate(name, MaxNameLength),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : Truncate(request.Category.Trim(), MaxCategoryLength),
            DisplayOrder = request.DisplayOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ReasonCodes.Add(entity);
        await _context.SaveChangesAsync();

        return (ReasonCodeDto.From(entity), false);
    }

    /// <summary>
    /// 更新原因。
    /// 輸入:id 與請求本體;只套用 Name / Category / DisplayOrder / IsActive。
    /// 輸出:查無該列時 false。
    /// 邏輯:Type 與 Code 刻意不套用 —— 改了等於換一筆,歷史 ProductionStop/Defect 的快照會對不上。
    /// </summary>
    public async Task<bool> UpdateReasonAsync(Guid id, ReasonUpdateRequest request)
    {
        var entity = await _context.ReasonCodes.FirstOrDefaultAsync(r => r.Id == id);
        if (entity == null) return false;

        if (!string.IsNullOrWhiteSpace(request.Name))
            entity.Name = Truncate(request.Name.Trim(), MaxNameLength);

        if (!string.IsNullOrWhiteSpace(request.Category))
            entity.Category = Truncate(request.Category.Trim(), MaxCategoryLength);

        if (request.DisplayOrder.HasValue)
            entity.DisplayOrder = request.DisplayOrder.Value;

        if (request.IsActive.HasValue)
            entity.IsActive = request.IsActive.Value;

        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// 軟刪除(IsActive = false)。
    /// 輸入:id;輸出:查無回 false,其餘回 true(已是 false 也回 true,冪等)。
    /// </summary>
    public async Task<bool> DeleteReasonAsync(Guid id)
    {
        var entity = await _context.ReasonCodes.FirstOrDefaultAsync(r => r.Id == id);
        if (entity == null) return false;

        if (entity.IsActive)
        {
            entity.IsActive = false;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return true;
    }

    /// <summary>
    /// 字串截斷。輸入:原字串與上限;輸出:不超過上限的字串。
    /// </summary>
    private static string Truncate(string value, int max)
        => value.Length <= max ? value : value[..max];
}
