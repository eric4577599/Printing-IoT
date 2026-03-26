using PrintingIoT.Worker;

using Microsoft.EntityFrameworkCore;
using PrintingIoT.Infrastructure.Data;
using PrintingIoT.Worker.Services;
using StackExchange.Redis;

var builder = Host.CreateApplicationBuilder(args);

// Register DB Context
builder.Services.AddDbContext<PrintingContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register Redis
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
    ConnectionMultiplexer.Connect(builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379"));

// Register Worker Services
builder.Services.AddSingleton<IDeviceLockManager, DeviceLockManager>();
builder.Services.AddSingleton<ISpeedCalculator, SpeedCalculator>();

builder.Services.AddHostedService<MqttWorker>();

var host = builder.Build();
host.Run();
