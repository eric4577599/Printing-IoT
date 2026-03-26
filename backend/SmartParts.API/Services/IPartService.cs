using SmartParts.API.DTOs;
using SmartParts.API.Entities;

namespace SmartParts.API.Services;

public interface IPartService
{
    Task<IEnumerable<PartDto>> GetPartsAsync(string? keyword);
    Task<Guid> CreatePartAsync(CreatePartDto dto);
}
