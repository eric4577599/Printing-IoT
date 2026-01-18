using Microsoft.AspNetCore.Mvc;
using MQTTnet;
using MQTTnet.Client;
using System.Text.Json;

namespace PrintingIoT.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SimulationController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public SimulationController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpPost("test-mqtt")]
    public async Task<IActionResult> TestMqttConnection()
    {
        // Simple connectivity check
        var broker = _configuration["Mqtt:BrokerAddress"] ?? "localhost";
        var port = int.Parse(_configuration["Mqtt:Port"] ?? "1883");

        try
        {
            var factory = new MqttFactory();
            using var mqttClient = factory.CreateMqttClient();
            var options = new MqttClientOptionsBuilder()
                .WithTcpServer(broker, port)
                .WithClientId("ApiTester_" + Guid.NewGuid())
                .Build();

            await mqttClient.ConnectAsync(options);
            bool connected = mqttClient.IsConnected;
            await mqttClient.DisconnectAsync();

            return Ok(new { connected = connected });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { connected = false, error = ex.Message });
        }
    }

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
