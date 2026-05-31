using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MMS.Core.Entities;
using MMS.Infrastructure.Data;

namespace MMS.API.Controllers;

/// <summary>ERP 推送單筆設定值的承載格式。</summary>
public class ErpSettingPush
{
    public string Key { get; set; } = string.Empty;
    public string MachineCode { get; set; } = string.Empty; // 空字串=全廠通用
    public string? Value { get; set; }
}

/// <summary>
/// 維修保養設定 API。逐項 cascade:每筆設定可選擇繼承 ERP 或本地覆寫。
/// GET 回傳會帶 EffectiveValue(實際生效值)。
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly MmsDbContext _context;

    public SettingsController(MmsDbContext context)
    {
        _context = context;
    }

    // 取得全部設定(含生效值)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MaintenanceSetting>>> GetSettings()
    {
        return await _context.MaintenanceSettings.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MaintenanceSetting>> GetSetting(Guid id)
    {
        var setting = await _context.MaintenanceSettings.FindAsync(id);
        if (setting == null) return NotFound();
        return setting;
    }

    [HttpPost]
    public async Task<ActionResult<MaintenanceSetting>> PostSetting(MaintenanceSetting setting)
    {
        setting.UpdatedAt = DateTime.UtcNow;
        _context.MaintenanceSettings.Add(setting);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSetting), new { id = setting.Id }, setting);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutSetting(Guid id, MaintenanceSetting setting)
    {
        if (id != setting.Id) return BadRequest();
        setting.UpdatedAt = DateTime.UtcNow;
        _context.Entry(setting).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSetting(Guid id)
    {
        var setting = await _context.MaintenanceSettings.FindAsync(id);
        if (setting == null) return NotFound();
        _context.MaintenanceSettings.Remove(setting);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// ERP 訊息同步入口:ERP 推送 Key→Value,寫入對應設定的 ErpValue 快取。
    /// 只更新 ErpValue,不改 Source;繼承(InheritErp)的設定其 EffectiveValue 隨之更新,
    /// 本地覆寫(LocalOverride)的設定不受影響。回傳實際更新筆數。
    /// </summary>
    [HttpPost("erp-sync")]
    public async Task<ActionResult<object>> ErpSync(List<ErpSettingPush> pushes)
    {
        if (pushes == null || pushes.Count == 0) return Ok(new { updated = 0 });

        int updated = 0;
        foreach (var push in pushes)
        {
            var matches = await _context.MaintenanceSettings
                .Where(s => s.Key == push.Key && s.MachineCode == push.MachineCode)
                .ToListAsync();
            foreach (var s in matches)
            {
                s.ErpValue = push.Value;
                s.UpdatedAt = DateTime.UtcNow;
                updated++;
            }
        }
        await _context.SaveChangesAsync();
        return Ok(new { updated });
    }
}
