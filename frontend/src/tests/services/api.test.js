import { describe, it, expect, vi, beforeEach } from 'vitest';

// 以 mock 取代 axios:api.js 在 import 期就會呼叫 axios.create(),
// 因此 mock 必須回傳一個帶 get/post/put/delete 的假 instance,並把它暴露出來供斷言。
const mockInstance = {
    get: vi.fn(() => Promise.resolve({ data: null })),
    post: vi.fn(() => Promise.resolve({ data: null })),
    put: vi.fn(() => Promise.resolve({ data: null })),
    delete: vi.fn(() => Promise.resolve({ data: null })),
};

vi.mock('axios', () => ({
    default: {
        create: () => mockInstance,
    },
}));

const {
    syncSchedule, deleteOrder, updateOrderStatus,
    createProductionCompletion, getProductionCompletions, getAllProductionCompletions, getFactoryTimeSettings,
    getReasonCodes, createReasonCode, deleteReasonCode,
} = await import('../../services/api');

describe('api.syncSchedule 請求形狀(S1 / DF-04,AC-29)', () => {
    beforeEach(() => {
        mockInstance.post.mockClear();
        mockInstance.delete.mockClear();
    });

    it('只傳 orders 時,body 為 { orders, deleteIds: [] },URL 為 /orders/sync', async () => {
        const orders = [{ orderNumber: 'A-001', sequence: 0 }];

        await syncSchedule(orders);

        expect(mockInstance.post).toHaveBeenCalledTimes(1);
        const [url, body] = mockInstance.post.mock.calls[0];
        expect(url).toBe('/orders/sync');
        expect(body).toEqual({ orders, deleteIds: [] });
    });

    it('傳入 deleteIds 時會原樣送出(不再依賴後端的全量鏡像刪除)', async () => {
        const orders = [];
        const deleteIds = ['11111111-1111-1111-1111-111111111111'];

        await syncSchedule(orders, deleteIds);

        const [url, body] = mockInstance.post.mock.calls[0];
        expect(url).toBe('/orders/sync');
        expect(body.deleteIds).toEqual(deleteIds);
    });

    it('deleteOrder 打的是 DELETE /orders/{id}', async () => {
        await deleteOrder('22222222-2222-2222-2222-222222222222');

        expect(mockInstance.delete).toHaveBeenCalledWith('/orders/22222222-2222-2222-2222-222222222222');
    });
});

// S1 / v2.0(AC-30e):完工改回寫狀態,不再靠鏡像刪除把完工單清掉。
describe('api.updateOrderStatus 請求形狀(S1 / v2.0,AC-30e)', () => {
    beforeEach(() => {
        mockInstance.put.mockClear();
    });

    it('updateOrderStatus(id, 3) 送出 PUT /orders/{id}/status?status=3', async () => {
        const id = '33333333-3333-3333-3333-333333333333';

        await updateOrderStatus(id, 3);

        expect(mockInstance.put).toHaveBeenCalledTimes(1);
        expect(mockInstance.put).toHaveBeenCalledWith(`/orders/${id}/status?status=3`);
    });
});
// S3 / F6(AC-27):完工實績落地後端的請求形狀
describe('api.createProductionCompletion 請求形狀(S3 / F6,AC-27)', () => {
    beforeEach(() => {
        mockInstance.post.mockClear();
        mockInstance.get.mockClear();
        mockInstance.delete.mockClear();
    });

    it('URL 為 /production/completions,body 原樣送出(含 clientRecordId、defects、stops)', async () => {
        const payload = {
            clientRecordId: '1756900000000',
            orderId: 'e2b10000-0000-4000-8000-000000000001',
            orderNumber: 'ORD-2026-000123',
            deviceId: 'MACHINE_01',
            operator: '王小明',
            shift: 'C',
            targetQty: 5000,
            goodQty: 4820,
            prepTimeMinutes: 12.5,
            runTimeMinutes: 96,
            stopTimeMinutes: 18,
            avgSpeed: 52,
            shortageReason: '',
            completedAt: '2026-09-04T00:41:12.000Z',
            defects: [{ code: 'A01', reason: '壓扁', qty: 120 }],
            stops: [{ code: '001', reason: '送紙歪斜', durationMinutes: 6.5 }],
        };

        await createProductionCompletion(payload);

        expect(mockInstance.post).toHaveBeenCalledTimes(1);
        const [url, body] = mockInstance.post.mock.calls[0];
        expect(url).toBe('/production/completions');
        expect(body).toEqual(payload);
        expect(body.clientRecordId).toBe('1756900000000');
        expect(Array.isArray(body.defects)).toBe(true);
        expect(Array.isArray(body.stops)).toBe(true);
    });

    it('getProductionCompletions 帶入 from / to / 分頁參數', async () => {
        await getProductionCompletions({ from: '2026-09-01', to: '2026-09-30', page: 2, pageSize: 100 });

        const [url, config] = mockInstance.get.mock.calls[0];
        expect(url).toBe('/production/completions');
        expect(config.params).toEqual({ from: '2026-09-01', to: '2026-09-30', page: 2, pageSize: 100 });
    });

    it('getProductionCompletions 未帶區間時只送分頁預設值', async () => {
        await getProductionCompletions();

        const [, config] = mockInstance.get.mock.calls[0];
        expect(config.params).toEqual({ page: 1, pageSize: 50 });
    });

    it('getFactoryTimeSettings 打的是 /settings/factory-time', async () => {
        await getFactoryTimeSettings();

        expect(mockInstance.get).toHaveBeenCalledWith('/settings/factory-time');
    });
});

// S3 / F8:原因主檔 API 的請求形狀
describe('api 原因主檔請求形狀(S3 / F8)', () => {
    beforeEach(() => {
        mockInstance.get.mockClear();
        mockInstance.post.mockClear();
        mockInstance.delete.mockClear();
    });

    it('getReasonCodes 以查詢參數帶 type 與 includeInactive', async () => {
        await getReasonCodes('stop');

        const [url, config] = mockInstance.get.mock.calls[0];
        expect(url).toBe('/reasons');
        expect(config.params).toEqual({ type: 'stop', includeInactive: false });
    });

    it('createReasonCode 把 type 併進 body 送到 /reasons', async () => {
        await createReasonCode('defect', { code: 'A05', name: '受潮', category: 'General', displayOrder: 5 });

        const [url, body] = mockInstance.post.mock.calls[0];
        expect(url).toBe('/reasons');
        expect(body).toEqual({ type: 'defect', code: 'A05', name: '受潮', category: 'General', displayOrder: 5 });
    });

    it('deleteReasonCode 打的是 DELETE /reasons/{id}', async () => {
        await deleteReasonCode('33333333-3333-3333-3333-333333333333');

        expect(mockInstance.delete).toHaveBeenCalledWith('/reasons/33333333-3333-3333-3333-333333333333');
    });
});

// ---------------------------------------------------------------------------
// S4 / F2:getAllProductionCompletions 逐頁抓取(AC-S4-04、AC-S4-07、AC-S4-08、AC-S4-10、E-04、E-05)
//
// 後端回的是裸陣列、沒有 total / hasNext 信封,終止條件只能靠「短頁」。
// 這組測試釘住三件事:取得完整、不無限迴圈、不靜默截斷。
// ---------------------------------------------------------------------------
describe('api.getAllProductionCompletions 分頁完整性(S4 / F2)', () => {
    /** 造 n 筆假的完工實績列(只需要有長度,內容不影響分頁判斷)。 */
    const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: `r${i}` }));

    beforeEach(() => {
        mockInstance.get.mockReset();
        mockInstance.get.mockResolvedValue({ data: [] });
    });

    it('AC-S4-04:每次請求的 params.from / params.to 皆等於輸入值', async () => {
        mockInstance.get
            .mockResolvedValueOnce({ data: rows(500) })
            .mockResolvedValueOnce({ data: rows(3) });

        await getAllProductionCompletions({ from: '2026-09-01', to: '2026-09-30' });

        expect(mockInstance.get).toHaveBeenCalledTimes(2);
        mockInstance.get.mock.calls.forEach(([url, config]) => {
            expect(url).toBe('/production/completions');
            expect(config.params.from).toBe('2026-09-01');
            expect(config.params.to).toBe('2026-09-30');
        });
        // 頁碼遞增、pageSize 為後端上限
        expect(mockInstance.get.mock.calls.map(([, c]) => c.params.page)).toEqual([1, 2]);
        expect(mockInstance.get.mock.calls.every(([, c]) => c.params.pageSize === 500)).toBe(true);
    });

    it('AC-S4-07:500 / 500 / 7 → 呼叫 3 次、1007 筆、truncated false', async () => {
        mockInstance.get
            .mockResolvedValueOnce({ data: rows(500) })
            .mockResolvedValueOnce({ data: rows(500) })
            .mockResolvedValueOnce({ data: rows(7) });

        const result = await getAllProductionCompletions({ from: '2026-09-01', to: '2026-09-30' });

        expect(mockInstance.get).toHaveBeenCalledTimes(3);
        expect(result.items).toHaveLength(1007);
        expect(result.pageCount).toBe(3);
        expect(result.truncated).toBe(false);
    });

    it('AC-S4-08:每頁都回滿 → 呼叫次數恰為 maxPages 且 truncated true(不得無限迴圈)', async () => {
        mockInstance.get.mockResolvedValue({ data: rows(500) });

        const result = await getAllProductionCompletions({ from: '2026-09-01', to: '2026-09-30' });

        expect(mockInstance.get).toHaveBeenCalledTimes(20);
        expect(result.items).toHaveLength(10000);
        expect(result.truncated).toBe(true);
    });

    it('AC-S4-08b:maxPages 可調,呼叫次數跟著改變', async () => {
        mockInstance.get.mockResolvedValue({ data: rows(2) });

        const result = await getAllProductionCompletions({ pageSize: 2, maxPages: 3 });

        expect(mockInstance.get).toHaveBeenCalledTimes(3);
        expect(result.items).toHaveLength(6);
        expect(result.truncated).toBe(true);
    });

    it('AC-S4-10:總筆數恰為 pageSize 倍數 → 1000 筆、truncated false,不多不少', async () => {
        mockInstance.get
            .mockResolvedValueOnce({ data: rows(500) })
            .mockResolvedValueOnce({ data: rows(500) })
            .mockResolvedValueOnce({ data: [] });

        const result = await getAllProductionCompletions({});

        expect(mockInstance.get).toHaveBeenCalledTimes(3);
        expect(result.items).toHaveLength(1000);
        expect(result.truncated).toBe(false);
    });

    it('AC-S4-14 前置:任一頁拋錯時整個函式拋出,不得回傳半份資料', async () => {
        mockInstance.get
            .mockResolvedValueOnce({ data: rows(500) })
            .mockRejectedValueOnce(new Error('Network Error'));

        await expect(getAllProductionCompletions({})).rejects.toThrow('Network Error');
    });

    it('E-04:回應不是陣列時視為該頁 0 筆並結束,不拋 TypeError', async () => {
        mockInstance.get.mockResolvedValueOnce({ data: { items: [], total: 0 } });

        const result = await getAllProductionCompletions({});

        expect(result.items).toEqual([]);
        expect(result.truncated).toBe(false);
        expect(mockInstance.get).toHaveBeenCalledTimes(1);
    });

    it('E-05:單頁筆數超過 pageSize 時視為「可能還有」,繼續下一頁', async () => {
        mockInstance.get
            .mockResolvedValueOnce({ data: rows(501) })
            .mockResolvedValueOnce({ data: rows(1) });

        const result = await getAllProductionCompletions({});

        expect(mockInstance.get).toHaveBeenCalledTimes(2);
        expect(result.items).toHaveLength(502);
        expect(result.truncated).toBe(false);
    });

    it('E-02:from / to 省略時不帶該參數', async () => {
        mockInstance.get.mockResolvedValueOnce({ data: [] });

        await getAllProductionCompletions({});

        const [, config] = mockInstance.get.mock.calls[0];
        expect(config.params.from).toBeUndefined();
        expect(config.params.to).toBeUndefined();
    });
});
