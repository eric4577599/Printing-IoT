namespace PrintingIoT.Core.DTOs;

/// <summary>
/// ERP 推單的逐列結果(S1 / ERP-10):呼叫端可依 Index / OrderNumber 定位失敗列。
/// </summary>
public class ErpPushRowResultDto
{
    /// <summary>輸入陣列位置(0-based),供呼叫端定位。</summary>
    public int Index { get; set; }

    public string OrderNumber { get; set; } = string.Empty;

    public bool Success { get; set; }

    /// <summary>失敗原因;成功時為 null。</summary>
    public string? Error { get; set; }

    /// <summary>成功時為後端訂單 Id;失敗時為 null。</summary>
    public Guid? OrderId { get; set; }
}

/// <summary>
/// ERP 推單的整批回應(S1 / ERP-10):部分成功仍回 HTTP 200,
/// 呼叫端一律解析 Results 判斷成敗。
/// </summary>
public class ErpPushResponseDto
{
    /// <summary>全部成功才為 true。</summary>
    public bool Success { get; set; }

    public int Total { get; set; }
    public int Succeeded { get; set; }
    public int Failed { get; set; }

    /// <summary>逐列結果,順序與輸入順序一致。</summary>
    public List<ErpPushRowResultDto> Results { get; set; } = new();
}
