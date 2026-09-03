using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Infrastructure.Data;
using System.Net;
using System.Net.Http.Json;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// ERP 推單端點整合測試(S1 / SEC-05 + ERP-10)。
/// 以獨立的 InMemory 資料庫與較小的批次上限,驗證批次上限擋在寫入之前、
/// 正常批次的逐列回應、部分失敗仍回 200 且可定位失敗列。
/// </summary>
public class ErpControllerTests : IDisposable
{
    private const int TestMaxBatchSize = 3;

    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _dbName = "ErpControllerTests-" + Guid.NewGuid();

    public ErpControllerTests()
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("environment", "Testing");

            // 以設定值覆寫批次上限,避免測試要送 1001 筆
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Erp:MaxPushBatchSize"] = TestMaxBatchSize.ToString(),
                });
            });

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

    private static OrderDto MakeDto(string number) => new()
    {
        OrderNumber = number,
        CustomerName = "客戶A",
        TargetLength = 1000m,
        Quantity = 500,
    };

    // AC-17:超過批次上限 → HTTP 400,且資料庫零筆寫入
    [Fact]
    public async Task PushOrders_OverBatchLimit_Returns400_AndWritesNothing()
    {
        var payload = Enumerable.Range(1, TestMaxBatchSize + 1).Select(i => MakeDto($"OVER-{i:000}")).ToList();

        var response = await _client.PostAsJsonAsync("/api/erp/push-orders", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var (scope, context) = CreateContext();
        using (scope)
        {
            Assert.Equal(0, await context.Orders.CountAsync(o => o.OrderNumber.StartsWith("OVER-")));
        }
    }

    // Edge case:筆數剛好等於上限 → 通過
    [Fact]
    public async Task PushOrders_ExactlyAtBatchLimit_Succeeds()
    {
        var payload = Enumerable.Range(1, TestMaxBatchSize).Select(i => MakeDto($"EXACT-{i:000}")).ToList();

        var response = await _client.PostAsJsonAsync("/api/erp/push-orders", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErpPushResponseDto>();
        Assert.NotNull(body);
        Assert.True(body!.Success);
        Assert.Equal(TestMaxBatchSize, body.Succeeded);
    }

    // AC-18:正常批次 → 200,逐列回應含 orderNumber 與非空的 orderId
    [Fact]
    public async Task PushOrders_ValidBatch_ReturnsPerRowResults()
    {
        var payload = new List<OrderDto> { MakeDto("OK-001"), MakeDto("OK-002") };

        var response = await _client.PostAsJsonAsync("/api/erp/push-orders", payload);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ErpPushResponseDto>();
        Assert.NotNull(body);
        Assert.True(body!.Success);
        Assert.Equal(2, body.Total);
        Assert.Equal(2, body.Succeeded);
        Assert.Equal(0, body.Failed);
        Assert.Equal(new[] { "OK-001", "OK-002" }, body.Results.Select(r => r.OrderNumber));
        Assert.All(body.Results, r =>
        {
            Assert.True(r.Success);
            Assert.NotNull(r.OrderId);
            Assert.NotEqual(Guid.Empty, r.OrderId!.Value);
            Assert.Null(r.Error);
        });
    }

    // AC-19:部分失敗 → 200、success = false,可由 index / orderNumber 定位失敗列
    [Fact]
    public async Task PushOrders_PartialFailure_Returns200_WithFailedRowLocated()
    {
        var tooLong = new string('X', 51);
        var payload = new List<OrderDto> { MakeDto("PART-001"), MakeDto(tooLong) };

        var response = await _client.PostAsJsonAsync("/api/erp/push-orders", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErpPushResponseDto>();
        Assert.NotNull(body);
        Assert.False(body!.Success);
        Assert.Equal(1, body.Succeeded);
        Assert.Equal(1, body.Failed);

        var failed = body.Results.Single(r => !r.Success);
        Assert.Equal(1, failed.Index);
        Assert.Equal(tooLong, failed.OrderNumber);
        Assert.False(string.IsNullOrEmpty(failed.Error));
        Assert.Null(failed.OrderId);

        var (scope, context) = CreateContext();
        using (scope)
        {
            Assert.Equal(1, await context.Orders.CountAsync(o => o.OrderNumber == "PART-001"));
            Assert.Equal(0, await context.Orders.CountAsync(o => o.OrderNumber == tooLong));
        }
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }
}
