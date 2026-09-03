using PrintingIoT.Core.Entities;

namespace PrintingIoT.Core.DTOs;

/// <summary>S3 / F5:原因主檔對外形狀。</summary>
public class ReasonCodeDto
{
    public Guid Id { get; set; }

    /// <summary>"stop" / "defect",與前端 useReasonCodes 的 type 參數同一組字面值。</summary>
    public string Type { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    /// <summary>
    /// 由實體投影成 DTO。
    /// 輸入:ReasonCode 實體;輸出:對應的 DTO(Type 轉成小寫字面值)。
    /// </summary>
    public static ReasonCodeDto From(ReasonCode entity) => new()
    {
        Id = entity.Id,
        Type = entity.Type == ReasonType.Stop ? "stop" : "defect",
        Code = entity.Code,
        Name = entity.Name,
        Category = entity.Category,
        DisplayOrder = entity.DisplayOrder,
        IsActive = entity.IsActive,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
    };
}

/// <summary>S3 / F5:建立原因的請求本體。</summary>
public class ReasonCreateRequest
{
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? Category { get; set; }
    public int DisplayOrder { get; set; }
}

/// <summary>
/// S3 / F5:更新原因的請求本體。
/// 刻意保留 Code / Type 兩個欄位但**不套用** —— 改了等於換一筆,歷史紀錄會對不上(AC-21)。
/// </summary>
public class ReasonUpdateRequest
{
    /// <summary>忽略欄位:即使帶值也不會生效,只為讓前端可原樣回送整筆資料。</summary>
    public string? Code { get; set; }

    /// <summary>忽略欄位:同上。</summary>
    public string? Type { get; set; }

    public string? Name { get; set; }
    public string? Category { get; set; }
    public int? DisplayOrder { get; set; }
    public bool? IsActive { get; set; }
}
