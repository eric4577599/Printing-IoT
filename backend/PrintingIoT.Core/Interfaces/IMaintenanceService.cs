using PrintingIoT.Core.Entities.Maintenance;

namespace PrintingIoT.Core.Interfaces;

public interface IMaintenanceService
{
    // Schedules
    Task<IEnumerable<MaintenanceSchedule>> GetSchedulesAsync();
    Task<MaintenanceSchedule> CreateScheduleAsync(MaintenanceSchedule schedule);

    // Parts
    Task<IEnumerable<SparePart>> GetPartsAsync();
    Task<SparePart> CreatePartAsync(SparePart part);

    // Records
    Task<IEnumerable<MaintenanceRecord>> GetRecordsAsync();
    Task<MaintenanceRecord> CreateRecordAsync(MaintenanceRecord record);
}
