using PrintingIoT.Core.Entities;

namespace PrintingIoT.Core.Interfaces;

public interface IMachineDriver
{
    /// <summary>
    /// Processes specific signals from the raw input and returns a standardized model.
    /// </summary>
    /// <param name="rawPayload">Json or dictionary of raw tags</param>
    /// <returns>Standardized ProductionLog</returns>
    ProductionLog Parse(string deviceId, string rawPayload);
}
