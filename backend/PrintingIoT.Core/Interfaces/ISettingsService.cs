using PrintingIoT.Core.Entities;

namespace PrintingIoT.Core.Interfaces;

public interface ISettingsService
{
    // Data (Redis)
    Task<object> GetCommunicationSettingsAsync();
    Task<bool> UpdateCommunicationSettingsAsync(object settings);
    
    Task<List<object>> GetBoxTypesAsync();
    Task<bool> UpdateBoxTypesAsync(List<object> types);

    // Machine Sections (DB)
    Task<IEnumerable<MachineSection>> GetMachineSectionsAsync();
    Task<MachineSection> CreateMachineSectionAsync(MachineSection section);
    Task<bool> UpdateMachineSectionAsync(Guid id, MachineSection section);
    Task<bool> DeleteMachineSectionAsync(Guid id);
}
