using Microsoft.AspNetCore.Authorization;
using PrintingIoT.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using MQTTnet;
using MQTTnet.Client;
using System.Text.Json;

namespace PrintingIoT.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SimulationController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public SimulationController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [Authorize(Policy = AppRoles.Policies.SystemConfig)]
    [HttpPost("test-mqtt")]
    public async Task<IActionResult> TestMqttConnection([FromBody] JsonElement? body = null)
    {
        // 修正 #10:改讀前端傳入的 host/port(WISE/Modbus 各自設定),未提供時回退組態預設值。
        // 回傳格式對齊前端(status / latency_ms / message),原本回 { connected } 與前端 res.status 不符。
        var broker = _configuration["Mqtt:BrokerAddress"] ?? "localhost";
        var port = int.Parse(_configuration["Mqtt:Port"] ?? "1883");

        if (body is JsonElement el && el.ValueKind == JsonValueKind.Object)
        {
            if (el.TryGetProperty("host", out var h) && h.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(h.GetString()))
                broker = h.GetString()!;
            if (el.TryGetProperty("port", out var p))
            {
                if (p.ValueKind == JsonValueKind.Number && p.TryGetInt32(out var pn)) port = pn;
                else if (p.ValueKind == JsonValueKind.String && int.TryParse(p.GetString(), out var ps)) port = ps;
            }
        }

        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var factory = new MqttFactory();
            using var mqttClient = factory.CreateMqttClient();
            var options = new MqttClientOptionsBuilder()
                .WithTcpServer(broker, port)
                .WithClientId("ApiTester_" + Guid.NewGuid())
                .WithTimeout(TimeSpan.FromSeconds(5))
                .Build();

            await mqttClient.ConnectAsync(options);
            bool connected = mqttClient.IsConnected;
            await mqttClient.DisconnectAsync();
            sw.Stop();

            return connected
                ? Ok(new { status = "ok", latency_ms = sw.ElapsedMilliseconds, message = $"Connected to {broker}:{port}" })
                : Ok(new { status = "error", latency_ms = sw.ElapsedMilliseconds, message = $"Not connected to {broker}:{port}" });
        }
        catch (Exception ex)
        {
            sw.Stop();
            return Ok(new { status = "error", latency_ms = sw.ElapsedMilliseconds, message = ex.Message });
        }
    }

    [Authorize(Policy = AppRoles.Policies.SystemConfig)]
    [HttpPost("speed")]
    public IActionResult UpdateSimulationSpeed([FromBody] JsonElement payload)
    {
        // Ideally, this would publish a command to the Worker or PLC
        // to adjust the machine speed.
        // For now, we just log it as a success demo.
        if (payload.TryGetProperty("speedFactor", out var speedFactor))
        {
             // Logic to adjust simulation speed
             // e.g., Publish MQTT command "factory/control/speed"
        }
        return Ok(new { success = true });
    }
}
