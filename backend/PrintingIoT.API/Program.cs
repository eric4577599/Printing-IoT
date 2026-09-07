using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Core.Constants;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Infrastructure.Services;
using PrintingIoT.Infrastructure.Extensions;
using PrintingIoT.API.Middleware;
using PrintingIoT.API.Authentication;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// S5:反向代理標頭。Cloudflare Tunnel 與 Docker bridge 的來源位址不固定,無法白名單,
// 因此清空 KnownNetworks / KnownProxies。
// 代價:清空後任何人送來的 X-Forwarded-For 都會被採信,此設定「只在 API 僅能經由通道對外」時成立;
// 若日後 API 直接對公網開放,必須改回 KnownProxies 白名單。
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = builder.Configuration.GetValue<int?>("ForwardedHeaders:ForwardLimit") ?? 1;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Phase 4.1: CORS Hardening
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Often needed with strict origins
        });
});

// Phase 4.4: JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrEmpty(jwtSecret))
    throw new InvalidOperationException("JWT Secret missing. Set env var Jwt__Secret (or Jwt:Secret in appsettings.{Environment}.json).");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero // 過期即過期,不留 5 分鐘寬限,避免 AC-03 因寬限而誤放行
        };
    })
    // S7:機器對機器憑證。ERP 是程式呼叫、沒有互動式登入,無法走 JWT 的帳密流程,
    // 因此另掛一個只認 X-Api-Key 標頭的方案。它**不是**預設方案 ——
    // 金鑰只在明確指定此方案的端點(目前僅 ERP 推單)有效,其餘端點的 fallback policy
    // 仍只認 Bearer,一支外洩的金鑰因此打不開整個系統。
    .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(
        ApiKeyAuthenticationDefaults.Scheme, _ => { });

// S5:預設拒絕 —— fallback policy 讓未明確標註的端點一律要求已驗證身分,
// 新增的 Controller 若忘記標註會被擋下,而不是默默對外開放。
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy(AppRoles.Policies.UserAdmin, p => p.RequireRole(AppRoles.Admin));
    options.AddPolicy(AppRoles.Policies.SystemConfig, p => p.RequireRole(AppRoles.Admin, AppRoles.Engineer));
    options.AddPolicy(AppRoles.Policies.MasterDataWrite,
        p => p.RequireRole(AppRoles.Admin, AppRoles.Supervisor, AppRoles.Engineer));

    // S7:ERP 推單 —— 唯一同時接受 API 金鑰與 JWT 的 policy。
    // 方案清單寫在 policy 而非 [Authorize] 屬性上,讓「哪些端點吃金鑰」只有這一個決定點。
    options.AddPolicy(AppRoles.Policies.ErpPush, p => p
        .AddAuthenticationSchemes(ApiKeyAuthenticationDefaults.Scheme, JwtBearerDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser()
        .RequireRole(AppRoles.ErpService, AppRoles.Admin));
});

// Phase 4.5: Rate Limiting
//
// ── 額度依「現場設備數」推導,不是拍一個固定值 ────────────────────────────
//
// 為什麼要改:分區鍵是 RemoteIpAddress,原本的固定 100/分是照「每個來源 IP 一個桶」
// 設計的。但實測(2026-09-07)顯示 Docker Desktop 的埠轉發會把 localhost、
// LAN 終端(192.168.x.x)與 Tunnel 進來的流量**全部 NAT 成同一個位址**,
// 所以實際上是**所有客戶端共用一個桶**。而一台看板每秒輪詢一次
// (frontend/src/hooks/useRealtimeData.js)就吃掉 60/分 —— 兩台就超過 100。
//
// 因此額度改由 RateLimit:MaxDevices(現場會連線的設備數)乘上每台預算推導,
// 現場加機台時只要改一個數字,而且「每台多少」這個意圖在設定檔裡看得懂。
//
// **誠實標註**:這個參數表達的是「整廠預算 = 台數 × 每台預算」,
// **不是**真的每台一個桶 —— 在 NAT 之後我們分不出裝置,單一台跑掉仍可能吃光全部配額。
// 要真正做到每台一桶,需要不可偽造的客戶端識別,那是另一件事(見 O-12)。
// 推導只有這一份實作,限流設定與啟動記錄都呼叫它 —— 兩處各算一次就會漂移。
// 輸入:設定來源。輸出:實際生效的額度與視窗,以及推導所用的參數(供記錄使用)。
static RateLimitBudget ResolveRateLimitBudget(IConfiguration cfg)
{
    // 設備數與每台預算都夾到 1 以上:0 或負數會讓額度變成 0,
    // 那等於第一次請求就 429,現場直接停擺 —— 一個打錯的設定值不該有這種威力。
    var maxDevices = Math.Max(1, cfg.GetValue<int?>("RateLimit:MaxDevices") ?? 5);
    var perDevice = Math.Max(1, cfg.GetValue<int?>("RateLimit:PerDevice:PermitLimit") ?? 120);
    var authPerDevice = Math.Max(1, cfg.GetValue<int?>("RateLimit:Auth:PerDevicePermitLimit") ?? 5);

    return new RateLimitBudget(
        MaxDevices: maxDevices,
        PerDevice: perDevice,
        AuthPerDevice: authPerDevice,
        // 絕對覆寫優先於推導值:測試要用極小的絕對上限才驗得動,正式環境走推導。
        Global: cfg.GetValue<int?>("RateLimit:Global:PermitLimit") ?? maxDevices * perDevice,
        Auth: cfg.GetValue<int?>("RateLimit:Auth:PermitLimit") ?? maxDevices * authPerDevice,
        WindowMinutes: cfg.GetValue<double?>("RateLimit:PerDevice:WindowMinutes") ?? 1,
        AuthWindowMinutes: cfg.GetValue<double?>("RateLimit:Auth:WindowMinutes") ?? 1);
}

builder.Services.AddRateLimiter(options =>
{
    // **設定必須在這個 lambda 裡讀**,不可以搬到外面提前讀:
    // 這個 lambda 在 DI 建構時才執行,那時所有設定來源都已就緒;
    // 而外層的 top-level 程式碼執行得更早,WebApplicationFactory 用
    // ConfigureAppConfiguration 疊上去的測試設定那時還沒加進來,會讀到舊值。
    var budget = ResolveRateLimitBudget(builder.Configuration);

    // 分區鍵沿用 RemoteIpAddress:UseForwardedHeaders 會在管線更前面改寫該值,
    // 因此不需改動此 lambda,順序修好即依「轉發後的真實來源」分區。
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = budget.Global,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(budget.WindowMinutes)
            }));

    // S5:登入 / 初始化端點的專屬限流,阻擋暴力嘗試
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = budget.Auth,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(budget.AuthWindowMinutes)
            }));

    options.RejectionStatusCode = 429;
});

// Redis
builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(sp =>
    StackExchange.Redis.ConnectionMultiplexer.Connect(builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379"));

// Register Services
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
// S3:完工實績、原因主檔與工廠時區(工廠時區為無狀態設定,註冊為 Singleton)
builder.Services.AddScoped<IProductionService, ProductionService>();
builder.Services.AddScoped<IReasonService, ReasonService>();
builder.Services.AddSingleton<IFactoryTimeProvider, FactoryTimeProvider>();

if (!builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddDbContext<PrintingIoT.Infrastructure.Data.PrintingContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
}

var app = builder.Build();

// Phase 3.7: Shared Migration Retry(啟動期動作,非中介軟體,故置於管線設定之前)
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.MigrateWithRetryAsync<PrintingContext>();
}

// 限流額度是推導出來的,不印出來就沒人知道現在實際生效的是多少。
// 現場抱怨 429 時,這一行是第一個要看的東西。
var rateLimitBudget = ResolveRateLimitBudget(app.Configuration);
app.Logger.LogInformation(
    "限流額度:設備數 {MaxDevices} × 每台 {PerDevice} = 全域 {Global}/{Window} 分;" +
    "登入每台 {AuthPerDevice} = {Auth}/{AuthWindow} 分。" +
    "註:NAT 之後所有來源共用同一個桶,這是整廠預算而非每台一桶。",
    rateLimitBudget.MaxDevices, rateLimitBudget.PerDevice, rateLimitBudget.Global,
    rateLimitBudget.WindowMinutes, rateLimitBudget.AuthPerDevice,
    rateLimitBudget.Auth, rateLimitBudget.AuthWindowMinutes);

// ── HTTP 管線(順序不可調換,見 spec20260905-s5-v1 §3.1)──────────────────

// 1. 轉發標頭:必須在任何讀取 RemoteIpAddress 的中介軟體(限流)之前
if (builder.Configuration.GetValue<bool?>("ForwardedHeaders:Enabled") ?? true)
{
    app.UseForwardedHeaders();
}

// 2. 全域例外處理
app.UseGlobalExceptionHandler();

// 3. Swagger(僅開發 / 測試環境)
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 4. CORS 必須在限流之前,否則 429 回應不帶 CORS 標頭,瀏覽器只會看到不明錯誤
app.UseCors("AllowFrontend");

// 5. 限流
app.UseRateLimiter();

// 6~7. 驗證與授權
app.UseAuthentication();
app.UseAuthorization();

// 8. 路由至控制器
app.MapControllers();

app.Run();

public partial class Program { }

/// <summary>
/// 限流額度的推導結果。Global / Auth 是實際生效的上限,
/// MaxDevices / PerDevice / AuthPerDevice 保留下來只為了讓啟動記錄說得出「這個數字怎麼來的」。
/// </summary>
internal record RateLimitBudget(
    int MaxDevices, int PerDevice, int AuthPerDevice,
    int Global, int Auth,
    double WindowMinutes, double AuthWindowMinutes);
