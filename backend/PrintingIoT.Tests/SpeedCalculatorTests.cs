using Xunit;
using Moq;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using PrintingIoT.Worker.Services;
using System.Text.Json;

namespace PrintingIoT.Tests;

public class SpeedCalculatorTests
{
    private readonly Mock<ILogger<SpeedCalculator>> _loggerMock = new();
    private readonly Mock<IConnectionMultiplexer> _redisMock = new();
    private readonly Mock<IDatabase> _dbMock = new();

    public SpeedCalculatorTests()
    {
        _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_dbMock.Object);
        // Default mock for config
        _dbMock.Setup(d => d.StringGetAsync("config/communication", It.IsAny<CommandFlags>()))
               .ReturnsAsync(JsonSerializer.Serialize(new { max_speed = 350.0 }));
    }

    [Fact]
    public async Task CalculateSpeed_ShouldReturnCorrectSpeed_WithEMA()
    {
        // Arrange
        var calculator = new SpeedCalculator(_loggerMock.Object, _redisMock.Object);
        string deviceId = "test-device";
        var now = DateTime.UtcNow;

        // Act & Assert
        // First reading (initialization)
        var speed1 = await calculator.CalculateSpeedAsync(deviceId, 100, now, true);
        Assert.Equal(0, speed1);

        // Second reading (1 minute later, 100 units increase)
        // Instant speed = 100 / 1 = 100
        // EMA: 0 * 0.9 + 100 * 0.1 = 10
        var speed2 = await calculator.CalculateSpeedAsync(deviceId, 200, now.AddMinutes(1), true);
        Assert.Equal(10, (double)speed2, 1);

        // Third reading (1 minute later, 100 units increase)
        // Instant speed = 100 / 1 = 100
        // EMA: 10 * 0.9 + 100 * 0.1 = 19
        var speed3 = await calculator.CalculateSpeedAsync(deviceId, 300, now.AddMinutes(2), true);
        Assert.Equal(19, (double)speed3, 1);
    }

    [Fact]
    public async Task CalculateSpeed_ShouldHandleReset()
    {
        // Arrange
        var calculator = new SpeedCalculator(_loggerMock.Object, _redisMock.Object);
        string deviceId = "test-device";
        var now = DateTime.UtcNow;

        // Act
        await calculator.CalculateSpeedAsync(deviceId, 1000, now, true);
        var speedBeforeReset = await calculator.CalculateSpeedAsync(deviceId, 1100, now.AddMinutes(1), true);
        Assert.True(speedBeforeReset > 0);

        // Reset (current < last)
        var speedAfterReset = await calculator.CalculateSpeedAsync(deviceId, 100, now.AddMinutes(2), true);

        // Assert
        Assert.Equal(0, speedAfterReset);
    }

    /// <summary>
    /// AC-10:hasQty == false 的呼叫不得改動速度基準。
    /// 邏輯:同一組取樣分別在「中間插入一次 hasQty = false」與「完全不插入」兩台計算器上重跑,
    ///       最後一次的回傳值必須完全相同(COMM-09 縱深防禦)。
    /// </summary>
    [Fact]
    public async Task CalculateSpeed_ShouldIgnoreSample_WhenHasQtyFalse()
    {
        // Arrange
        var withNoise = new SpeedCalculator(_loggerMock.Object, _redisMock.Object);
        var baseline = new SpeedCalculator(_loggerMock.Object, _redisMock.Object);
        var t0 = DateTime.UtcNow;
        var t1 = t0.AddMinutes(1);

        // Act:中間插入一次沒有計數的取樣
        await withNoise.CalculateSpeedAsync("dev", 100, t0, true);
        var noiseResult = await withNoise.CalculateSpeedAsync("dev", 0, t0.AddSeconds(30), false);
        var speedWithNoise = await withNoise.CalculateSpeedAsync("dev", 200, t1, true);

        // Act:同一組取樣但沒有中間那次呼叫
        await baseline.CalculateSpeedAsync("dev", 100, t0, true);
        var speedBaseline = await baseline.CalculateSpeedAsync("dev", 200, t1, true);

        // Assert
        Assert.Equal(0, noiseResult);
        Assert.Equal(speedBaseline, speedWithNoise);
        Assert.True(speedWithNoise > 0);
    }
}
