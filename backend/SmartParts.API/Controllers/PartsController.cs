using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartParts.API.Data;
using SmartParts.API.DTOs;
using SmartParts.API.Services;

namespace SmartParts.API.Controllers;

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
