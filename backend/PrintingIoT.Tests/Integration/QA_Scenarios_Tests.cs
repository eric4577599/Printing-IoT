using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;
using System.Net.Http.Json;

namespace PrintingIoT.Tests.Integration;

public class CustomWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram> where TProgram : class
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("environment", "Testing");

        builder.ConfigureServices(services =>
        {
            var descriptors = services.Where(
                d => d.ServiceType == typeof(DbContextOptions<PrintingContext>) ||
                     d.ServiceType == typeof(DbContextOptions) ||
                     d.ServiceType == typeof(PrintingContext)).ToList();

            foreach (var d in descriptors)
            {
                services.Remove(d);
            }

            services.AddDbContext<PrintingContext>(options =>
            {
                options.UseInMemoryDatabase("InMemoryDbForTesting");
                options.EnableSensitiveDataLogging();
            });
        });
    }
}

public class QA_Scenarios_Tests : IClassFixture<CustomWebApplicationFactory<Program>>
{
    private readonly CustomWebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public QA_Scenarios_Tests(CustomWebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ScenarioA_ProductManagement_CRUD_5_Items()
    {
        // 1. Create 5 Products
        var products = new List<Product>();
        for (int i = 1; i <= 5; i++)
        {
            var p = new Product
            {
                ProductCode = $"A-Type-{i:000}",
                Name = $"Test Product A-{i}",
                OptimizationPhase = 100 * i,
                OptimizationGap = 10
            };
            var response = await _client.PostAsJsonAsync("/api/products", p);
            if (!response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to create product. Status: {response.StatusCode} Content: {content}");
            }
            response.EnsureSuccessStatusCode();
            var created = await response.Content.ReadFromJsonAsync<Product>();
            Assert.NotNull(created);
            products.Add(created!);
        }

        // 2. Verify List
        var listResponse = await _client.GetFromJsonAsync<List<Product>>("/api/products");
        Assert.NotNull(listResponse);
        Assert.True(listResponse!.Count >= 5);
        Assert.Contains(listResponse, x => x.ProductCode == "A-Type-001");

        // 3. Update
        var toUpdate = products[0];
        toUpdate.Name = "Updated Name A-001";
        var updateResponse = await _client.PutAsJsonAsync($"/api/products/{toUpdate.Id}", toUpdate);
        updateResponse.EnsureSuccessStatusCode();

        var checkUpdate = await _client.GetFromJsonAsync<Product>($"/api/products/{toUpdate.Id}");
        Assert.NotNull(checkUpdate);
        Assert.Equal("Updated Name A-001", checkUpdate!.Name);

        // 4. Delete
        foreach (var p in products)
        {
            var deleteResponse = await _client.DeleteAsync($"/api/products/{p.Id}");
            deleteResponse.EnsureSuccessStatusCode();
        }

        var finalList = await _client.GetFromJsonAsync<List<Product>>("/api/products");
        Assert.NotNull(finalList);
        Assert.DoesNotContain(finalList!, x => x.ProductCode.StartsWith("A-Type-"));
    }

    [Fact]
    public async Task ScenarioB_OrderManagement_CRUD_5_Items()
    {
        // 1. Create 5 Orders
        var orders = new List<Order>();
        for (int i = 1; i <= 5; i++)
        {
            var order = new Order
            {
                OrderNumber = $"ORD-TEST-{i:000}",
                CustomerName = "QA Customer",
                TargetLength = 5000 + (i * 100),
                BoxType = "A Type", // As per requirement
                Quantity = 1000,
                Status = OrderStatus.Pending
            };
            var res = await _client.PostAsJsonAsync("/api/orders", order);
            res.EnsureSuccessStatusCode();
            var created = await res.Content.ReadFromJsonAsync<Order>();
            Assert.NotNull(created);
            orders.Add(created!);
        }

        // 2. Verify
        var listRes = await _client.GetFromJsonAsync<List<Order>>("/api/orders");
        Assert.NotNull(listRes);
        Assert.True(listRes!.Count >= 5);

        // 3. Update Status (Production Flow)
        var toRun = orders[0];
        // Pending -> InProgress
        var runRes = await _client.PutAsync($"/api/orders/{toRun.Id}/status?status=InProgress", null);
        runRes.EnsureSuccessStatusCode();

        var checkRun = await _client.GetFromJsonAsync<Order>($"/api/orders/{toRun.Id}");
        Assert.NotNull(checkRun);
        Assert.Equal(OrderStatus.InProgress, checkRun!.Status);

        // InProgress -> Pending (Return / Interrupt)
        var returnRes = await _client.PutAsync($"/api/orders/{toRun.Id}/status?status=Pending", null);
        returnRes.EnsureSuccessStatusCode();
        
        var checkReturn = await _client.GetFromJsonAsync<Order>($"/api/orders/{toRun.Id}");
        Assert.NotNull(checkReturn);
        Assert.Equal(OrderStatus.Pending, checkReturn!.Status);

        // InProgress -> Completed
        await _client.PutAsync($"/api/orders/{toRun.Id}/status?status=Completed", null);
        var checkComplete = await _client.GetFromJsonAsync<Order>($"/api/orders/{toRun.Id}");
        Assert.NotNull(checkComplete);
        Assert.Equal(OrderStatus.Completed, checkComplete!.Status);
        Assert.NotNull(checkComplete.CompletedAt);

        // 4. Cleanup
        foreach (var o in orders)
        {
             await _client.DeleteAsync($"/api/orders/{o.Id}");
        }
    }
}
