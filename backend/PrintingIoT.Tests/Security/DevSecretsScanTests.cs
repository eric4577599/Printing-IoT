using System.Text.Json;

namespace PrintingIoT.Tests.Security;

/// <summary>
/// S5 / AC-28:開發設定檔不得再含 JWT 簽章密鑰。
///
/// 以檔案內容直接斷言(而非讀 IConfiguration),因為要防的是「密鑰進版控」這件事本身。
/// 注意:移除檔案內容不等於撤銷 —— 舊密鑰仍在版控歷史中,部署前必須輪替(見交付報告 R4)。
/// </summary>
public class DevSecretsScanTests
{
    /// <summary>
    /// 從測試組件所在目錄往上找出方案根目錄。
    /// 輸入:無;輸出:含 backend/PrintingIoT.API 的根目錄路徑;
    /// 邏輯:逐層往上找,找不到就讓測試以明確訊息失敗,而不是靜默略過。
    /// </summary>
    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "backend", "PrintingIoT.API")))
                return dir.FullName;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("找不到方案根目錄(預期路徑含 backend/PrintingIoT.API)");
    }

    private static string DevSettingsPath() =>
        Path.Combine(FindRepoRoot(), "backend", "PrintingIoT.API", "appsettings.Development.json");

    // AC-28:appsettings.Development.json 不含 Jwt 區塊,也不含任何 Secret 鍵
    [Fact]
    public void DevelopmentAppSettings_ContainsNoJwtSectionAndNoSecretKey()
    {
        var path = DevSettingsPath();
        Assert.True(File.Exists(path), $"找不到 {path}");

        var raw = File.ReadAllText(path);
        Assert.DoesNotContain("Secret", raw, StringComparison.OrdinalIgnoreCase);

        using var doc = JsonDocument.Parse(raw);
        Assert.False(doc.RootElement.TryGetProperty("Jwt", out _), "appsettings.Development.json 不得含 Jwt 區塊");
    }

    // 延伸防呆:曾外洩的開發密鑰字面值不得再出現在任何 appsettings 檔
    [Fact]
    public void LeakedDevSecretLiteral_IsGoneFromAllAppSettings()
    {
        var apiDir = Path.Combine(FindRepoRoot(), "backend", "PrintingIoT.API");
        foreach (var file in Directory.GetFiles(apiDir, "appsettings*.json"))
        {
            var raw = File.ReadAllText(file);
            Assert.DoesNotContain("DevOnlyLocalSecretKeyAtLeast32CharsLong", raw);
        }
    }
}
