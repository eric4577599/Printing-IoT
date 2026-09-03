using Microsoft.Extensions.Logging;
using Moq;
using PrintingIoT.Core.Entities;
using PrintingIoT.Worker.Services;
using Xunit;

namespace PrintingIoT.Tests.Worker;

/// <summary>
/// S2:真機與模擬器 payload 解析器(AC-03、AC-04、AC-05、AC-06、AC-07、AC-13)。
/// </summary>
public class PayloadParserTests
{
    private readonly Mock<ILogger<WisePayloadParser>> _loggerMock = new();

    /// <summary>建立指定訊號對映的解析器。輸入:計數與運轉訊號設定值。輸出:WisePayloadParser。</summary>
    private WisePayloadParser CreateParser(string countSignal = "DI-1", string motorSignal = "DI-0")
    {
        var mappingMock = new Mock<ISignalMappingProvider>();
        mappingMock.Setup(m => m.GetMappingAsync()).ReturnsAsync(new SignalMapping(
            SignalNameNormalizer.Normalize(countSignal),
            SignalNameNormalizer.Normalize(motorSignal)));
        return new WisePayloadParser(_loggerMock.Object, mappingMock.Object);
    }

    // AC-03:改設定成 DI-5 後只採用 di5,payload 裡的 di1 不得被採用
    [Fact]
    public async Task WiseParser_ShouldReadConfiguredCountField()
    {
        var parser = CreateParser(countSignal: "DI-5");

        var sample = await parser.ParseAsync("Advantech/74FE48123456/data",
            """{ "di0": 1, "di1": 999, "di5": 12345 }""");

        Assert.NotNull(sample);
        Assert.Equal(12345, sample!.Count);
        Assert.Equal("74FE48123456", sample.DeviceId);
        Assert.Equal(TelemetrySource.Wise, sample.Source);
        Assert.Null(sample.ProvidedSpeed);
    }

    // AC-04:設定的三種寫法都對映到同一個 payload 欄位
    [Theory]
    [InlineData("DI-1")]
    [InlineData("di1")]
    [InlineData("DI1")]
    [InlineData("DI_1")]
    public async Task WiseParser_ShouldMatchFieldRegardlessOfCase(string configured)
    {
        var parser = CreateParser(countSignal: configured);

        var sample = await parser.ParseAsync("Advantech/dev/data", """{ "DI-1": 555 }""");

        Assert.NotNull(sample);
        Assert.Equal(555, sample!.Count);
    }

    // AC-05:運轉訊號為 0 / false / "off" 時狀態必須是 Idle
    [Theory]
    [InlineData("0")]
    [InlineData("false")]
    [InlineData("\"off\"")]
    [InlineData("\"0\"")]
    [InlineData("\"FALSE\"")]
    public async Task WiseParser_ShouldReportIdle_WhenMotorSignalOff(string motorLiteral)
    {
        var parser = CreateParser();

        var sample = await parser.ParseAsync("Advantech/dev/data", $$"""{ "di0": {{motorLiteral}}, "di1": 10 }""");

        Assert.NotNull(sample);
        Assert.Equal(MachineStatus.Idle, sample!.Status);
        Assert.NotEqual(MachineStatus.Running, sample.Status);
    }

    // 運轉訊號為 1 / true / "on" 時狀態為 Running
    [Theory]
    [InlineData("1")]
    [InlineData("true")]
    [InlineData("\"on\"")]
    [InlineData("\"1\"")]
    public async Task WiseParser_ShouldReportRunning_WhenMotorSignalOn(string motorLiteral)
    {
        var parser = CreateParser();

        var sample = await parser.ParseAsync("Advantech/dev/data", $$"""{ "di0": {{motorLiteral}}, "di1": 10 }""");

        Assert.NotNull(sample);
        Assert.Equal(MachineStatus.Running, sample!.Status);
    }

    // AC-06:缺運轉訊號、值為 null 或無法判讀時一律 Unknown,不得回 Running
    [Theory]
    [InlineData("""{ "di1": 10 }""")]
    [InlineData("""{ "di0": null, "di1": 10 }""")]
    [InlineData("""{ "di0": "wat", "di1": 10 }""")]
    [InlineData("""{ "di0": [1], "di1": 10 }""")]
    public async Task WiseParser_ShouldReportUnknown_WhenMotorSignalMissing(string payload)
    {
        var parser = CreateParser();

        var sample = await parser.ParseAsync("Advantech/dev/data", payload);

        Assert.NotNull(sample);
        Assert.Equal(MachineStatus.Unknown, sample!.Status);
        Assert.Equal("Unknown", sample.Status.ToString());
    }

    // AC-07:缺計數欄位、型別無法轉數值、JSON 壞掉、非物件 → 整包回傳 null
    [Theory]
    [InlineData("""{ "di0": 1 }""")]
    [InlineData("""{ "di0": 1, "di1": true }""")]
    [InlineData("""{ "di0": 1, "di1": null }""")]
    [InlineData("""{ "di0": 1, "di1": "abc" }""")]
    [InlineData("""[1, 2, 3]""")]
    [InlineData("""not json at all""")]
    public async Task WiseParser_ShouldReturnNull_WhenCountFieldMissing(string payload)
    {
        var parser = CreateParser();

        var sample = await parser.ParseAsync("Advantech/dev/data", payload);

        Assert.Null(sample);
    }

    // 邊界:字串數值可接受、小數截斷、負數照收
    [Theory]
    [InlineData("\"12345\"", 12345L)]
    [InlineData("123.7", 123L)]
    [InlineData("-5", -5L)]
    public async Task WiseParser_ShouldNormalizeCountValue(string countLiteral, long expected)
    {
        var parser = CreateParser();

        var sample = await parser.ParseAsync("Advantech/dev/data", $$"""{ "di0": 1, "di1": {{countLiteral}} }""");

        Assert.NotNull(sample);
        Assert.Equal(expected, sample!.Count);
    }

    // topic 沒有第 2 段時退回 "WISE"(維持現況)
    [Fact]
    public async Task WiseParser_ShouldFallBackDeviceId_WhenTopicHasNoSegment()
    {
        var parser = CreateParser();

        var sample = await parser.ParseAsync("Advantech", """{ "di1": 1 }""");

        Assert.NotNull(sample);
        Assert.Equal("WISE", sample!.DeviceId);
    }

    // 計數與運轉設成同一欄位時允許共用
    [Fact]
    public async Task WiseParser_ShouldAllowSameFieldForCountAndMotor()
    {
        var parser = CreateParser(countSignal: "DI-1", motorSignal: "DI-1");

        var sample = await parser.ParseAsync("Advantech/dev/data", """{ "di1": 7 }""");

        Assert.NotNull(sample);
        Assert.Equal(7, sample!.Count);
        Assert.Equal(MachineStatus.Running, sample.Status);
    }

    // AC-13:模擬器 payload 缺 deviceId 時使用 "SIMULATOR",不再出現 "unknown"
    [Fact]
    public void SimulatorParser_ShouldUseSimulatorId_WhenDeviceIdMissing()
    {
        var sample = SimulatorPayloadParser.Parse("""{ "speed": 12.5, "length": 300, "status": 1 }""");

        Assert.NotNull(sample);
        Assert.Equal("SIMULATOR", sample!.DeviceId);
        Assert.NotEqual("unknown", sample.DeviceId);
        Assert.Equal(TelemetrySource.Simulator, sample.Source);
        Assert.Equal(12.5m, sample.ProvidedSpeed);
        Assert.Equal(300, sample.Count);
        Assert.Equal(MachineStatus.Running, sample.Status);
    }

    // 模擬器:狀態碼超出 0–4 視為 Unknown;計數欄位一個都取不到回傳 null
    [Fact]
    public void SimulatorParser_ShouldReportUnknown_WhenStatusOutOfRange()
    {
        var sample = SimulatorPayloadParser.Parse("""{ "deviceId": "sim-1", "total_length": 10, "status": 99 }""");

        Assert.NotNull(sample);
        Assert.Equal(MachineStatus.Unknown, sample!.Status);
        Assert.Equal("sim-1", sample.DeviceId);
    }

    [Theory]
    [InlineData("""{ "deviceId": "sim-1", "speed": 3 }""")]
    [InlineData("""broken json""")]
    [InlineData("""[1,2]""")]
    public void SimulatorParser_ShouldReturnNull_WhenCountMissingOrBroken(string payload)
    {
        Assert.Null(SimulatorPayloadParser.Parse(payload));
    }
}
