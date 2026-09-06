namespace PrintingIoT.Core.Services;

/// <summary>
/// OEE 三因子計算結果,四個值皆為 0–100 的百分比、四捨五入到小數 1 位。
/// </summary>
public readonly record struct OeeResult(decimal Availability, decimal Performance, decimal Quality, decimal Oee);

/// <summary>
/// S3 / F3:OEE 計算的權威實作(純靜態、無相依)。
///
/// 規則見 docs/spec20260903-s3-v1.md §5.1,前端 frontend/src/utils/reportUtils.js 的
/// calculateOEE 必須依同一份規則表實作,兩邊由測試釘住相同數值(AC-10~AC-14 / AC-23)。
///
/// 設計註記:規則 3(效能)依客戶要求以「良品數」當分子,與規則 4 的良率因子在數學上有部分
/// 重疊(良品被計入兩次),會使 OEE 略為保守。這是客戶明確指定的口徑,不是實作疏漏;
/// 若日後改回「總產出 / 目標」需同步改 C# 與 JS 兩處實作與測試。
/// </summary>
public static class OeeCalculator
{
    /// <summary>
    /// 依 §5.1 規則表計算稼動率 / 效能 / 良率 / OEE。
    ///
    /// 輸入:runTimeMinutes 運轉時間(分)、stopTimeMinutes 停機時間(分)、prepTimeMinutes 準備時間(分)、
    ///       goodQty 良品數、defectQty 不良品數、targetQty 目標數量。負值一律先夾到 0。
    /// 輸出:OeeResult,四個值皆 0–100 且四捨五入到小數 1 位(AwayFromZero)。
    /// 邏輯:
    ///   L  = max(0, R + S − P)                      負荷時間(準備時間與運轉/停機重疊,故從分母扣掉)
    ///   A  = min(R, L) / L × 100                    L ≤ 0 → 0;min 夾住上限確保不超過 100%
    ///   Pf = min(G / T, 1) × 100                    T ≤ 0 → 0;超產以 100% 封頂
    ///   Q  = G / (G + D) × 100                      G + D ≤ 0 → 0
    ///   OEE = A × Pf × Q / 10000                    以「已四捨五入的三因子」相乘,
    ///                                               讓 C# 與 JS 兩份實作得到位元相同的結果
    /// 分母為零一律回 0,不以 1 假裝滿分 —— 顯示 0 是誠實的「無法評估」。
    /// </summary>
    public static OeeResult Calculate(
        decimal runTimeMinutes, decimal stopTimeMinutes, decimal prepTimeMinutes,
        int goodQty, int defectQty, int targetQty)
    {
        // 防呆:不該發生的負值先夾到 0,避免出現負率或 NaN
        var run = Math.Max(0m, runTimeMinutes);
        var stop = Math.Max(0m, stopTimeMinutes);
        var prep = Math.Max(0m, prepTimeMinutes);
        var good = Math.Max(0, goodQty);
        var defect = Math.Max(0, defectQty);
        var target = Math.Max(0, targetQty);

        // 規則 1:負荷時間
        var load = Math.Max(0m, run + stop - prep);

        // 規則 2:稼動率
        var availability = load <= 0m ? 0m : Math.Min(run, load) / load * 100m;

        // 規則 3:效能(分子用良品數,超產封頂 100%)
        var performance = target <= 0 ? 0m : Math.Min((decimal)good / target, 1m) * 100m;

        // 規則 4:良率
        var produced = good + defect;
        var quality = produced <= 0 ? 0m : (decimal)good / produced * 100m;

        var a = Round1(availability);
        var pf = Round1(performance);
        var q = Round1(quality);

        // 規則 5:OEE(三者皆為百分比 → 除以 10000 回到百分比)
        var oee = Round1(a * pf * q / 10000m);

        return new OeeResult(a, pf, q, oee);
    }

    /// <summary>
    /// 依 §5.1 規則 6 計算加權平均 OEE(日報表用)。
    /// 輸入:(oee, qty) 序列,qty 為該筆的總產出(良品 + 不良品)。
    /// 輸出:Σ(oeeᵢ × qtyᵢ) / Σ(qtyᵢ),四捨五入到小數 1 位;Σqty ≤ 0 → 0(不得退回算術平均)。
    /// </summary>
    public static decimal WeightedAverageOee(IEnumerable<(decimal Oee, int Qty)> records)
    {
        decimal weighted = 0m;
        long totalQty = 0;

        foreach (var (oee, qty) in records)
        {
            var q = Math.Max(0, qty);
            weighted += oee * q;
            totalQty += q;
        }

        return totalQty <= 0 ? 0m : Round1(weighted / totalQty);
    }

    /// <summary>
    /// 四捨五入到小數 1 位(AwayFromZero),與 JS 的 Math.round(x * 10) / 10 對齊。
    /// 輸入:任意 decimal;輸出:小數 1 位的 decimal。
    /// </summary>
    private static decimal Round1(decimal value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);
}
