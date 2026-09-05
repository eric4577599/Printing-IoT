using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Constants;
using PrintingIoT.Infrastructure.Data;
using System.Net;
using System.Net.Http.Json;
using System.Text;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// 排程同步端點整合測試(S1 / DF-04,對應 AC-27、AC-28)。
/// Service 層已有 upsert 語意的單元測試,本檔補的是端點層:
/// 本體為 null 的 400 分支、以及「清單外的既有訂單不被刪除」在真實 HTTP 管線下仍成立。
/// 以獨立的 InMemory 資料庫執行,不連任何真實資料庫。
/// </summary>
public class OrdersSyncControllerTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _dbName = "OrdersSyncControllerTests-" + Guid.NewGuid();

    public OrdersSyncControllerTests()
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("environment", "Testing");

            builder.ConfigureServices(services =>
            {
                var descriptors = services.Where(
                    d => d.ServiceType == typeof(DbContextOptions<PrintingContext>) ||
                         d.ServiceType == typeof(DbContextOptions) ||
                         d.ServiceType == typeof(PrintingContext)).ToList();

                foreach (var d in descriptors) services.Remove(d);

                services.AddDbContext<PrintingContext>(options => options.UseInMemoryDatabase(_dbName));
            });
        });

        _client = _factory.CreateClient();
        // S5:後端已預設拒絕未驗證請求,測試客戶端一律帶 ADMIN 權杖通過授權層
        _client.DefaultRequestHeaders.Authorization = TestAuthTokenFactory.Header(AppRoles.Admin);
    }

    /// <summary>
    /// 取得測試用資料庫上下文(以獨立 scope 讀取,避免與請求 scope 混用)。
    /// 輸入:無;輸出:scope 與其 PrintingContext。
    /// </summary>
    private (IServiceScope scope, PrintingContext context) CreateContext()
    {
        var scope = _factory.Services.CreateScope();
        return (scope, scope.ServiceProvider.GetRequiredService<PrintingContext>());
    }

    /// <summary>
    /// 直接寫入兩筆既有排程(A 在前、B 在後),作為端點測試的基準資料。
    /// 輸入:無;輸出:A、B 兩筆訂單實體(已 SaveChanges)。
    /// </summary>
    private async Task<(Order a, Order b)> SeedTwoOrdersAsync()
    {
        var (scope, context) = CreateContext();
        using (scope)
        {
            var a = new Order
            {
                OrderNumber = "SYNC-A",
                CustomerName = "客戶A",
                TargetLength = 1000m,
                PaperSpec = "AB",
                Sequence = 0,
                CreatedAt = DateTime.UtcNow.AddMinutes(-10),
            };
            var b = new Order
            {
                OrderNumber = "SYNC-B",
                CustomerName = "客戶B",
                TargetLength = 2000m,
                PaperSpec = "BC",
                Sequence = 7,
                CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            };

            context.Orders.AddRange(a, b);
            await context.SaveChangesAsync();
            return (a, b);
        }
    }

    // AC-27:本體為 null(送字面上的 "null")→ HTTP 400,且資料庫筆數不變
    [Fact]
    public async Task SyncSchedule_NullBody_Returns400_AndKeepsData()
    {
        await SeedTwoOrdersAsync();

        var content = new StringContent("null", Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/orders/sync", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var (scope, context) = CreateContext();
        using (scope)
        {
            Assert.Equal(2, await context.Orders.CountAsync());
        }
    }

    // AC-28:只送 A → 200,B 仍在且 Sequence 未變;回應依 Sequence 升冪
    [Fact]
    public async Task SyncSchedule_PartialList_KeepsUnlistedOrder_AndReturnsSortedList()
    {
        var (a, b) = await SeedTwoOrdersAsync();

        var payload = new
        {
            orders = new[]
            {
                new { id = a.Id, orderNumber = "SYNC-A", customerName = "客戶A" },
            },
            deleteIds = Array.Empty<Guid>(),
        };

        var response = await _client.PostAsJsonAsync("/api/orders/sync", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<List<Order>>();
        Assert.NotNull(body);

        // 回應為依 Sequence 升冪的完整清單(A 重排為 0、B 維持 7)
        Assert.Equal(2, body!.Count);
        Assert.Equal(new[] { "SYNC-A", "SYNC-B" }, body.Select(o => o.OrderNumber));
        Assert.Equal(new[] { 0, 7 }, body.Select(o => o.Sequence));

        var (scope, context) = CreateContext();
        using (scope)
        {
            Assert.Equal(2, await context.Orders.CountAsync());

            var keptB = await context.Orders.SingleAsync(o => o.Id == b.Id);
            Assert.Equal(7, keptB.Sequence);          // 清單外的列 Sequence 不被重排
            Assert.Equal("BC", keptB.PaperSpec);      // 也不被清空
            Assert.Equal(2000m, keptB.TargetLength);

            // A 未提供的欄位(null)不被覆寫,只有 Sequence 依陣列位置更新
            var updatedA = await context.Orders.SingleAsync(o => o.Id == a.Id);
            Assert.Equal(0, updatedA.Sequence);
            Assert.Equal("AB", updatedA.PaperSpec);
            Assert.Equal(1000m, updatedA.TargetLength);
        }
    }

    // AC-34:完工是「改狀態」不是「刪除」——
    // PUT /api/orders/{id}/status?status=3 回 204,之後 GET /api/orders 該筆仍在且狀態為 Completed(3)。
    [Fact]
    public async Task UpdateStatus_ToCompleted_KeepsOrder_AndPersistsStatus()
    {
        var (a, _) = await SeedTwoOrdersAsync();

        var response = await _client.PutAsync($"/api/orders/{a.Id}/status?status=3", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var list = await _client.GetFromJsonAsync<List<Order>>("/api/orders");
        Assert.NotNull(list);
        Assert.Equal(2, list!.Count);                       // 完工單沒有被刪除

        var completed = list.Single(o => o.Id == a.Id);
        Assert.Equal(OrderStatus.Completed, completed.Status);
        Assert.Equal(3, (int)completed.Status);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }
}
