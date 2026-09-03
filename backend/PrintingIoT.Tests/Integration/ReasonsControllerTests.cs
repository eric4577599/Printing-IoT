using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PrintingIoT.Core.Entities;
using PrintingIoT.Infrastructure.Data;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// 原因主檔端點整合測試(S3 / F5,對應 AC-18、AC-19、AC-20)。
/// 以獨立的 InMemory 資料庫執行真實 HTTP 管線,不連任何真實資料庫。
/// </summary>
public class ReasonsControllerTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _dbName = "Reasons-" + Guid.NewGuid();

    public ReasonsControllerTests()
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
    }

    /// <summary>
    /// 取得測試用資料庫上下文。
    /// 輸入:無;輸出:scope 與其 PrintingContext。
    /// </summary>
    private (IServiceScope scope, PrintingContext context) CreateContext()
    {
        var scope = _factory.Services.CreateScope();
        return (scope, scope.ServiceProvider.GetRequiredService<PrintingContext>());
    }

    /// <summary>
    /// 以 POST 建立一筆原因。
    /// 輸入:type、code、name、displayOrder;輸出:HTTP 回應。
    /// </summary>
    private Task<HttpResponseMessage> PostReasonAsync(string type, string code, string name, int displayOrder = 0)
        => _client.PostAsJsonAsync("/api/reasons", new { type, code, name, category = "General", displayOrder });

    // AC-18:stop / defect 互不混入,且依 DisplayOrder → Code 排序
    [Fact]
    public async Task GetReasons_SeparatesTypes_AndSortsByDisplayOrderThenCode()
    {
        await PostReasonAsync("stop", "003", "紙張破裂", 2);
        await PostReasonAsync("stop", "002", "印刷不清", 2);
        await PostReasonAsync("stop", "001", "送紙歪斜", 1);
        await PostReasonAsync("defect", "A01", "壓扁", 1);
        await PostReasonAsync("defect", "A02", "印刷不良", 2);

        var stops = await _client.GetFromJsonAsync<List<JsonElement>>("/api/reasons?type=stop");
        Assert.Equal(new[] { "001", "002", "003" }, stops!.Select(r => r.GetProperty("code").GetString()));
        Assert.All(stops!, r => Assert.Equal("stop", r.GetProperty("type").GetString()));

        var defects = await _client.GetFromJsonAsync<List<JsonElement>>("/api/reasons?type=defect");
        Assert.Equal(new[] { "A01", "A02" }, defects!.Select(r => r.GetProperty("code").GetString()));
        Assert.All(defects!, r => Assert.Equal("defect", r.GetProperty("type").GetString()));
    }

    // AC-19:type 缺少或不合法 → 400
    [Theory]
    [InlineData("/api/reasons")]
    [InlineData("/api/reasons?type=")]
    [InlineData("/api/reasons?type=foo")]
    public async Task GetReasons_MissingOrInvalidType_Returns400(string url)
    {
        var response = await _client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // AC-20:POST 建立成功 → 201 且後續 GET 讀得到;同 (type, code) 再建一次 → 409,資料庫仍只有 1 筆
    [Fact]
    public async Task PostReason_CreatesThenConflictsOnDuplicate()
    {
        var created = await PostReasonAsync("stop", "007", "料捲用盡");
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var list = await _client.GetFromJsonAsync<List<JsonElement>>("/api/reasons?type=stop");
        Assert.Contains(list!, r => r.GetProperty("code").GetString() == "007");

        var duplicate = await PostReasonAsync("stop", "007", "另一個名稱");
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var (scope, context) = CreateContext();
        using (scope)
        {
            Assert.Equal(1, await context.ReasonCodes.CountAsync(r => r.Type == ReasonType.Stop && r.Code == "007"));
        }
    }

    // AC-20 補強:code / name 空白 → 400,不新增任何列
    [Theory]
    [InlineData("", "名稱")]
    [InlineData("008", "")]
    public async Task PostReason_BlankCodeOrName_Returns400(string code, string name)
    {
        var response = await PostReasonAsync("stop", code, name);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var (scope, context) = CreateContext();
        using (scope) Assert.Equal(0, await context.ReasonCodes.CountAsync());
    }

    // AC-20 補強:type 不合法時 POST 也回 400
    [Fact]
    public async Task PostReason_InvalidType_Returns400()
    {
        var response = await PostReasonAsync("foo", "009", "名稱");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // 端點層的軟刪除:DELETE → 204,預設 GET 讀不到、includeInactive=true 讀得到,重複 DELETE 仍 204
    [Fact]
    public async Task DeleteReason_IsSoftDeleteAndIdempotentOverHttp()
    {
        var created = await PostReasonAsync("defect", "A09", "受潮");
        var body = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = body.GetProperty("id").GetGuid();

        var deleted = await _client.DeleteAsync($"/api/reasons/{id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        var active = await _client.GetFromJsonAsync<List<JsonElement>>("/api/reasons?type=defect");
        Assert.Empty(active!);

        var all = await _client.GetFromJsonAsync<List<JsonElement>>("/api/reasons?type=defect&includeInactive=true");
        Assert.Single(all!);
        Assert.False(all![0].GetProperty("isActive").GetBoolean());

        // 冪等:重複刪除仍回 204
        var again = await _client.DeleteAsync($"/api/reasons/{id}");
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
    }

    // 查無的 id:PUT / DELETE 皆回 404
    [Fact]
    public async Task UpdateAndDelete_MissingId_Return404()
    {
        var missingId = Guid.NewGuid();

        var put = await _client.PutAsJsonAsync($"/api/reasons/{missingId}", new { name = "X" });
        Assert.Equal(HttpStatusCode.NotFound, put.StatusCode);

        var delete = await _client.DeleteAsync($"/api/reasons/{missingId}");
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }

    // PUT 更新名稱後 GET 讀得到新值,Code 不變(端點層對應 AC-21)
    [Fact]
    public async Task PutReason_UpdatesNameButKeepsCode()
    {
        var created = await PostReasonAsync("stop", "010", "舊名稱");
        var body = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = body.GetProperty("id").GetGuid();

        var put = await _client.PutAsJsonAsync($"/api/reasons/{id}",
            new { code = "999", type = "defect", name = "新名稱", displayOrder = 5 });
        Assert.Equal(HttpStatusCode.NoContent, put.StatusCode);

        var single = await _client.GetFromJsonAsync<JsonElement>($"/api/reasons/{id}");
        Assert.Equal("010", single.GetProperty("code").GetString());
        Assert.Equal("stop", single.GetProperty("type").GetString());
        Assert.Equal("新名稱", single.GetProperty("name").GetString());
        Assert.Equal(5, single.GetProperty("displayOrder").GetInt32());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }
}
