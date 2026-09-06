using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Text.Json;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// API 契約測試 (OpenAPI Schema Validation)
/// Phase 5.4: 確保 API 文件生成不崩潰，合乎標準
/// </summary>
public class OpenApiContractTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public OpenApiContractTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SwaggerEndpoint_ReturnsValidJsonSchema()
    {
        // Swagger 開在 Development 與 Testing；測試使用 Testing 避免觸發 DB Migration
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
        }).CreateClient();

        var response = await client.GetAsync("/swagger/v1/swagger.json");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        
        using var jsonDoc = JsonDocument.Parse(content);
        var root = jsonDoc.RootElement;

        Assert.True(root.TryGetProperty("openapi", out _), "Schema must contain 'openapi' version");
        Assert.True(root.TryGetProperty("info", out _), "Schema must contain 'info' block");
        Assert.True(root.TryGetProperty("paths", out _), "Schema must contain 'paths' block");
        Assert.True(root.TryGetProperty("components", out _), "Schema must contain 'components' block");
    }

    /// <summary>
    /// S3:新增的端點必須出現在 OpenAPI 的 paths 內(規格 §12 DoD 第 5 項)。
    /// 輸入:無;輸出:無(斷言)。
    /// 邏輯:抓 swagger.json,逐一確認完工實績、原因主檔與工廠時間三組路徑都被登錄。
    /// </summary>
    [Theory]
    [InlineData("/api/Production/completions")]
    [InlineData("/api/Production/completions/{id}")]
    [InlineData("/api/Reasons")]
    [InlineData("/api/Reasons/{id}")]
    [InlineData("/api/settings/factory-time")]
    // S5 / AC-29:使用者管理端點必須出現在契約中
    [InlineData("/api/v1/Auth/users")]
    public async Task SwaggerEndpoint_ContainsS3Paths(string expectedPath)
    {
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
        }).CreateClient();

        var response = await client.GetAsync("/swagger/v1/swagger.json");
        response.EnsureSuccessStatusCode();

        using var jsonDoc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var paths = jsonDoc.RootElement.GetProperty("paths");

        Assert.True(paths.TryGetProperty(expectedPath, out _),
            $"OpenAPI paths 應包含 {expectedPath}");
    }
}
