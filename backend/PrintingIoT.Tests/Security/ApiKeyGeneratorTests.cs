using PrintingIoT.Core.Security;

namespace PrintingIoT.Tests.Security;

/// <summary>
/// ApiKeyGenerator 單元測試(S7)。
/// 涵蓋格式契約、雜湊一致性、前綴解析的邊界,以及定時比較的正負案例。
/// </summary>
public class ApiKeyGeneratorTests
{
    // AC-S7-01:產生的金鑰為 pio_{prefix}_{secret} 三段,且回傳的前綴與雜湊與明文一致
    [Fact]
    public void Generate_ProducesThreePartKey_WithMatchingPrefixAndHash()
    {
        var (plainKey, prefix, hash) = ApiKeyGenerator.Generate();

        // 上限 3:祕密段是 base64url,本身可能含底線
        var parts = plainKey.Split('_', 3);
        Assert.Equal(3, parts.Length);
        Assert.Equal(ApiKeyGenerator.Scheme, parts[0]);
        Assert.Equal(prefix, parts[1]);
        Assert.Equal(prefix, ApiKeyGenerator.ExtractPrefix(plainKey));
        Assert.Equal(hash, ApiKeyGenerator.ComputeHash(plainKey));
    }

    // AC-S7-02:兩次產生不得相同(前綴與明文都要有足夠亂度)
    [Fact]
    public void Generate_IsUniqueAcrossCalls()
    {
        var keys = Enumerable.Range(0, 50).Select(_ => ApiKeyGenerator.Generate()).ToList();

        Assert.Equal(50, keys.Select(k => k.Prefix).Distinct().Count());
        Assert.Equal(50, keys.Select(k => k.PlainKey).Distinct().Count());
    }

    // AC-S7-03:祕密段只含 base64url 字元,不會在 HTTP 標頭或設定檔被轉義
    [Fact]
    public void Generate_SecretUsesUrlSafeAlphabetOnly()
    {
        var (plainKey, _, _) = ApiKeyGenerator.Generate();
        var secret = plainKey.Split('_', 3)[2];

        Assert.NotEmpty(secret);
        Assert.All(secret, c => Assert.True(
            char.IsAsciiLetterOrDigit(c) || c is '-' or '_',
            $"祕密段出現非 base64url 字元:{c}"));
    }

    // AC-S7-04:格式不符的輸入一律解析不出前綴(不可讓格式錯誤走進資料庫查詢)
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("abc")]
    [InlineData("pio_onlytwo")]
    [InlineData("xxx_abc123_secret")]
    [InlineData("pio__secret")]
    [InlineData("pio_abc123_")]
    public void ExtractPrefix_RejectsMalformedKeys(string? input)
    {
        Assert.Null(ApiKeyGenerator.ExtractPrefix(input));
    }

    // AC-S7-04b:祕密段含底線時仍能解析出前綴。
    // 這是實測踩到的缺陷:base64url 用 _ 取代 /,原本無上限的 Split 會把這類金鑰
    // 切成四段以上而誤判格式錯誤,約每三支金鑰就有一支從產生的當下就是死的。
    [Theory]
    [InlineData("pio_abc123def456_secret_with_underscores")]
    [InlineData("pio_abc123def456_a_b_c")]
    public void ExtractPrefix_AcceptsSecretsContainingUnderscores(string key)
    {
        Assert.Equal("abc123def456", ApiKeyGenerator.ExtractPrefix(key));
    }

    // AC-S7-04c:實際產生的金鑰**每一支**都解析得出前綴(亂數不得產出無效金鑰)
    [Fact]
    public void Generate_EveryGeneratedKey_IsParsable()
    {
        for (var i = 0; i < 200; i++)
        {
            var (plainKey, prefix, _) = ApiKeyGenerator.Generate();
            Assert.Equal(prefix, ApiKeyGenerator.ExtractPrefix(plainKey));
        }
    }

    // AC-S7-05:雜湊為決定性的,同一明文永遠得到同一結果
    [Fact]
    public void ComputeHash_IsDeterministic()
    {
        const string key = "pio_abc123def456_secretpart";

        Assert.Equal(ApiKeyGenerator.ComputeHash(key), ApiKeyGenerator.ComputeHash(key));
        Assert.NotEqual(ApiKeyGenerator.ComputeHash(key), ApiKeyGenerator.ComputeHash(key + "x"));
    }

    // AC-S7-06:定時比較的相等語意正確(長度不同、null、內容不同都必須為 false)
    [Fact]
    public void HashEquals_MatchesOnlyIdenticalStrings()
    {
        var hash = ApiKeyGenerator.ComputeHash("pio_abc_def");

        Assert.True(ApiKeyGenerator.HashEquals(hash, hash));
        Assert.False(ApiKeyGenerator.HashEquals(hash, hash + "x"));
        Assert.False(ApiKeyGenerator.HashEquals(hash, null));
        Assert.False(ApiKeyGenerator.HashEquals(null, hash));
        Assert.True(ApiKeyGenerator.HashEquals(null, null));
    }
}
