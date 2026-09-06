using PrintingIoT.Core.Services;
using System.Text.Json;

namespace PrintingIoT.Tests.Services;

/// <summary>
/// S8 / §2:黃金向量測試(AC-12、AC-14)。
///
/// 這組測試存在的理由是**跨語言的漂移**,不是覆蓋率。
/// `OeeCalculator` 與 `frontend/src/utils/reportUtils.js` 的 `calculateOEE` 是同一組公式的兩份實作,
/// 在本檔出現之前,兩邊各自對著自己手寫的期望值測 —— 任一邊被改動,另一邊的測試不會有反應,
/// 報表數字就會靜靜地分岔。
///
/// 解法是兩邊讀**同一個檔** `tests/fixtures/oee-golden-vectors.json`。
/// C# 是權威實作(期望值由它背書),JS 端只需證明自己算得出同樣的數字。
/// 任一邊改了公式而沒改另一邊,該邊立刻紅。
/// </summary>
public class OeeCalculatorGoldenVectorTests
{
    private record Vector(string Name, VectorInput Input, VectorExpected Expected);

    private record VectorInput(
        decimal RunTime, decimal StopTime, decimal PrepTime,
        int GoodQty, int DefectQty, int TargetQty);

    private record VectorExpected(
        decimal Availability, decimal Performance, decimal Quality, decimal Oee);

    /// <summary>
    /// 從測試組件所在目錄往上找到 repo 根,再讀黃金向量檔。
    /// 輸入:無;輸出:向量清單。
    /// 找不到檔案時直接讓測試失敗 —— 靜默略過等於這層保護不存在。
    /// </summary>
    private static List<Vector> LoadVectors()
    {
        const string relativePath = "tests/fixtures/oee-golden-vectors.json";

        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, relativePath)))
            dir = dir.Parent;

        Assert.True(dir != null, $"找不到 {relativePath} —— 黃金向量檔是 C# 與 JS 共用的,不可缺少");

        var json = File.ReadAllText(Path.Combine(dir!.FullName, relativePath));
        var vectors = JsonSerializer.Deserialize<List<Vector>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        });

        Assert.NotNull(vectors);
        return vectors!;
    }

    public static TheoryData<string> VectorNames()
    {
        var data = new TheoryData<string>();
        foreach (var v in LoadVectors()) data.Add(v.Name);
        return data;
    }

    [Theory(DisplayName = "AC-12 黃金向量")]
    [MemberData(nameof(VectorNames))]
    public void Calculate_MatchesGoldenVector(string name)
    {
        var vector = LoadVectors().Single(v => v.Name == name);
        var i = vector.Input;

        var actual = OeeCalculator.Calculate(
            i.RunTime, i.StopTime, i.PrepTime, i.GoodQty, i.DefectQty, i.TargetQty);

        Assert.Equal(vector.Expected.Availability, actual.Availability);
        Assert.Equal(vector.Expected.Performance, actual.Performance);
        Assert.Equal(vector.Expected.Quality, actual.Quality);
        Assert.Equal(vector.Expected.Oee, actual.Oee);
    }

    [Fact(DisplayName = "AC-14 向量涵蓋規格列的六類邊界")]
    public void Vectors_CoverRequiredBoundaries()
    {
        var vectors = LoadVectors();

        // 光有一堆向量不算數 —— 要證明真的踩到了每一類邊界,否則哪天有人刪掉一筆也沒人知道。
        Assert.Contains(vectors, v => v.Expected.Availability == 0m && v.Input.RunTime > 0m);   // 負荷時間夾到 0
        Assert.Contains(vectors, v => v.Input.TargetQty == 0);                                  // 目標為零
        Assert.Contains(vectors, v => v.Input.GoodQty == 0 && v.Input.DefectQty == 0);          // 總產出為零
        Assert.Contains(vectors, v => v.Input.GoodQty > v.Input.TargetQty && v.Input.TargetQty > 0); // 超產封頂
        Assert.Contains(vectors, v => v.Input.RunTime < 0m || v.Input.GoodQty < 0);             // 負值夾零
        Assert.Contains(vectors, v => v.Expected.Availability == 100m);                          // min 夾住上限

        // 四捨五入邊界:必須有向量的原始值落在 x.x5 上。
        // 這一類最容易被誤以為「兩邊都是四捨五入所以一定一樣」——
        // C# 用 decimal 精確運算,JS 用二進位浮點,x.x5 正是兩者會分岔的地方。
        Assert.Contains(vectors, v => v.Input is { GoodQty: 1777, DefectQty: 223 });   // 良率 88.85
        Assert.Contains(vectors, v => v.Input is { RunTime: 6665m, StopTime: 3335m }); // 稼動率 66.65
        Assert.Contains(vectors, v => v.Input is { GoodQty: 6670, TargetQty: 20000 }); // 效能 33.35
    }
}
