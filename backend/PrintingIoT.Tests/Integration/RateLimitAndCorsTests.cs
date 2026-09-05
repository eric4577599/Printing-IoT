using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using PrintingIoT.Core.DTOs.Auth;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// S5 限流、CORS 與轉發標頭整合測試(AC-26 / AC-27)。
///
/// 兩件事:① CORS 中介軟體排在限流之前,因此 429 回應仍帶 Access-Control-Allow-Origin;
/// ② UseForwardedHeaders 改寫 RemoteIpAddress,限流分區因此依「轉發後的真實來源」切分。
/// </summary>
public class RateLimitAndCorsTests
{
    private const string AllowedOrigin = "http://localhost:5600";

    /// <summary>
    /// 建立限流上限極小的測試工廠,讓少數幾次請求就能撞到 429。
    /// 輸入:auth 限流上限;輸出:工廠。
    /// </summary>
    private static WebApplicationFactory<Program> CreateFactory(int authPermitLimit) =>
        AuthTestFactory.Create("RateLimitAndCorsTests-" + Guid.NewGuid(), new Dictionary<string, string?>
        {
            ["RateLimit:Auth:PermitLimit"] = authPermitLimit.ToString(),
            ["RateLimit:Auth:WindowMinutes"] = "5",
        });

    /// <summary>
    /// 送出一次登入請求。
    /// 輸入:客戶端、Origin 標頭、可選的 X-Forwarded-For;
    /// 輸出:回應;邏輯:帳密隨意即可 —— 本測試只看狀態碼與標頭,不看登入結果。
    /// </summary>
    private static async Task<HttpResponseMessage> PostLoginAsync(HttpClient client, string? origin, string? forwardedFor)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login")
        {
            Content = JsonContent.Create(new LoginRequest("nobody", "nothing"))
        };
        if (origin != null) request.Headers.Add("Origin", origin);
        if (forwardedFor != null) request.Headers.Add("X-Forwarded-For", forwardedFor);
        return await client.SendAsync(request);
    }

    // AC-26:撞到 429 的那次回應必須仍帶 Access-Control-Allow-Origin
    [Fact]
    public async Task RateLimited429_StillCarriesCorsHeader()
    {
        using var factory = CreateFactory(authPermitLimit: 3);
        var client = factory.CreateClient();

        HttpResponseMessage? throttled = null;
        for (var i = 0; i < 10 && throttled == null; i++)
        {
            var response = await PostLoginAsync(client, AllowedOrigin, "203.0.113.10");
            if (response.StatusCode == HttpStatusCode.TooManyRequests) throttled = response;
        }

        Assert.NotNull(throttled);
        Assert.True(throttled!.Headers.Contains("Access-Control-Allow-Origin"),
            "429 回應必須帶 CORS 標頭,否則瀏覽器只會看到不明錯誤");
        Assert.Equal(AllowedOrigin, throttled.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    // AC-27:兩個不同 X-Forwarded-For 各自打到接近上限,彼此不互相耗用配額
    [Fact]
    public async Task DifferentForwardedFor_DoNotShareQuota()
    {
        const int limit = 4;
        using var factory = CreateFactory(authPermitLimit: limit);
        var client = factory.CreateClient();

        // 兩個來源各打 limit - 1 次,若配額共用,第二個來源會提早撞 429
        for (var i = 0; i < limit - 1; i++)
        {
            var a = await PostLoginAsync(client, AllowedOrigin, "198.51.100.1");
            Assert.NotEqual(HttpStatusCode.TooManyRequests, a.StatusCode);
        }
        for (var i = 0; i < limit - 1; i++)
        {
            var b = await PostLoginAsync(client, AllowedOrigin, "198.51.100.2");
            Assert.NotEqual(HttpStatusCode.TooManyRequests, b.StatusCode);
        }

        // 再讓其中一個來源打滿,證明限流確實有在計數(不是整個關掉)
        var last = await PostLoginAsync(client, AllowedOrigin, "198.51.100.1");
        Assert.NotEqual(HttpStatusCode.TooManyRequests, last.StatusCode);
        var over = await PostLoginAsync(client, AllowedOrigin, "198.51.100.1");
        Assert.Equal(HttpStatusCode.TooManyRequests, over.StatusCode);

        // 另一個來源此時仍有剩餘配額
        var other = await PostLoginAsync(client, AllowedOrigin, "198.51.100.2");
        Assert.NotEqual(HttpStatusCode.TooManyRequests, other.StatusCode);
    }

    // ── S6:CORS 預檢驗收出口(AC-57 / AC-58)──────────────────────────────
    // S5 §8 E6 要求「順序修正後必須實測確認」卻沒有對應 AC,全測試專案零個 OPTIONS 斷言。
    // 這兩條補的是**契約與回歸保護**:CorsMiddleware 必須排在 Authentication 之前短路預檢,
    // 否則瀏覽器連正式請求都送不出去,現場只會看到不明的網路錯誤。

    /// <summary>
    /// 送出一次 CORS 預檢(OPTIONS)。
    /// 輸入:客戶端、Origin 標頭值;
    /// 輸出:回應;邏輯:刻意**不帶任何權杖**,證明預檢不會被授權層擋成 401。
    /// </summary>
    private static async Task<HttpResponseMessage> PreflightAsync(HttpClient client, string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/orders");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");
        return await client.SendAsync(request);
    }

    // AC-57:允許清單內的來源,預檢不得為 401,且必須帶對應的 Access-Control-Allow-Origin
    [Fact]
    public async Task Preflight_AllowedOrigin_IsNotUnauthorized_AndCarriesCorsHeader()
    {
        using var factory = CreateFactory(authPermitLimit: 1000);
        var response = await PreflightAsync(factory.CreateClient(), AllowedOrigin);

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.True((int)response.StatusCode is >= 200 and < 300,
            $"CORS 預檢必須是 2xx(預設 204),實得 {(int)response.StatusCode}");
        Assert.True(response.Headers.Contains("Access-Control-Allow-Origin"),
            "預檢回應必須帶 Access-Control-Allow-Origin,否則瀏覽器不會送出正式請求");
        Assert.Equal(AllowedOrigin, response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    // AC-58:不在允許清單的來源,不得帶 Access-Control-Allow-Origin
    //(反向釘住:不許有人為了讓預檢通過而改成 AllowAnyOrigin)
    [Fact]
    public async Task Preflight_DisallowedOrigin_HasNoCorsHeader()
    {
        using var factory = CreateFactory(authPermitLimit: 1000);
        var response = await PreflightAsync(factory.CreateClient(), "http://evil.example.com");

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"),
            "未列入允許清單的來源不得取得 Access-Control-Allow-Origin");
    }
}
