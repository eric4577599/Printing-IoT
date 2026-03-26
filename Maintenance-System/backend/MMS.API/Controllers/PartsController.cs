using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MMS.Core.Entities;
using MMS.Infrastructure.Data;

namespace MMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartsController : ControllerBase
{
    private readonly MmsDbContext _context;

    public PartsController(MmsDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SparePart>>> GetParts()
    {
        return await _context.SpareParts.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SparePart>> GetPart(Guid id)
    {
        var part = await _context.SpareParts.FindAsync(id);
        if (part == null) return NotFound();
        return part;
    }

    [HttpPost]
    public async Task<ActionResult<SparePart>> PostPart(SparePart part)
    {
        _context.SpareParts.Add(part);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPart), new { id = part.Id }, part);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutPart(Guid id, SparePart part)
    {
        if (id != part.Id) return BadRequest();
        _context.Entry(part).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePart(Guid id)
    {
        var part = await _context.SpareParts.FindAsync(id);
        if (part == null) return NotFound();
        _context.SpareParts.Remove(part);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
