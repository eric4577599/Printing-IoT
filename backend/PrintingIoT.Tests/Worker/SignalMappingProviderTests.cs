using System.Text.Json;
using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.Worker.Services;
using StackExchange.Redis;
using Xunit;

namespace PrintingIoT.Tests.Worker;

/// <summary>
/// S2:訊號名稱正規化(AC-04)與設定供應者(AC-08、AC-09、AC-11)。
/// </summary>
public class SignalMappingProviderTests
{
    private readonly Mock<ILogger<SignalMappingProvider>> _loggerMock = new();
    private readonly Mock<IConnectionMultiplexer> _redisMock = new();
    private readonly Mock<IDatabase> _dbMock = new();

    public SignalMappingProviderTests()
    {
        _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_dbMock.Object);
    }

    /// <summary>把設定值序列化成 config/communication 的 JSON。</summary>
    private static string ConfigJson(string? count = null, string? motor = null, object? dataLogInterval = null)
    {
        var dict = new Dictionary<string, object?>();
        if (count != null) dict["plc_count_signal"] = count;
        if (motor != null) dict["plc_motor_signal"] = motor;
        if (dataLogInterval != null) dict["data_log_interval"] = dataLogInterval;
        return JsonSerializer.Serialize(dict);
    }

    // AC-04:DI-1、di1、DI1、DI_1、" DI 1 " 都正規化成同一個鍵
    [Theory]
    [InlineData("DI-1", "di1")]
    [InlineData("di1", "di1")]
    [InlineData("DI1", "di1")]
    [InlineData("DI_1", "di1")]
    [InlineData(" DI 1 ", "di1")]
    [InlineData("AI-0", "ai0")]
    [InlineData(null, "")]
    [InlineData("   ", "")]
    public void SignalNameNormalizer_ShouldNormalizeVariants(string? input, string expected)
    {
        Assert.Equal(expected, SignalNameNormalizer.Normalize(input));
    }

    // AC-08:設定變更可在不重啟下生效
    [Fact]
    public async Task SignalMappingProvider_ShouldPickUpConfigChange_AfterInterval()
    {
        _dbMock.SetupSequence(d => d.StringGetAsync("config/communication", It.IsAny<CommandFlags>()))
               .ReturnsAsync(ConfigJson(count: "DI-1"))
               .ReturnsAsync(ConfigJson(count: "DI-5"));

        var provider = new SignalMappingProvider(_loggerMock.Object, _redisMock.Object, TimeSpan.Zero);

        var first = await provider.GetMappingAsync();
        Assert.Equal("di1", first.CountField);

        var second = await provider.GetMappingAsync();
        Assert.Equal("di5", second.CountField);
    }

    // AC-09:快取有效期內不重讀 Redis
    [Fact]
    public async Task SignalMappingProvider_ShouldCacheWithinInterval()
    {
        _dbMock.Setup(d => d.StringGetAsync("config/communication", It.IsAny<CommandFlags>()))
               .ReturnsAsync(ConfigJson(count: "DI-1", motor: "DI-0"));

        var provider = new SignalMappingProvider(_loggerMock.Object, _redisMock.Object);

        await provider.GetMappingAsync();
        await provider.GetMappingAsync();

        _dbMock.Verify(d => d.StringGetAsync("config/communication", It.IsAny<CommandFlags>()), Times.Once);
    }

    // AC-11:Redis 讀取失敗時回傳預設值而不拋例外
    [Fact]
    public async Task SignalMappingProvider_ShouldFallBack_WhenRedisThrows()
    {
        _dbMock.Setup(d => d.StringGetAsync("config/communication", It.IsAny<CommandFlags>()))
               .ThrowsAsync(new RedisConnectionException(ConnectionFailureType.UnableToConnect, "boom"));

        var provider = new SignalMappingProvider(_loggerMock.Object, _redisMock.Object, TimeSpan.Zero);

        var mapping = await provider.GetMappingAsync();

        Assert.Equal("di1", mapping.CountField);
        Assert.Equal("di0", mapping.MotorField);
        Assert.Equal(300, await provider.GetDataLogIntervalSecondsAsync());
    }

    // 設定壞掉或缺鍵一律退回預設對映
    [Fact]
    public async Task SignalMappingProvider_ShouldUseDefaults_WhenKeyMissingOrBlank()
    {
        _dbMock.SetupSequence(d => d.StringGetAsync("config/communication", It.IsAny<CommandFlags>()))
               .ReturnsAsync(RedisValue.Null)
               .ReturnsAsync(ConfigJson(count: "  ", motor: ""))
               .ReturnsAsync("{ not json");

        var provider = new SignalMappingProvider(_loggerMock.Object, _redisMock.Object, TimeSpan.Zero);

        for (var i = 0; i < 3; i++)
        {
            var mapping = await provider.GetMappingAsync();
            Assert.Equal("di1", mapping.CountField);
            Assert.Equal("di0", mapping.MotorField);
        }
    }

    // data_log_interval 的邊界:非數字、<= 0、> 3600 一律回到預設 300
    [Theory]
    [InlineData(600, 600)]
    [InlineData(0, 300)]
    [InlineData(-5, 300)]
    [InlineData(3601, 300)]
    public async Task SignalMappingProvider_ShouldClampDataLogInterval(int configured, int expected)
    {
        _dbMock.Setup(d => d.StringGetAsync("config/communication", It.IsAny<CommandFlags>()))
               .ReturnsAsync(ConfigJson(dataLogInterval: configured));

        var provider = new SignalMappingProvider(_loggerMock.Object, _redisMock.Object, TimeSpan.Zero);

        Assert.Equal(expected, await provider.GetDataLogIntervalSecondsAsync());
    }
}
