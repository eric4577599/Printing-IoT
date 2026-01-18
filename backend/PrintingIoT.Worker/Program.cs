using PrintingIoT.Worker;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<MqttWorker>();

var host = builder.Build();
host.Run();
