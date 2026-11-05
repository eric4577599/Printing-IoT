using PrintingIoT.Worker;
using Xunit;

namespace PrintingIoT.Tests.Worker;

/// <summary>B18:Worker 斷線重連的退避計算。</summary>
public class MqttWorkerReconnectTests
{
    [Theory]
    [InlineData(0, 0)]
    [InlineData(1, 2)]
    [InlineData(2, 4)]
    [InlineData(3, 8)]
    [InlineData(5, 32)]
    [InlineData(6, 60)]   // 64 秒被上限截到 60
    [InlineData(50, 60)]  // 極大次數不溢位、仍為上限
    public void NextBackoff_DoublesAndCapsAt60Seconds(int failures, int expectedSeconds)
    {
        Assert.Equal(TimeSpan.FromSeconds(expectedSeconds), MqttWorker.NextBackoff(failures));
    }
}
