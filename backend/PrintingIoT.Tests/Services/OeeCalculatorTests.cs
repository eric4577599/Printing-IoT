using PrintingIoT.Core.Services;

namespace PrintingIoT.Tests.Services;

/// <summary>
/// OeeCalculator 單元測試(S3 / F3,對應 AC-10 ~ AC-14)。
/// 規則見 docs/spec20260903-s3-v1.md §5.1;前端 reportUtils.calculateOEE 以相同數值釘住(AC-23)。
/// </summary>
public class OeeCalculatorTests
{
    // AC-10:§5.1 正常案例 —— R=96、S=18、P=12.5、G=4820、D=120、T=5000
    // 手算:L = 96 + 18 − 12.5 = 101.5
    //       A  = 96 / 101.5      = 94.581…% → 94.6
    //       Pf = 4820 / 5000     = 96.4%
    //       Q  = 4820 / 4940     = 97.570…% → 97.6
    //       OEE = 94.6 × 96.4 × 97.6 / 10000 = 89.005… → 89.0
    [Fact]
    public void Calculate_NormalCase_MatchesHandCalculation()
    {
        var result = OeeCalculator.Calculate(96m, 18m, 12.5m, 4820, 120, 5000);

        Assert.Equal(94.6m, result.Availability);
        Assert.Equal(96.4m, result.Performance);
        Assert.Equal(97.6m, result.Quality);
        Assert.Equal(89.0m, result.Oee);
    }

    // AC-11a:負荷時間 ≤ 0(準備時間吃掉整段運轉+停機)→ 稼動率 0、OEE 0(不是 100)
    [Fact]
    public void Calculate_LoadTimeZero_AvailabilityAndOeeAreZero()
    {
        var result = OeeCalculator.Calculate(10m, 5m, 20m, 100, 0, 100);

        Assert.Equal(0m, result.Availability);
        Assert.Equal(0m, result.Oee);
    }

    // AC-11b:目標數量 0 → 效能 0、OEE 0(不以 1 假裝滿分)
    [Fact]
    public void Calculate_TargetZero_PerformanceAndOeeAreZero()
    {
        var result = OeeCalculator.Calculate(96m, 18m, 0m, 100, 0, 0);

        Assert.Equal(0m, result.Performance);
        Assert.Equal(0m, result.Oee);
        Assert.NotEqual(100m, result.Performance);
    }

    // AC-11c:良品 + 不良品 = 0 → 良率 0、OEE 0
    [Fact]
    public void Calculate_NoProduction_QualityAndOeeAreZero()
    {
        var result = OeeCalculator.Calculate(96m, 18m, 0m, 0, 0, 5000);

        Assert.Equal(0m, result.Quality);
        Assert.Equal(0m, result.Oee);
    }

    // AC-12a:無不良品(D=0、G>0)→ 良率 100
    [Fact]
    public void Calculate_NoDefects_QualityIs100()
    {
        var result = OeeCalculator.Calculate(96m, 18m, 0m, 5000, 0, 5000);

        Assert.Equal(100m, result.Quality);
    }

    // AC-12b:全部不良(G=0、D>0)→ 良率 0 且 OEE 0
    [Fact]
    public void Calculate_AllDefects_QualityAndOeeAreZero()
    {
        var result = OeeCalculator.Calculate(96m, 18m, 0m, 0, 500, 5000);

        Assert.Equal(0m, result.Quality);
        Assert.Equal(0m, result.Oee);
    }

    // AC-13:效能分子用良品數 —— 固定 R/S/P/T,把 100 個產出從良品移到不良品,效能必須下降
    //        (舊公式用含不良品的累計計數,搬動不會有任何變化)
    [Fact]
    public void Calculate_MovingGoodToDefect_LowersPerformance()
    {
        var before = OeeCalculator.Calculate(96m, 18m, 12.5m, 4820, 120, 5000);
        var after = OeeCalculator.Calculate(96m, 18m, 12.5m, 4720, 220, 5000);

        Assert.True(after.Performance < before.Performance,
            $"效能應下降,實際 {before.Performance} → {after.Performance}");
        Assert.Equal(96.4m, before.Performance);
        Assert.Equal(94.4m, after.Performance);
    }

    // AC-14:準備時間排除 —— 固定 R/S,P 由 0 加到 10,稼動率必須上升且永遠 ≤ 100
    [Fact]
    public void Calculate_IncreasingPrepTime_RaisesAvailabilityAndNeverExceeds100()
    {
        decimal previous = -1m;

        for (var prep = 0; prep <= 10; prep++)
        {
            var result = OeeCalculator.Calculate(96m, 18m, prep, 4820, 120, 5000);

            Assert.True(result.Availability > previous,
                $"P={prep} 時稼動率應高於前一次({previous} → {result.Availability})");
            Assert.True(result.Availability <= 100m, $"P={prep} 時稼動率 {result.Availability} 超過 100");

            previous = result.Availability;
        }
    }

    // 邊界:準備時間 > 運轉+停機(計時器異常)→ 不出現負值或超過 100 的值
    [Fact]
    public void Calculate_PrepExceedsRunPlusStop_ClampsToZero()
    {
        var result = OeeCalculator.Calculate(30m, 10m, 999m, 100, 0, 100);

        Assert.Equal(0m, result.Availability);
        Assert.Equal(0m, result.Oee);
    }

    // 邊界:超產(G > T)→ 效能以 100% 封頂
    [Fact]
    public void Calculate_Overproduction_PerformanceCappedAt100()
    {
        var result = OeeCalculator.Calculate(96m, 18m, 0m, 6000, 0, 5000);

        Assert.Equal(100m, result.Performance);
        Assert.True(result.Oee <= 100m);
    }

    // 防呆:負數輸入先夾到 0,不得出現負率
    [Fact]
    public void Calculate_NegativeInputs_ClampedToZero()
    {
        var result = OeeCalculator.Calculate(-5m, -5m, -5m, -10, -10, -10);

        Assert.Equal(0m, result.Availability);
        Assert.Equal(0m, result.Performance);
        Assert.Equal(0m, result.Quality);
        Assert.Equal(0m, result.Oee);
    }

    // §5.1 規則 6:日報表平均 OEE 為依產量加權,不是算術平均
    // (OEE 90 / 產量 100)與(OEE 50 / 產量 900)→ 54,不是 70
    [Fact]
    public void WeightedAverageOee_WeightsByQuantity()
    {
        var result = OeeCalculator.WeightedAverageOee(new[] { (90m, 100), (50m, 900) });

        Assert.Equal(54m, result);
        Assert.NotEqual(70m, result);
    }

    // §5.1 規則 6:Σqty ≤ 0 → 0(不得退回算術平均)
    [Fact]
    public void WeightedAverageOee_ZeroTotalQuantity_ReturnsZero()
    {
        var result = OeeCalculator.WeightedAverageOee(new[] { (90m, 0), (50m, 0) });

        Assert.Equal(0m, result);
    }
}
