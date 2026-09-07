import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// 以 mock 取代 axios(沿用專案既有寫法),讓 hook 走真正的 api.js
const mockInstance = {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: null })),
    delete: vi.fn(() => Promise.resolve({ data: null })),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
    },
};

vi.mock('axios', () => ({ default: { create: () => mockInstance } }));

const { useBackfill } = await import('../../hooks/useBackfill');

/**
 * 本機舊實績回填的協調層測試(handoff Next Step 9)
 *
 * 守四件事:掃描只讀不寫、後端已有的不重送、失敗要留下原因、
 * 以及**冪等命中時內容不一致要標成衝突**(本機 id 是 Date.now(),會撞鍵)。
 */

const record = (over = {}) => ({
    id: 1001,
    orderId: 42,
    orderNo: 'WO-0001',
    operator: 'OP1',
    shift: 'A',
    targetQty: 1000,
    goodQty: 950,
    prepTime: 10,
    runTime: 200,
    stopTime: 20,
    avgSpeed: 100,
    date: '2026-08-01',
    finishedAt: '2026-08-01T09:30:00.000Z',
    defects: [{ code: 'DF01', reason: '色差', qty: 50 }],
    stopReasons: [{ code: 'ST01', reason: '換版', duration: '10:00' }],
    ...over,
});

/** 設定 GET 的回應:工廠設定與完工清單走同一個 mock,依路徑分流。 */
function mockGets({ completions = [], settings = { timeZone: 'Asia/Taipei', dayBoundaryHour: 8 } } = {}) {
    mockInstance.get.mockImplementation(url => {
        if (url.includes('factory')) return Promise.resolve({ data: settings });
        if (url.includes('/production/completions')) return Promise.resolve({ data: completions });
        return Promise.resolve({ data: [] });
    });
}

describe('useBackfill', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockGets();
        mockInstance.post.mockResolvedValue({ data: { id: 'guid-1', productionDate: '2026-08-01' } });
    });

    it('掃描只讀不寫 —— 不得送出任何 POST', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([record()]));
        const { result } = renderHook(() => useBackfill());

        await act(async () => { await result.current.scan(); });

        expect(result.current.state.summary.pending).toBe(1);
        expect(mockInstance.post).not.toHaveBeenCalled();
    });

    it('後端已有的不列入待回填', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([record({ id: 1 }), record({ id: 2 })]));
        mockGets({ completions: [{ clientRecordId: '1' }] });

        const { result } = renderHook(() => useBackfill());
        await act(async () => { await result.current.scan(); });

        expect(result.current.state.summary.alreadySynced).toBe(1);
        expect(result.current.state.summary.pending).toBe(1);
    });

    it('回填成功後把本機那筆標為 synced,下次掃描不再列入', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([record()]));
        const { result } = renderHook(() => useBackfill());

        await act(async () => { await result.current.scan(); });
        await act(async () => { await result.current.run(); });

        expect(result.current.state.results[0].status).toBe('created');

        const stored = JSON.parse(localStorage.getItem('productionHistory'));
        expect(stored[0].syncState).toBe('synced');
        expect(stored[0].backendId).toBe('guid-1');
    });

    it('冪等命中且內容一致 → alreadyExists,不算失敗', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([record()]));
        mockInstance.post.mockResolvedValue({
            data: { id: 'guid-1', duplicated: true, defectQty: 50, stopCount: 1 },
        });

        const { result } = renderHook(() => useBackfill());
        await act(async () => { await result.current.scan(); });
        await act(async () => { await result.current.run(); });

        expect(result.current.state.results[0].status).toBe('alreadyExists');
    });

    it('冪等命中但內容不一致 → 標成衝突,不可靜默跳過', async () => {
        // 本機這筆不良 50、停機 1 次;後端同鍵那筆卻是不良 7、停機 3 次
        // → 幾乎確定是另一筆單撞到同一個 Date.now() 鍵
        localStorage.setItem('productionHistory', JSON.stringify([record()]));
        mockInstance.post.mockResolvedValue({
            data: { id: 'guid-x', duplicated: true, defectQty: 7, stopCount: 3 },
        });

        const { result } = renderHook(() => useBackfill());
        await act(async () => { await result.current.scan(); });
        await act(async () => { await result.current.run(); });

        const outcome = result.current.state.results[0];
        expect(outcome.status).toBe('conflict');
        expect(outcome.detail).toContain('不良數');
        expect(outcome.detail).toContain('停機次數');
    });

    it('失敗要留下可讀的原因,不吞掉', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([record()]));
        mockInstance.post.mockRejectedValue({
            response: { status: 400, data: { error: '良品數不可為負' } },
        });

        const { result } = renderHook(() => useBackfill());
        await act(async () => { await result.current.scan(); });
        await act(async () => { await result.current.run(); });

        const outcome = result.current.state.results[0];
        expect(outcome.status).toBe('failed');
        expect(outcome.detail).toBe('良品數不可為負');
        expect(outcome.httpStatus).toBe(400);

        // 失敗的那筆不可以被標成 synced,否則下次掃描就漏掉了
        const stored = JSON.parse(localStorage.getItem('productionHistory'));
        expect(stored[0].syncState).not.toBe('synced');
    });

    it('撞到限流(429)是退避重試,不是失敗', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([record()]));
        let call = 0;
        mockInstance.post.mockImplementation(() => {
            call += 1;
            if (call === 1) return Promise.reject({ response: { status: 429 } });
            return Promise.resolve({ data: { id: 'guid-1' } });
        });

        vi.useFakeTimers({ shouldAdvanceTime: true });
        const { result } = renderHook(() => useBackfill());
        await act(async () => { await result.current.scan(); });

        const running = act(async () => { await result.current.run(); });
        await vi.advanceTimersByTimeAsync(6000);
        await running;
        vi.useRealTimers();

        expect(call).toBe(2);
        expect(result.current.state.results[0].status).toBe('created');
    });

    it('無法回填的紀錄列在 blocked,附原因', async () => {
        // 沒有 finishedAt 也沒有 date → 決定不出完工時間
        localStorage.setItem('productionHistory',
            JSON.stringify([record({ finishedAt: undefined, date: undefined })]));

        const { result } = renderHook(() => useBackfill());
        await act(async () => { await result.current.scan(); });

        expect(result.current.state.summary.pending).toBe(0);
        expect(result.current.state.summary.blocked).toHaveLength(1);
        expect(result.current.state.summary.blocked[0].reason).toContain('完工時間');
    });

    it('本機沒有任何紀錄時安全收場', async () => {
        const { result } = renderHook(() => useBackfill());
        await act(async () => { await result.current.scan(); });

        expect(result.current.state.summary.localTotal).toBe(0);
        expect(result.current.state.summary.pending).toBe(0);
    });

    it('有損轉換要出現在摘要裡', async () => {
        localStorage.setItem('productionHistory',
            JSON.stringify([record({ finishedAt: undefined })])); // 只有工廠日 → 時間是補的

        const { result } = renderHook(() => useBackfill());
        await act(async () => { await result.current.scan(); });

        await waitFor(() => expect(result.current.state.summary.issues.approximatedTime).toBe(1));
        expect(result.current.state.summary.issues.orderLinkLost).toBe(1);
    });
});
