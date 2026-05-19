using Microsoft.AspNetCore.Mvc;
using PrintingIoT.Core.DTOs.Parts;
using PrintingIoT.Core.Interfaces;

namespace PrintingIoT.API.Controllers;

/// <summary>
/// PartsController — 零件管理 API
/// Migrated from SmartParts.API.Controllers.PartsController (Phase 3.3)
/// Route preserved as api/v1/parts for backward compatibility with smart-parts-frontend.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class PartsController : ControllerBase
{
    private readonly IPartService _partService;

    public PartsController(IPartService partService)
    {
        _partService = partService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PartDto>>> GetParts([FromQuery] string? keyword)
    {
        var dtos = await _partService.GetPartsAsync(keyword);
        return Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<PartDto>> CreatePart(CreatePartDto dto)
    {
        try
        {
            var partId = await _partService.CreatePartAsync(dto);
            return CreatedAtAction(nameof(GetParts), new { id = partId }, partId);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }
}
