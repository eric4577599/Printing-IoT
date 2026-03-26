using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Interfaces;

namespace PrintingIoT.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public SettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet("communication")]
    public async Task<IActionResult> GetCommunicationSettings()
    {
        var settings = await _settingsService.GetCommunicationSettingsAsync();
        return Ok(settings);
    }

    [HttpPut("communication")]
    public async Task<IActionResult> UpdateCommunicationSettings([FromBody] object settings)
    {
        await _settingsService.UpdateCommunicationSettingsAsync(settings);
        return Ok(new { success = true });
    }

    [HttpGet("machine-sections")]
    public async Task<ActionResult<IEnumerable<MachineSection>>> GetMachineSections()
    {
        var sections = await _settingsService.GetMachineSectionsAsync();
        return Ok(sections);
    }

    [HttpPost("machine-sections")]
    public async Task<ActionResult<MachineSection>> CreateMachineSection(MachineSection section)
    {
        var createdSection = await _settingsService.CreateMachineSectionAsync(section);
        return CreatedAtAction(nameof(GetMachineSections), new { id = createdSection.Id }, createdSection);
    }

    [HttpPut("machine-sections/{id}")]
    public async Task<IActionResult> UpdateMachineSection(Guid id, MachineSection section)
    {
        var success = await _settingsService.UpdateMachineSectionAsync(id, section);
        if (!success) return BadRequest();
        return Ok(new { success = true });
    }

    [HttpDelete("machine-sections/{id}")]
    public async Task<IActionResult> DeleteMachineSection(Guid id)
    {
        var success = await _settingsService.DeleteMachineSectionAsync(id);
        if (!success) return NotFound();
        return Ok(new { success = true });
    }

    [HttpGet("box-types")]
    public async Task<IActionResult> GetBoxTypes()
    {
        var types = await _settingsService.GetBoxTypesAsync();
        return Ok(types);
    }

    [HttpPut("box-types")]
    public async Task<IActionResult> UpdateBoxTypes([FromBody] List<object> types)
    {
        await _settingsService.UpdateBoxTypesAsync(types);
        return Ok(new { success = true });
    }
}
