using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Infrastructure.Data;

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

// Auto-create DB for MVP with Retry Policy
if (!app.Environment.IsEnvironment("Testing"))
{
    using (var scope = app.Services.CreateScope())
    {
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var context = services.GetRequiredService<PrintingIoT.Infrastructure.Data.PrintingContext>();
    
    // Simple Retry Logic
    int maxRetries = 10;
    int delaySeconds = 2;
    for (int i = 0; i < maxRetries; i++)
    {
        try
        {
            logger.LogInformation($"Attempting to connect to database (Attempt {i+1}/{maxRetries})...");
            if (context.Database.EnsureCreated())
            {
                logger.LogInformation("Database created successfully.");
            }
            else 
            {
                logger.LogInformation("Database already exists.");
            }
            break; // Success
        }
        catch (Exception ex)
        {
            logger.LogWarning($"Database connection failed: {ex.Message}. Retrying in {delaySeconds}s...");
            if (i == maxRetries - 1) throw;
            Thread.Sleep(delaySeconds * 1000);
        }
    }
    }
}

app.UseCors("AllowFrontend");

app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }
