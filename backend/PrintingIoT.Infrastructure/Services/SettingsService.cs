using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Infrastructure.Data;

namespace PrintingIoT.Infrastructure.Services;

public class SettingsService : ISettingsService
{
    private readonly PrintingContext _context;
    private readonly IConnectionMultiplexer _redis;
    private const string CommunicationRedisKey = "config/communication";
    private const string BoxTypesRedisKey = "config/box-types";

    public SettingsService(PrintingContext context, IConnectionMultiplexer redis)
    {
        _context = context;
        _redis = redis;
    }

    public async Task<object> GetCommunicationSettingsAsync()
    {
        var db = _redis.GetDatabase();
        var json = await db.StringGetAsync(CommunicationRedisKey);
        if (json.HasValue)
        {
            return JsonSerializer.Deserialize<object>(json.ToString())!;
        }
        
        // Default values
        return new { 
            plc_enabled = true,
            plc_simulate = false,
            plc_device_type = "wise",
            plc_ip = "192.168.1.1",
            plc_port = 502,
            mqtt_broker_url = "mqtt.infotech-consultant.com",
            mqtt_topic = "Advantech/+/data",
            machine_id = "MACHINE_01",
            data_log_interval = 300
        };
    }

    public async Task<bool> UpdateCommunicationSettingsAsync(object settings)
    {
        var db = _redis.GetDatabase();
        await db.StringSetAsync(CommunicationRedisKey, JsonSerializer.Serialize(settings));
        return true;
    }

    public async Task<List<object>> GetBoxTypesAsync()
    {
        var db = _redis.GetDatabase();
        var json = await db.StringGetAsync(BoxTypesRedisKey);
        if (json.HasValue)
        {
            return JsonSerializer.Deserialize<List<object>>(json.ToString())!;
        }
        return new List<object>(); 
    }

    public async Task<bool> UpdateBoxTypesAsync(List<object> types)
    {
        var db = _redis.GetDatabase();
        await db.StringSetAsync(BoxTypesRedisKey, JsonSerializer.Serialize(types));
        return true;
    }

    public async Task<IEnumerable<MachineSection>> GetMachineSectionsAsync()
    {
        return await _context.MachineSections.OrderBy(s => s.DisplayOrder).ToListAsync();
    }

    public async Task<MachineSection> CreateMachineSectionAsync(MachineSection section)
    {
        _context.MachineSections.Add(section);
        await _context.SaveChangesAsync();
        return section;
    }

    public async Task<bool> UpdateMachineSectionAsync(Guid id, MachineSection section)
    {
        if (id != section.Id) return false;
        
        _context.Entry(section).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteMachineSectionAsync(Guid id)
    {
        var section = await _context.MachineSections.FindAsync(id);
        if (section == null) return false;

        _context.MachineSections.Remove(section);
        await _context.SaveChangesAsync();
        return true;
    }
}
