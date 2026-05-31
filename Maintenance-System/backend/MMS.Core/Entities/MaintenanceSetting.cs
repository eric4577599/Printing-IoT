using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MMS.Core.Entities;

/// <summary>
/// 設定來源(cascade 繼承模型)。
/// InheritErp   = 此項值繼承自 ERP 推送的訊息(ErpValue)。
/// LocalOverride= 此項值由維修保養模組本地設定(LocalValue)覆寫,忽略 ERP。
/// </summary>
public enum SettingSource
{
    InheritErp,
    LocalOverride
}

/// <summary>
/// 維修保養設定項(逐項可切換繼承/本地)。
/// 輸入:設定鍵 Key、本地值 LocalValue、來源 Source;ERP 端透過 erp-sync 寫入 ErpValue。
/// 輸出:EffectiveValue(實際生效值,依 Source 在 ERP 值與本地值間 cascade)。
/// 邏輯:每一項設定獨立決定要「繼承 ERP」或「本地覆寫」,類似 CSS cascade。
/// </summary>
public class MaintenanceSetting
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>設定鍵,例:"PreventiveIntervalDays"、"AlertThreshold"。ERP 同步以此對應。</summary>
    [Required]
    [MaxLength(100)]
    public string Key { get; set; } = string.Empty;

    [MaxLength(200)]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>選填:設定作用的機台代碼,空字串代表全廠通用。</summary>
    [MaxLength(50)]
    public string MachineCode { get; set; } = string.Empty;

    /// <summary>單位,例:"days"、"count"、"%"。</summary>
    [MaxLength(20)]
    public string Unit { get; set; } = string.Empty;

    /// <summary>來源模式,預設繼承 ERP。</summary>
    public SettingSource Source { get; set; } = SettingSource.InheritErp;

    /// <summary>本地設定值(Source=LocalOverride 時生效)。</summary>
    [MaxLength(500)]
    public string? LocalValue { get; set; }

    /// <summary>由 ERP 推送並快取的值(Source=InheritErp 時生效)。</summary>
    [MaxLength(500)]
    public string? ErpValue { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>實際生效值:本地覆寫時取 LocalValue,否則取 ERP 繼承值。</summary>
    [NotMapped]
    public string? EffectiveValue => Source == SettingSource.LocalOverride ? LocalValue : ErpValue;
}
