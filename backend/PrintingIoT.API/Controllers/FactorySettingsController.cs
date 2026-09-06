using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintingIoT.Core.Interfaces;

namespace PrintingIoT.API.Controllers;

/// <summary>
/// S3 / F4:工廠時區與日界的唯讀設定端點。
///
/// 路由掛在 api/settings 之下(與 SettingsController 同一前綴),但**刻意獨立成一個控制器** ——
/// SettingsController 相依 ISettingsService(需要 Redis 連線),而本端點只讀組態,
/// 不該因為 Redis 不可用就一起壞掉。
/// </summary>
[Authorize]
[ApiController]
[Route("api/settings")]
public class FactorySettingsController : ControllerBase
{
    private readonly IFactoryTimeProvider _factoryTime;

    public FactorySettingsController(IFactoryTimeProvider factoryTime)
    {
        _factoryTime = factoryTime;
    }

    /// <summary>
    /// 取得工廠時區與日界。
    /// 輸入:無;輸出:{ timeZone, dayBoundaryHour }。
    /// 用途:前端算本地快取紀錄的工廠日時取得同一組參數,不必把 8 寫死在前端。
    /// </summary>
    [HttpGet("factory-time")]
    public IActionResult GetFactoryTimeSettings()
    {
        return Ok(new
        {
            timeZone = _factoryTime.TimeZoneId,
            dayBoundaryHour = _factoryTime.DayBoundaryHour,
        });
    }
}
