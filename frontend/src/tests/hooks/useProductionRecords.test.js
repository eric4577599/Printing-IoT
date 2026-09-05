import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// 以 mock 取代 axios(沿用 src/tests/services/api.test.js 的既有寫法):
// 這樣 hook 走的是真正的 api.getAllProductionCompletions,分頁失敗等情境才測得到端到端行為。
const mockInstance = {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: null })),
    put: vi.fn(() => Promise.resolve({ data: null })),
    delete: vi.fn(() => Promise.resolve({ data: null })),
};

vi.mock('axios', () => ({
    default: {
        create: () => mockInstance,
    },
}));

const { useProductionRecords } = await import('../../hooks/useProductionRecords');

/**
 * S4 / F3 共用資料來源 hook 測試
 * (AC-S4-03、AC-S4-05、AC-S4-09、AC-S4-11、AC-S4-14、AC-S4-15、AC-S4-17、AC-S4-20、AC-S4-30、E-14、E-15)。
 */

/** 造一筆後端完工實績 DTO。 */
const dto = (over = {}) => ({
    id: `guid-${over.clientRecordId || '1'}`,
    clientRecordId: '1001',
    orderId: null,
    orderNumber: 'A-001',
    operator: '阿明',
    shift: 'A',
    targetQty: 1000,
    goodQty: 900,
    defectQty: 100,
    prepTimeMinutes: 20,
    runTimeMinutes: 90,
    stopTimeMinutes: 30,
    stopCount: 1,
    avgSpeed: 120,
    availabilityRate: 90,
    performanceRate: 90,
    qualityRate: 90,
    oee: 55.5,
    shortageReason: '',
    completedAt: '2026-09-10T06:30:00Z',
    productionDate: '2026-09-10',
    defects: [],
    stops: [],
    ...over,
});

/** 造一筆本機快取記錄。 */
const local = (over = {}) => ({
    id: 900,
    orderNo: 'B-900',
    customer: '老客戶',
    productName: '五層箱',
    shift: 'B',
    targetQty: 1000,
    goodQty: 900,
    defectQty: 100,
    prepTime: 20,
    runTime: 90,
    stopTime: 30,
    stopCount: 1,
    avgSpeed: 110,
    oee: 99,
    date: '2026-09-09',
    finishedAt: '2026-09-09T10:00:00Z',
    stopReasons: [],
    ...over,
});

/** 把記錄寫進本機快取。 */
const seedCache = (records) => localStorage.setItem('productionHistory', JSON.stringify(records));

const RANGE = { from: '2026-09-01', to: '2026-09-30' };

describe('useProductionRecords(S4 / F3)', () => {
    beforeEach(() => {
        mockInstance.get.mockReset();
        mockInstance.get.mockResolvedValue({ data: [] });
        localStorage.clear();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('AC-S4-30:isLoading 在成功後回到 false', async () => {
        mockInstance.get.mockResolvedValue({ data: [dto()] });

        const { result } = renderHook(() => useProductionRecords(RANGE));

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.records).toHaveLength(1);
    });

    it('AC-S4-30b:失敗後 isLoading 也必須回到 false(不得卡在載入中)', async () => {
        mockInstance.get.mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useProductionRecords(RANGE));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.isDegraded).toBe(true);
    });

    it('AC-S4-03:同一筆時後端的 oee 勝出,本機快取的舊值不採用', async () => {
        seedCache([local({ id: 1001, date: '2026-09-10', oee: 99 })]);
        mockInstance.get.mockResolvedValue({ data: [dto({ clientRecordId: '1001', oee: 55.5 })] });

        const { result } = renderHook(() => useProductionRecords(RANGE));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.records).toHaveLength(1);
        expect(result.current.records[0].oee).toBe(55.5);
        expect(result.current.records[0].source).toBe('backend');
        expect(result.current.localOnlyCount).toBe(0);
    });

    it('AC-S4-05:from / to 變更時重新抓取,新請求帶新區間', async () => {
        mockInstance.get.mockResolvedValue({ data: [] });

        const { result, rerender } = renderHook(
            ({ from, to }) => useProductionRecords({ from, to }),
            { initialProps: RANGE }
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockInstance.get).toHaveBeenCalledTimes(1);
        expect(mockInstance.get.mock.calls[0][1].params.from).toBe('2026-09-01');

        rerender({ from: '2026-08-01', to: '2026-08-31' });

        await waitFor(() => expect(mockInstance.get).toHaveBeenCalledTimes(2));
        const [, config] = mockInstance.get.mock.calls[1];
        expect(config.params.from).toBe('2026-08-01');
        expect(config.params.to).toBe('2026-08-31');
    });

    it('AC-S4-09:觸到分頁硬上限時 truncated 為 true', async () => {
        const full = Array.from({ length: 500 }, (_, i) => dto({ clientRecordId: `k${i}` }));
        mockInstance.get.mockResolvedValue({ data: full });

        const { result } = renderHook(() => useProductionRecords(RANGE));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.truncated).toBe(true);
        expect(mockInstance.get).toHaveBeenCalledTimes(20);
    });

    it('AC-S4-11:API 全部失敗且本機有 3 筆在區間內 → 不拋出、3 筆、isDegraded true、error 非 null', async () => {
        seedCache([
            local({ id: 1, date: '2026-09-05' }),
            local({ id: 2, date: '2026-09-06' }),
            local({ id: 3, date: '2026-09-07' }),
        ]);
        mockInstance.get.mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useProductionRecords(RANGE));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.records).toHaveLength(3);
        expect(result.current.isDegraded).toBe(true);
        expect(result.current.error).not.toBeNull();
        expect(result.current.localOnlyCount).toBe(3);
    });

    it('AC-S4-14:第 2 頁失敗(第 1 頁成功)視為整體失敗,不得把半份資料當完整資料呈現', async () => {
        seedCache([local({ id: 900, date: '2026-09-09' })]);
        const full = Array.from({ length: 500 }, (_, i) => dto({ clientRecordId: `k${i}` }));
        mockInstance.get
            .mockResolvedValueOnce({ data: full })
            .mockRejectedValueOnce(new Error('Network Error'));

        const { result } = renderHook(() => useProductionRecords(RANGE));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.isDegraded).toBe(true);
        // 只留本機列,不得混入第 1 頁抓到的 500 筆
        expect(result.current.records).toHaveLength(1);
        expect(result.current.records[0].source).toBe('local');
    });

    it('AC-S4-15:本機快取為非法 JSON 時不拋出,後端列照常顯示', async () => {
        localStorage.setItem('productionHistory', '{壞掉的 JSON');
        mockInstance.get.mockResolvedValue({ data: [dto()] });

        const { result } = renderHook(() => useProductionRecords(RANGE));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.records).toHaveLength(1);
        expect(result.current.records[0].source).toBe('backend');
        expect(result.current.isDegraded).toBe(false);
    });

    it('AC-S4-17:後端回空、本機 5 筆在區間內 → 5 筆全留、localOnlyCount 5、isDegraded false(E-17)', async () => {
        seedCache([1, 2, 3, 4, 5].map(i => local({ id: i, date: `2026-09-0${i}` })));
        mockInstance.get.mockResolvedValue({ data: [] });

        const { result } = renderHook(() => useProductionRecords(RANGE));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.records).toHaveLength(5);
        expect(result.current.localOnlyCount).toBe(5);
        expect(result.current.isDegraded).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('AC-S4-20:本機列落在區間外者不得混入', async () => {
        seedCache([
            local({ id: 800, date: '2026-08-01' }),
            local({ id: 900, date: '2026-09-09' }),
        ]);
        mockInstance.get.mockResolvedValue({ data: [] });

        const { result } = renderHook(() => useProductionRecords(RANGE));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.records).toHaveLength(1);
        expect(result.current.records[0].date).toBe('2026-09-09');
    });

    it('E-14:快速切換區間時只有最後一次請求的結果寫入 state', async () => {
        const pending = [];
        mockInstance.get.mockImplementation(() => new Promise(resolve => pending.push(resolve)));

        const { result, rerender } = renderHook(
            ({ from, to }) => useProductionRecords({ from, to }),
            { initialProps: RANGE }
        );

        await waitFor(() => expect(pending).toHaveLength(1));

        rerender({ from: '2026-08-01', to: '2026-08-31' });
        await waitFor(() => expect(pending).toHaveLength(2));

        // 先回新請求,再回舊請求 —— 舊回應不得覆蓋新結果
        await act(async () => {
            pending[1]({ data: [dto({ clientRecordId: 'NEW', orderNumber: 'NEW-ORDER' })] });
            pending[0]({ data: [dto({ clientRecordId: 'OLD', orderNumber: 'OLD-ORDER' })] });
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.records).toHaveLength(1);
        expect(result.current.records[0].orderNo).toBe('NEW-ORDER');
    });

    it('E-15:元件在請求飛行中卸載時不 setState,不產生錯誤', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const pending = [];
        mockInstance.get.mockImplementation(() => new Promise(resolve => pending.push(resolve)));

        const { unmount } = renderHook(() => useProductionRecords(RANGE));
        await waitFor(() => expect(pending).toHaveLength(1));

        unmount();
        await act(async () => {
            pending[0]({ data: [dto()] });
        });

        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('enabled 為 false 時不打 API', async () => {
        renderHook(() => useProductionRecords({ ...RANGE, enabled: false }));

        await waitFor(() => expect(mockInstance.get).not.toHaveBeenCalled());
    });

    it('reload 會重新打一次 API', async () => {
        mockInstance.get.mockResolvedValue({ data: [] });

        const { result } = renderHook(() => useProductionRecords(RANGE));
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockInstance.get).toHaveBeenCalledTimes(1);

        await act(async () => {
            await result.current.reload();
        });

        expect(mockInstance.get).toHaveBeenCalledTimes(2);
    });
});
