using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using PrintingIoT.Infrastructure.Data;
using StackExchange.Redis;

namespace PrintingIoT.Tests.Integration;

/// <summary>
/// S5 授權相關整合測試共用的 WebApplicationFactory 建構器。
///
/// 三件事:① 以 InMemory 資料庫取代 PostgreSQL;② 以 Moq 取代 Redis 連線
/// (否則 DI 解析 IConnectionMultiplexer 時會真的去連 localhost:6379);
/// ③ 允許測試以字典覆寫設定鍵(SetupToken、限流上限等)。
/// </summary>
public static class AuthTestFactory
{
    /// <summary>
    /// 建立測試用的 WebApplicationFactory。
    /// 輸入:InMemory 資料庫名稱、要覆寫的設定鍵(可為 null);
    /// 輸出:已設定完成的 factory(呼叫端負責 Dispose);
    /// 邏輯:環境設為 Testing(讀 appsettings.Testing.json 的測試密鑰),
    ///       抽換 DbContext 與 IConnectionMultiplexer 兩個外部相依。
    /// </summary>
    public static WebApplicationFactory<Program> Create(
        string dbName,
        IDictionary<string, string?>? settings = null)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("environment", "Testing");

            if (settings != null)
            {
                builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(settings));
            }

            builder.ConfigureServices(services =>
            {
                var descriptors = services.Where(
                    d => d.ServiceType == typeof(DbContextOptions<PrintingContext>) ||
                         d.ServiceType == typeof(DbContextOptions) ||
                         d.ServiceType == typeof(PrintingContext) ||
                         d.ServiceType == typeof(IConnectionMultiplexer)).ToList();

                foreach (var d in descriptors) services.Remove(d);

                services.AddDbContext<PrintingContext>(options => options.UseInMemoryDatabase(dbName));

                // Redis 假替身:Moq 對 Task 回傳型別會自動給已完成的預設值,
                // 因此 StringGetAsync 回 RedisValue.Null、StringSetAsync 回 false,足夠讓端點走完流程。
                var db = new Mock<IDatabase>();
                var redis = new Mock<IConnectionMultiplexer>();
                redis.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(db.Object);
                services.AddSingleton(redis.Object);
            });
        });
    }
}
