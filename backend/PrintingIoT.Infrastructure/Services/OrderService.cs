using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.DTOs;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Interfaces;
using PrintingIoT.Infrastructure.Data;
using Microsoft.Extensions.Logging;

namespace PrintingIoT.Infrastructure.Services;

public class OrderService : IOrderService
{
    private readonly PrintingContext _context;
    private readonly ILogger<OrderService> _logger;

    // S1 / SEC-05:ERP 推單的欄位長度上限(只在 Service 層把關,實體不加 MaxLength 以免多一次欄位型別 migration)
    private const int MaxOrderNumberLength = 50;
    private const int MaxCustomerNameLength = 100;
    private const int MaxBoxTypeLength = 50;
    private const int MaxPaperSpecLength = 100;
    private const int MaxProductCodeLength = 50;
    private const int MaxProductionBatchLength = 50;
    private const int MaxTraceCodeLength = 100;

    public OrderService(PrintingContext context, ILogger<OrderService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<Order>> GetOrdersAsync(OrderStatus? status = null)
    {
        var query = _context.Orders.AsQueryable();
        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status);
        }
        return await query.OrderByDescending(o => o.CreatedAt).ToListAsync();
    }

    public async Task<Order?> GetOrderAsync(Guid id)
    {
        return await _context.Orders.FindAsync(id);
    }

    public async Task<Order> CreateOrderAsync(Order order)
    {
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();
        return order;
    }

    public async Task<bool> UpdateStatusAsync(Guid id, OrderStatus status)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return false;

        order.Status = status;
        if (status == OrderStatus.Completed)
        {
            order.CompletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    // Phase 2(排程拖拉後端持久化):編輯排程列時全欄位更新(含 SpecJson 規格 passthrough)。
    // 僅更新可由前端維護的欄位;Id/CreatedAt 不動。
    public async Task<bool> UpdateOrderAsync(Guid id, Order updated)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return false;

        order.OrderNumber = updated.OrderNumber;
        order.CustomerName = updated.CustomerName;
        order.Quantity = updated.Quantity;
        order.BoxType = updated.BoxType;
        order.PaperSpec = updated.PaperSpec;
        order.ProductCode = updated.ProductCode;
        order.Sequence = updated.Sequence;
        order.Status = updated.Status;
        order.TargetLength = updated.TargetLength;
        order.SpecJson = updated.SpecJson;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteOrderAsync(Guid id)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return false;

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReorderSequenceAsync(List<Guid> orderedIds)
    {
        var orders = await _context.Orders
            .Where(o => orderedIds.Contains(o.Id))
            .ToListAsync();

        foreach (var order in orders)
        {
            var index = orderedIds.IndexOf(order.Id);
            if (index != -1)
            {
                order.Sequence = index + 1;
                order.Status = OrderStatus.Pending;
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// S1 / DF-04 + DF-05:排程同步(upsert 語意)。
    /// 輸入:ScheduleSyncRequest —— Orders 為要新增/更新的排程列,DeleteIds 為明確刪除清單。
    /// 輸出:同步後的全部訂單,依 Sequence 升冪(同序以 CreatedAt 升冪)。
    /// 邏輯:
    ///   1. 比對鍵依序 Id → OrderNumber(多筆同號取 CreatedAt 最早)→ 都不中則新增;
    ///   2. 逐欄「null 不覆寫」,非 null(含 "" 與 0)才視為呼叫端明確指定;
    ///   3. 清單外的既有列一律保留(不再鏡像刪除),Sequence 也不動;
    ///   4. 只刪 DeleteIds 中存在且未被 upsert 命中的列,同時出現在兩邊時以 upsert 為準;
    ///   5. Orders 與 DeleteIds 皆空 → 不動作,直接回傳現況。
    /// </summary>
    public async Task<IEnumerable<Order>> SyncScheduleAsync(ScheduleSyncRequest request)
    {
        var incoming = request?.Orders ?? new List<OrderSyncDto>();
        var deleteIds = request?.DeleteIds ?? new List<Guid>();

        // 空請求保護:避免前端暫態(尚未載入完成)把整份排程清空
        if (incoming.Count == 0 && deleteIds.Count == 0)
            return await GetSortedOrdersAsync();

        var existing = await _context.Orders.ToListAsync();
        var byId = existing.ToDictionary(o => o.Id);
        var byNumber = BuildOrderNumberIndex(existing);

        // upsert 命中(或新建)的列 Id,供刪除階段避讓
        var touchedIds = new HashSet<Guid>();

        for (int i = 0; i < incoming.Count; i++)
        {
            var dto = incoming[i];
            if (dto == null) continue;

            Order? target = null;

            // (a) Id 命中既有列
            if (dto.Id.HasValue && dto.Id.Value != Guid.Empty && byId.TryGetValue(dto.Id.Value, out var hitById))
            {
                target = hitById;
            }
            // (b) OrderNumber 命中既有列
            else if (!string.IsNullOrWhiteSpace(dto.OrderNumber) && byNumber.TryGetValue(dto.OrderNumber!, out var hitByNumber))
            {
                target = hitByNumber;
            }

            if (target == null)
            {
                // (c) 新增列;Id 有值就沿用該 GUID,否則新產生
                target = new Order
                {
                    Id = dto.Id.HasValue && dto.Id.Value != Guid.Empty ? dto.Id.Value : Guid.NewGuid(),
                    CreatedAt = DateTime.UtcNow,
                };
                ApplySyncDto(target, dto);
                target.Sequence = i;
                _context.Orders.Add(target);

                // 讓同一請求內後續的列能命中這筆新列(同 id / 同單號不重複建立)
                byId[target.Id] = target;
                if (!string.IsNullOrWhiteSpace(target.OrderNumber) && !byNumber.ContainsKey(target.OrderNumber))
                    byNumber[target.OrderNumber] = target;
            }
            else
            {
                ApplySyncDto(target, dto);
                target.Sequence = i;
            }

            touchedIds.Add(target.Id);
        }

        // 明確刪除:只刪存在於資料庫、且未被本次 upsert 命中的列
        foreach (var id in deleteIds.Distinct())
        {
            if (touchedIds.Contains(id))
            {
                _logger.LogWarning("排程同步:訂單 {OrderId} 同時出現在 Orders 與 DeleteIds,以 upsert 為準不刪除", id);
                continue;
            }
            if (byId.TryGetValue(id, out var toRemove))
                _context.Orders.Remove(toRemove);
            // 找不到的 id 靜默忽略
        }

        await _context.SaveChangesAsync();
        return await GetSortedOrdersAsync();
    }

    /// <summary>
    /// 取得排序後的訂單清單(Sequence 升冪,同序以 CreatedAt 升冪)。
    /// 輸入:無;輸出:排序後的訂單清單。
    /// </summary>
    private async Task<List<Order>> GetSortedOrdersAsync()
    {
        return await _context.Orders
            .OrderBy(o => o.Sequence)
            .ThenBy(o => o.CreatedAt)
            .ToListAsync();
    }

    /// <summary>
    /// 以 OrderNumber 建立既有訂單索引;多筆同號取 CreatedAt 最早的一筆並記 warning log。
    /// 輸入:既有訂單清單;輸出:OrderNumber → 代表列 的字典。
    /// </summary>
    private Dictionary<string, Order> BuildOrderNumberIndex(List<Order> existing)
    {
        var index = new Dictionary<string, Order>();
        foreach (var group in existing.Where(o => !string.IsNullOrWhiteSpace(o.OrderNumber)).GroupBy(o => o.OrderNumber))
        {
            var ordered = group.OrderBy(o => o.CreatedAt).ToList();
            if (ordered.Count > 1)
                _logger.LogWarning("資料庫存在 {Count} 筆同單號 {OrderNumber},比對時取 CreatedAt 最早的一筆", ordered.Count, group.Key);
            index[group.Key] = ordered[0];
        }
        return index;
    }

    /// <summary>
    /// S1 / DF-05:把同步 DTO 套用到訂單實體,只更新呼叫端實際提供(非 null)的欄位。
    /// 輸入:target 目標訂單實體、dto 同步 payload;輸出:無(就地更新 target)。
    /// 邏輯:欄位為 null → 保留既有值;非 null(含 "" 與 0)→ 視為明確指定而覆寫。
    /// </summary>
    private static void ApplySyncDto(Order target, OrderSyncDto dto)
    {
        if (dto.OrderNumber != null) target.OrderNumber = dto.OrderNumber;
        if (dto.CustomerName != null) target.CustomerName = dto.CustomerName;
        if (dto.TargetLength.HasValue) target.TargetLength = dto.TargetLength.Value;
        if (dto.Status.HasValue) target.Status = dto.Status.Value;
        if (dto.BoxType != null) target.BoxType = dto.BoxType;
        if (dto.PaperSpec != null) target.PaperSpec = dto.PaperSpec;
        if (dto.Quantity.HasValue) target.Quantity = dto.Quantity.Value;
        if (dto.ProductCode != null) target.ProductCode = dto.ProductCode;
        if (dto.DeliveryDate.HasValue) target.DeliveryDate = dto.DeliveryDate;
        if (dto.ProductionBatch != null) target.ProductionBatch = dto.ProductionBatch;
        if (dto.TraceCode != null) target.TraceCode = dto.TraceCode;
        if (dto.SpecJson != null) target.SpecJson = dto.SpecJson;
    }

    /// <summary>
    /// S1 / ERP-02 + SEC-05 + ERP-10:ERP 推單(依 OrderNumber upsert,冪等)。
    /// 輸入:ERP 送來的訂單清單;輸出:整批結果(含逐列成敗、失敗原因與後端 OrderId)。
    /// 邏輯:先逐列驗證 → 只把通過的列 upsert(命中同單號則更新,ERP 為權威來源)→ 單次 SaveChanges,
    ///       因此驗證失敗的列不會落地;產品碼先查再建,同批次內同碼只建一筆。
    /// </summary>
    public async Task<ErpPushResponseDto> PushOrdersAsync(List<OrderDto> orderDtos)
    {
        var response = new ErpPushResponseDto { Success = true };
        if (orderDtos == null || orderDtos.Count == 0)
            return response;

        response.Total = orderDtos.Count;

        // 第一階段:逐列驗證(壞列不落地)
        var rows = new List<ErpPushRowResultDto>(orderDtos.Count);
        for (int i = 0; i < orderDtos.Count; i++)
        {
            var dto = orderDtos[i];
            var error = dto == null ? "訂單資料不可為空" : ValidatePushRow(dto);
            rows.Add(new ErpPushRowResultDto
            {
                Index = i,
                OrderNumber = dto?.OrderNumber ?? string.Empty,
                Success = error == null,
                Error = error,
            });
        }

        var validIndexes = rows.Where(r => r.Success).Select(r => r.Index).ToList();
        if (validIndexes.Count == 0)
        {
            FinalizePushResponse(response, rows);
            return response;
        }

        // 第二階段:一次載入涉及的既有訂單與產品(避免逐列查詢,也確保同批次同碼只建一筆產品)
        var numbers = validIndexes.Select(i => orderDtos[i].OrderNumber).Distinct().ToList();
        var existingOrders = await _context.Orders
            .Where(o => numbers.Contains(o.OrderNumber))
            .ToListAsync();
        var byNumber = BuildOrderNumberIndex(existingOrders);

        var codes = validIndexes
            .Select(i => orderDtos[i].ProductCode)
            .Where(c => !string.IsNullOrEmpty(c))
            .Select(c => c!)
            .Distinct()
            .ToList();
        var products = await _context.Products
            .Where(p => codes.Contains(p.ProductCode))
            .ToDictionaryAsync(p => p.ProductCode);

        // 第三階段:upsert
        foreach (var i in validIndexes)
        {
            var dto = orderDtos[i];
            if (!byNumber.TryGetValue(dto.OrderNumber, out var order))
            {
                // 沒有同號 → 新增(Sequence=0 進待排池,Status=Pending)
                order = new Order
                {
                    OrderNumber = dto.OrderNumber,
                    Sequence = 0,
                    Status = OrderStatus.Pending,
                };
                _context.Orders.Add(order);
                byNumber[dto.OrderNumber] = order;
            }

            // ERP 為權威來源,覆寫下列欄位;
            // 不動 Id / CreatedAt / Sequence / Status / SpecJson(避免把生產中的單打回 Pending、清掉排程位置與規格 payload)
            order.CustomerName = dto.CustomerName ?? string.Empty;
            order.TargetLength = dto.TargetLength;
            order.BoxType = dto.BoxType ?? string.Empty;
            order.PaperSpec = dto.PaperSpec ?? string.Empty;
            order.Quantity = dto.Quantity;
            order.ProductCode = dto.ProductCode ?? string.Empty;
            order.DeliveryDate = dto.DeliveryDate;
            order.ProductionBatch = dto.ProductionBatch ?? string.Empty;
            order.TraceCode = dto.TraceCode ?? string.Empty;

            // 產品碼先查再建:命中既有產品就套用最佳化參數,未命中才建立佔位產品並寫回字典
            if (!string.IsNullOrEmpty(order.ProductCode))
            {
                if (products.TryGetValue(order.ProductCode, out var product))
                {
                    order.OptPhase = product.OptimizationPhase;
                    order.OptGap = product.OptimizationGap;
                    _logger.LogInformation("Optimization data applied for Order {OrderNumber} (Product {ProductCode})", order.OrderNumber, order.ProductCode);
                }
                else
                {
                    var newProduct = new Product
                    {
                        ProductCode = order.ProductCode,
                        Name = $"Auto-created for {dto.OrderNumber}",
                        OptimizationPhase = 0,
                        OptimizationGap = 0
                    };
                    _context.Products.Add(newProduct);
                    products[newProduct.ProductCode] = newProduct;
                    _logger.LogInformation("New Product created: {ProductCode}", order.ProductCode);
                }
            }

            var row = rows[i];
            row.OrderId = order.Id;
        }

        await _context.SaveChangesAsync();

        FinalizePushResponse(response, rows);
        return response;
    }

    /// <summary>
    /// 統計整批推單結果並填入回應(全部成功才 Success=true)。
    /// 輸入:待填的回應物件、逐列結果;輸出:無(就地填入 response)。
    /// </summary>
    private static void FinalizePushResponse(ErpPushResponseDto response, List<ErpPushRowResultDto> rows)
    {
        response.Results = rows;
        response.Succeeded = rows.Count(r => r.Success);
        response.Failed = rows.Count - response.Succeeded;
        response.Success = response.Failed == 0;
    }

    /// <summary>
    /// S1 / SEC-05:推單單列欄位驗證。
    /// 輸入:ERP 訂單 DTO;輸出:第一個命中的錯誤訊息,全部通過則回 null。
    /// </summary>
    private static string? ValidatePushRow(OrderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.OrderNumber)) return "訂單編號不可為空";
        if (dto.OrderNumber.Length > MaxOrderNumberLength) return $"訂單編號超過 {MaxOrderNumberLength} 字元";
        if ((dto.CustomerName?.Length ?? 0) > MaxCustomerNameLength) return $"客戶名稱超過 {MaxCustomerNameLength} 字元";
        if ((dto.BoxType?.Length ?? 0) > MaxBoxTypeLength) return $"箱型超過 {MaxBoxTypeLength} 字元";
        if ((dto.PaperSpec?.Length ?? 0) > MaxPaperSpecLength) return $"楞別超過 {MaxPaperSpecLength} 字元";
        if ((dto.ProductCode?.Length ?? 0) > MaxProductCodeLength) return $"產品碼超過 {MaxProductCodeLength} 字元";
        if ((dto.ProductionBatch?.Length ?? 0) > MaxProductionBatchLength) return $"生產批號超過 {MaxProductionBatchLength} 字元";
        if ((dto.TraceCode?.Length ?? 0) > MaxTraceCodeLength) return $"追溯碼超過 {MaxTraceCodeLength} 字元";
        if (dto.Quantity < 0) return "數量不可為負";
        if (dto.TargetLength < 0) return "目標長度不可為負";
        return null;
    }
}
