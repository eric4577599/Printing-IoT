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
builder.Services.AddRateLimiter(options =>
{
    // 分區鍵沿用 RemoteIpAddress:UseForwardedHeaders 會在管線更前面改寫該值,
    // 因此不需改動此 lambda,順序修好即依「轉發後的真實來源」分區。
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));

    // S5:登入 / 初始化端點的專屬限流,阻擋暴力嘗試
    var authPermitLimit = builder.Configuration.GetValue<int?>("RateLimit:Auth:PermitLimit") ?? 10;
    var authWindowMinutes = builder.Configuration.GetValue<double?>("RateLimit:Auth:WindowMinutes") ?? 1;
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = authPermitLimit,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(authWindowMinutes)
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
