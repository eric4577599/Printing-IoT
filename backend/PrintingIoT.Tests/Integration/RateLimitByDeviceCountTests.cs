using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using PrintingIoT.Core.DTOs.Auth;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// 限流額度依設備數推導的整合測試(2026-09-07)。
///
/// 這組測試守的是一個**實測出來**的失效模式,不是理論風險:
/// Docker Desktop 的埠轉發會把 localhost、LAN 終端與 Tunnel 流量全部 NAT 成同一個位址,
/// 因此所有客戶端共用一個限流桶。原本寫死的 100/分是照「每個 IP 一個桶」設計的,
/// 在共用桶下等於全廠上限 —— 而一台看板每秒輪詢就吃掉 60/分,兩台就爆掉
/// (2026-09-07 實測:連發 115 次 → 100 過、15 撞 429)。
///
/// 額度因此改由「設備數 × 每台預算」推導。以下釘住三件事:
/// 推導算式正確、絕對覆寫優先於推導、設備數變動時額度跟著變。
/// </summary>
public class RateLimitByDeviceCountTests
{
    private const string AllowedOrigin = "http://localhost:5600";

    /// <summary>
    /// 以指定的限流設定建立測試工廠。
    /// 輸入:要覆寫的設定鍵值;輸出:工廠。
    /// 視窗一律拉長到 5 分鐘,避免測試跑太慢時視窗自己翻頁而誤判。
    /// </summary>
    private static WebApplicationFactory<Program> CreateFactory(Dictionary<string, string?> settings)
    {
        settings["RateLimit:PerDevice:WindowMinutes"] = "5";
        settings["RateLimit:Auth:WindowMinutes"] = "5";
        return AuthTestFactory.Create("RateLimitByDeviceCount-" + Guid.NewGuid(), settings);
    }

    /// <summary>
    /// 打一次不需要身分的端點,回傳狀態碼。
    /// 用登入端點以外的路徑,才驗得到「全域」限流而不是 auth 專屬限流。
    /// </summary>
    private static async Task<HttpStatusCode> HitAsync(HttpClient client) =>
        (await client.GetAsync("/api/orders")).StatusCode;

    /// <summary>送一次登入請求(帳密隨意,只看狀態碼)。</summary>
    private static async Task<HttpStatusCode> LoginAsync(HttpClient client)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login")
        {
            Content = JsonContent.Create(new LoginRequest("nobody", "nothing"))
        };
        request.Headers.Add("Origin", AllowedOrigin);
        return (await client.SendAsync(request)).StatusCode;
    }

    [Fact(DisplayName = "全域額度 = 設備數 × 每台預算")]
    public async Task GlobalLimit_IsDerivedFromDeviceCount()
    {
        // 3 台 × 每台 4 次 = 12 次
        using var factory = CreateFactory(new Dictionary<string, string?>
        {
            ["RateLimit:MaxDevices"] = "3",
            ["RateLimit:PerDevice:PermitLimit"] = "4",
        });
        var client = factory.CreateClient();

        for (var i = 1; i <= 12; i++)
            Assert.NotEqual(HttpStatusCode.TooManyRequests, await HitAsync(client));

        // 第 13 次必須被擋 —— 若額度仍寫死 100,這裡會過,測試就沒有意義
        Assert.Equal(HttpStatusCode.TooManyRequests, await HitAsync(client));
    }

    [Fact(DisplayName = "設備數變多,額度跟著變多")]
    public async Task MoreDevices_MeansMoreQuota()
    {
        // 同樣每台 4 次,設備數從 3 提高到 5 → 額度應為 20
        using var factory = CreateFactory(new Dictionary<string, string?>
        {
            ["RateLimit:MaxDevices"] = "5",
            ["RateLimit:PerDevice:PermitLimit"] = "4",
        });
        var client = factory.CreateClient();

        // 前一個測試在 12 次就被擋,這裡 13~20 必須還過得去
        for (var i = 1; i <= 20; i++)
            Assert.NotEqual(HttpStatusCode.TooManyRequests, await HitAsync(client));

        Assert.Equal(HttpStatusCode.TooManyRequests, await HitAsync(client));
    }

    [Fact(DisplayName = "絕對覆寫優先於推導值")]
    public async Task ExplicitOverride_BeatsDerivedValue()
    {
        // 推導值會是 5 × 100 = 500,但明確覆寫成 6
        using var factory = CreateFactory(new Dictionary<string, string?>
        {
            ["RateLimit:MaxDevices"] = "5",
            ["RateLimit:PerDevice:PermitLimit"] = "100",
            ["RateLimit:Global:PermitLimit"] = "6",
        });
        var client = factory.CreateClient();

        for (var i = 1; i <= 6; i++)
            Assert.NotEqual(HttpStatusCode.TooManyRequests, await HitAsync(client));

        Assert.Equal(HttpStatusCode.TooManyRequests, await HitAsync(client));
    }

    [Fact(DisplayName = "登入額度同樣依設備數推導")]
    public async Task AuthLimit_IsDerivedFromDeviceCount()
    {
        // 2 台 × 每台 3 次 = 6 次
        using var factory = CreateFactory(new Dictionary<string, string?>
        {
            ["RateLimit:MaxDevices"] = "2",
            ["RateLimit:Auth:PerDevicePermitLimit"] = "3",
            // 全域額度放大,確保擋下第 7 次的是 auth 專屬限流而不是全域限流
            ["RateLimit:PerDevice:PermitLimit"] = "1000",
        });
        var client = factory.CreateClient();

        for (var i = 1; i <= 6; i++)
            Assert.NotEqual(HttpStatusCode.TooManyRequests, await LoginAsync(client));

        Assert.Equal(HttpStatusCode.TooManyRequests, await LoginAsync(client));
    }

    [Fact(DisplayName = "設備數為 0 或負數時夾到 1,不得把額度歸零把現場鎖死")]
    public async Task NonPositiveDeviceCount_ClampsToOne()
    {
        using var factory = CreateFactory(new Dictionary<string, string?>
        {
            ["RateLimit:MaxDevices"] = "0",
            ["RateLimit:PerDevice:PermitLimit"] = "3",
        });
        var client = factory.CreateClient();

        // 夾到 1 台 → 額度 3。若沒夾,0 × 3 = 0 會讓第一次請求就 429,現場直接停擺
        for (var i = 1; i <= 3; i++)
            Assert.NotEqual(HttpStatusCode.TooManyRequests, await HitAsync(client));

        Assert.Equal(HttpStatusCode.TooManyRequests, await HitAsync(client));
    }

    [Fact(DisplayName = "預設值(5 台 × 120)足以撐住五台看板每秒輪詢")]
    public async Task DefaultQuota_CoversFiveDashboardsPolling()
    {
        // 不覆寫任何限流設定,走 appsettings 的預設 5 × 120 = 600。
        // 一台看板每秒輪詢 = 60/分,五台 = 300/分,必須在額度之內且留有餘裕。
        using var factory = CreateFactory(new Dictionary<string, string?>());
        var client = factory.CreateClient();

        // 打 300 次(五台看板一分鐘的輪詢量)全部不得被擋
        for (var i = 1; i <= 300; i++)
            Assert.NotEqual(HttpStatusCode.TooManyRequests, await HitAsync(client));
    }
}
