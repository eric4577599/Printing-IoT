using PrintingIoT.Core.DTOs.Parts;

namespace PrintingIoT.Core.Interfaces;

/// <summary>
/// IPartService — 零件服務介面
/// Migrated from SmartParts.API.Services.IPartService (Phase 3.3)
/// </summary>
public interface IPartService
{
    Task<IEnumerable<PartDto>> GetPartsAsync(string? keyword);
    Task<Guid> CreatePartAsync(CreatePartDto dto);
}
