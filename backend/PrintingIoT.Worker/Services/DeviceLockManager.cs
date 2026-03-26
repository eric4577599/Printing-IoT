using Microsoft.Extensions.Logging;

namespace PrintingIoT.Worker.Services;

public interface IDeviceLockManager
{
    bool TryAcquireLock(string candidateId);
    string? CurrentLockedDevice { get; }
}

public class DeviceLockManager : IDeviceLockManager
{
    private readonly ILogger<DeviceLockManager> _logger;
    private string? _lockedDeviceId = null;
    private DateTime _lastLockUpdate = DateTime.MinValue;

    public DeviceLockManager(ILogger<DeviceLockManager> logger)
    {
        _logger = logger;
    }

    public string? CurrentLockedDevice => _lockedDeviceId;

    private bool IsHardwareId(string id) => id.Length == 12 && !id.Contains("-"); 

    public bool TryAcquireLock(string candidateId)
    {
        // 1. If no lock, allow
        if (_lockedDeviceId == null) 
        {
            _logger.LogInformation($"[Lock] Init Lock to {candidateId}");
            _lockedDeviceId = candidateId;
            _lastLockUpdate = DateTime.UtcNow;
            return true;
        }

        // 2. If same device, allow & renew
        if (_lockedDeviceId == candidateId)
        {
            _lastLockUpdate = DateTime.UtcNow;
            return true;
        }

        var currentIsHardware = IsHardwareId(_lockedDeviceId);
        var candidateIsHardware = IsHardwareId(candidateId);

        // 3. If locked to Hardware, and Candidate is NOT Hardware -> REJECT PERMANENTLY
        if (currentIsHardware && !candidateIsHardware)
        {
            return false;
        }

        // 4. If locked to Hardware, and Candidate IS Hardware -> Allow switch only if lock expired (>30s)
        if (currentIsHardware && candidateIsHardware)
        {
            if ((DateTime.UtcNow - _lastLockUpdate).TotalSeconds < 30) return false;
            _logger.LogInformation($"[Lock] SWITCH Hardware {_lockedDeviceId} -> {candidateId}");
            _lockedDeviceId = candidateId;
            _lastLockUpdate = DateTime.UtcNow;
            return true;
        }

        // 5. If locked to Software/Sim (Weak Lock) -> Allow Switch logic
        // If Candidate is Hardware -> ALLOW IMMEDIATELY (Upgrade lock)
        if (candidateIsHardware) 
        {
            _logger.LogInformation($"[Lock] UPGRADE {_lockedDeviceId} (Soft) -> {candidateId} (Hard)");
            _lockedDeviceId = candidateId;
            _lastLockUpdate = DateTime.UtcNow;
            return true;
        }

        // If both are Software -> Check timeout
        if ((DateTime.UtcNow - _lastLockUpdate).TotalSeconds < 10) return false;
        
        _logger.LogInformation($"[Lock] SWITCH Software {_lockedDeviceId} -> {candidateId}");
        _lockedDeviceId = candidateId;
        _lastLockUpdate = DateTime.UtcNow;
        return true;
    }
}
