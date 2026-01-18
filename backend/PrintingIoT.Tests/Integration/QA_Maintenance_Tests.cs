using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using PrintingIoT.Core.Entities.Maintenance;
using System.Net.Http.Json;

namespace PrintingIoT.Tests.Integration;

public class QA_Maintenance_Tests : IClassFixture<CustomWebApplicationFactory<Program>>
{
    private readonly CustomWebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public QA_Maintenance_Tests(CustomWebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Scenario_MaintenanceConfig_And_StockDeduction()
    {
        // 1. Create Spare Part
        var part = new SparePart
        {
            PartName = "QA Bearing",
            Specification = "X-100",
            StockQuantity = 10,
            MinimumStockLevel = 2
        };
        var partRes = await _client.PostAsJsonAsync("/api/maintenance/parts", part);
        partRes.EnsureSuccessStatusCode();
        var createdPart = await partRes.Content.ReadFromJsonAsync<SparePart>();
        Assert.NotNull(createdPart);
        Assert.Equal(10, createdPart!.StockQuantity);

        // 2. Create Schedule
        var schedule = new MaintenanceSchedule
        {
            Name = "Weekly Bearing Config",
            Frequency = FrequencyType.Weekly,
            IsPartRequired = true,
            Description = "Check and Replace"
        };
        var schedRes = await _client.PostAsJsonAsync("/api/maintenance/schedules", schedule);
        schedRes.EnsureSuccessStatusCode();
        var createdSchedule = await schedRes.Content.ReadFromJsonAsync<MaintenanceSchedule>();
        Assert.NotNull(createdSchedule);

        // 3. Execute Maintenance (Use 3 parts)
        var record1 = new MaintenanceRecord
        {
            ScheduleId = createdSchedule!.Id,
            PartId = createdPart.Id,
            QuantityUsed = 3,
            Type = MaintenanceType.Routine,
            Status = MaintenanceStatus.Completed,
            Technician = "QA Tester",
            Notes = "First Run"
        };
        var recRes1 = await _client.PostAsJsonAsync("/api/maintenance/records", record1);
        recRes1.EnsureSuccessStatusCode();

        // 4. Verify Stock Deduction (10 - 3 = 7)
        // Re-fetch part
        var partsList = await _client.GetFromJsonAsync<List<SparePart>>("/api/maintenance/parts");
        var updatedPart = partsList!.FirstOrDefault(p => p.Id == createdPart.Id);
        Assert.NotNull(updatedPart);
        Assert.Equal(7, updatedPart!.StockQuantity);

        // 5. Execute Again (Use 8 parts -> Overshoot?)
        var record2 = new MaintenanceRecord
        {
            ScheduleId = createdSchedule.Id,
            PartId = createdPart.Id,
            QuantityUsed = 8,
            Type = MaintenanceType.Routine,
            Status = MaintenanceStatus.Completed,
            Technician = "QA Tester",
            Notes = "Overshoot Run"
        };
        var recRes2 = await _client.PostAsJsonAsync("/api/maintenance/records", record2);
        recRes2.EnsureSuccessStatusCode();

        // 6. Verify Stock (7 - 8 = -1) 
        // Current logic allows negative stock (backorder)
        partsList = await _client.GetFromJsonAsync<List<SparePart>>("/api/maintenance/parts");
        updatedPart = partsList!.FirstOrDefault(p => p.Id == createdPart.Id);
        Assert.Equal(-1, updatedPart!.StockQuantity);
    }

    [Fact]
    public async Task Scenario_BreakdownReporting()
    {
        // 1. Report Breakdown (No Schedule, Just Part)
        // Create Part first
        var part = new SparePart { PartName = "Motor", StockQuantity = 1 };
        var pRes = await _client.PostAsJsonAsync("/api/maintenance/parts", part);
        var createdPart = await pRes.Content.ReadFromJsonAsync<SparePart>();

        var record = new MaintenanceRecord
        {
            PartId = createdPart!.Id,
            Type = MaintenanceType.Repair,
            Status = MaintenanceStatus.Pending,
            Technician = "Operator A",
            Notes = "Motor Stopped Working"
        };

        var res = await _client.PostAsJsonAsync("/api/maintenance/records", record);
        res.EnsureSuccessStatusCode();
        var createdRecord = await res.Content.ReadFromJsonAsync<MaintenanceRecord>();
        
        Assert.NotNull(createdRecord);
        Assert.Equal(MaintenanceType.Repair, createdRecord!.Type);
        Assert.Equal(MaintenanceStatus.Pending, createdRecord!.Status);

        // 2. Verify List
        var list = await _client.GetFromJsonAsync<List<MaintenanceRecord>>("/api/maintenance/records");
        Assert.Contains(list!, r => r.Notes == "Motor Stopped Working");
    }
}
