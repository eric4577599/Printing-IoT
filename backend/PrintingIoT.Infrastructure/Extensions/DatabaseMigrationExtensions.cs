using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace PrintingIoT.Infrastructure.Extensions;

/// <summary>
/// DatabaseMigrationExtensions — 共用資料庫遷移重試邏輯
/// 
/// 抽取自各服務 Program.cs 中完全相同的 migration retry 程式碼 (Phase 3.7)
/// </summary>
public static class DatabaseMigrationExtensions
{
    /// <summary>
    /// Apply EF Core migrations with retry policy.
    /// Handles database startup delays in Docker environments.
    /// </summary>
    public static async Task MigrateWithRetryAsync<TContext>(
        this IServiceProvider serviceProvider,
        int maxRetries = 10,
        int delaySeconds = 2) where TContext : DbContext
    {
        var logger = serviceProvider.GetRequiredService<ILogger<TContext>>();
        var context = serviceProvider.GetRequiredService<TContext>();
        var contextName = typeof(TContext).Name;

        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                logger.LogInformation(
                    "Attempting to apply migrations for {Context} (Attempt {Attempt}/{MaxRetries})...",
                    contextName, i + 1, maxRetries);

                await context.Database.MigrateAsync();

                logger.LogInformation("{Context} migrated successfully.", contextName);
                return;
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    "{Context} connection failed: {Message}. Retrying in {Delay}s...",
                    contextName, ex.Message, delaySeconds);

                if (i == maxRetries - 1)
                    throw;

                await Task.Delay(delaySeconds * 1000);
            }
        }
    }
}
