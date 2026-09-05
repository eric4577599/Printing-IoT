using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Constants;
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
        // S5:後端已預設拒絕未驗證請求,測試客戶端一律帶 ADMIN 權杖通過授權層
        _client.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);
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

    /// <summary>
    /// 測試產品檔 fixture：3 個 RSC(常規開槽箱)+ 1 個 HSC(半槽箱)。
    /// 輸入：無。輸出：4 筆 Product 種子資料。
    /// 邏輯：以箱型(DieCutType=RSC/HSC)× 楞型(FluteType=A/B/AB)組合,
    ///       楞型與層數對應實務(A/B 單瓦楞=3 層,AB 雙瓦楞=5 層)。
    /// </summary>
    public static List<Product> BoxStyleTestProducts() => new()
    {
        // RSC × A 楞:最厚單瓦楞,大型外箱
        new Product { ProductCode = "RSC-A-001",  Name = "RSC A楞 標準外箱",
            DieCutType = "RSC", FluteType = "A",  LayerCount = 3, MaterialGrade = "Kraft",
            Length = 400, Width = 300, Height = 250, BundleCount = 25, PackingType = "Bundle" },
        // RSC × B 楞:較薄單瓦楞,中型箱
        new Product { ProductCode = "RSC-B-001",  Name = "RSC B楞 中型箱",
            DieCutType = "RSC", FluteType = "B",  LayerCount = 3, MaterialGrade = "Kraft",
            Length = 350, Width = 250, Height = 200, BundleCount = 50, PackingType = "Bundle" },
        // RSC × AB 楞:雙瓦楞,重載強化箱
        new Product { ProductCode = "RSC-AB-001", Name = "RSC AB楞 重載箱",
            DieCutType = "RSC", FluteType = "AB", LayerCount = 5, MaterialGrade = "Kraft",
            Length = 600, Width = 400, Height = 400, BundleCount = 20, PackingType = "Pallet" },
        // HSC × B 楞:半槽箱(無上蓋),內襯/套箱用
        new Product { ProductCode = "HSC-B-001",  Name = "HSC B楞 半槽箱",
            DieCutType = "HSC", FluteType = "B",  LayerCount = 3, MaterialGrade = "White",
            Length = 350, Width = 250, Height = 300, BundleCount = 40, PackingType = "Bundle" },
    };

    [Fact]
    public async Task ScenarioC_BoxStyleProducts_RSC_HSC_FullFlow()
    {
        var fixture = BoxStyleTestProducts();
        var created = new List<Product>();

        // 1. 建立 4 個測試產品檔(RSC A/B/AB + HSC B)
        foreach (var p in fixture)
        {
            var response = await _client.PostAsJsonAsync("/api/products", p);
            if (!response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to create product {p.ProductCode}. Status: {response.StatusCode} Content: {content}");
            }
            var item = await response.Content.ReadFromJsonAsync<Product>();
            Assert.NotNull(item);
            created.Add(item!);
        }

        // 2. 驗證清單含全部 4 筆,且箱型/楞型欄位正確回存
        var list = await _client.GetFromJsonAsync<List<Product>>("/api/products");
        Assert.NotNull(list);
        foreach (var expected in fixture)
        {
            var match = list!.SingleOrDefault(x => x.ProductCode == expected.ProductCode);
            Assert.NotNull(match);
            Assert.Equal(expected.DieCutType, match!.DieCutType);
            Assert.Equal(expected.FluteType, match.FluteType);
            Assert.Equal(expected.LayerCount, match.LayerCount);
        }

        // 2a. 箱型分佈:3 個 RSC、1 個 HSC
        var mine = list!.Where(x => x.ProductCode.StartsWith("RSC-") || x.ProductCode.StartsWith("HSC-")).ToList();
        Assert.Equal(3, mine.Count(x => x.DieCutType == "RSC"));
        Assert.Equal(1, mine.Count(x => x.DieCutType == "HSC"));
        // 楞型涵蓋 A / B / AB
        Assert.Contains(mine, x => x.FluteType == "A");
        Assert.Contains(mine, x => x.FluteType == "AB");
        Assert.Equal(2, mine.Count(x => x.FluteType == "B")); // RSC-B 與 HSC-B

        // 3. 逐筆 GET 驗證(讀單筆)
        foreach (var c in created)
        {
            var got = await _client.GetFromJsonAsync<Product>($"/api/products/{c.Id}");
            Assert.NotNull(got);
            Assert.Equal(c.ProductCode, got!.ProductCode);
        }

        // 4. 更新:把 AB 楞箱改為 7 層(加掛面板),驗證寫回
        var ab = created.Single(x => x.ProductCode == "RSC-AB-001");
        ab.LayerCount = 7;
        ab.Name = "RSC AB楞 重載箱(7層強化)";
        var updateRes = await _client.PutAsJsonAsync($"/api/products/{ab.Id}", ab);
        updateRes.EnsureSuccessStatusCode();
        var checkUpdate = await _client.GetFromJsonAsync<Product>($"/api/products/{ab.Id}");
        Assert.NotNull(checkUpdate);
        Assert.Equal(7, checkUpdate!.LayerCount);

        // 5. 清理
        foreach (var c in created)
        {
            var del = await _client.DeleteAsync($"/api/products/{c.Id}");
            del.EnsureSuccessStatusCode();
        }
        var finalList = await _client.GetFromJsonAsync<List<Product>>("/api/products");
        Assert.NotNull(finalList);
        Assert.DoesNotContain(finalList!, x => x.ProductCode.StartsWith("RSC-") || x.ProductCode.StartsWith("HSC-"));
    }
}
