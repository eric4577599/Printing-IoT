using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Infrastructure.Services;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Redis
builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(sp =>
    StackExchange.Redis.ConnectionMultiplexer.Connect(builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379"));

// Register Services
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IMaintenanceService, MaintenanceService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();

if (!builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddDbContext<PrintingIoT.Infrastructure.Data.PrintingContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
}

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Auto-create DB for MVP with Async Retry Policy
if (!app.Environment.IsEnvironment("Testing"))
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<Program>>();
        var context = services.GetRequiredService<PrintingContext>();
        
        int maxRetries = 10;
        int delaySeconds = 2;
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                logger.LogInformation($"Attempting to connect to database (Attempt {i+1}/{maxRetries})...");
                logger.LogInformation($"Attempting to apply migrations (Attempt {i+1}/{maxRetries})...");
                await context.Database.MigrateAsync();
                logger.LogInformation("Database migrated successfully.");
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning($"Database connection failed: {ex.Message}. Retrying in {delaySeconds}s...");
                if (i == maxRetries - 1) throw;
                await Task.Delay(delaySeconds * 1000);
            }
        }
    }
}

app.UseCors("AllowFrontend");

app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }
