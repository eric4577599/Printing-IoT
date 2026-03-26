using Microsoft.EntityFrameworkCore;
using SmartParts.API.Data;
using SmartParts.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Database
builder.Services.AddDbContext<SmartPartsDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register Services
builder.Services.AddScoped<IPartService, PartService>();

// CORS
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

// OpenAPI/Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Auto-create DB with Async Retry Policy
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var context = services.GetRequiredService<SmartPartsDbContext>();
    
    int maxRetries = 10;
    int delaySeconds = 2;
    for (int i = 0; i < maxRetries; i++)
    {
        try
        {
            logger.LogInformation($"Attempting to apply migrations to SmartPartsDB (Attempt {i+1}/{maxRetries})...");
            await context.Database.MigrateAsync();
            logger.LogInformation("SmartPartsDB migrated successfully.");
            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning($"SmartPartsDB connection failed: {ex.Message}. Retrying in {delaySeconds}s...");
            if (i == maxRetries - 1) throw;
            await Task.Delay(delaySeconds * 1000);
        }
    }
}

app.UseCors("AllowFrontend");
app.MapControllers();

app.Run();
