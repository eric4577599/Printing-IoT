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
    createProductionCompletion, getProductionCompletions, getFactoryTimeSettings,
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
