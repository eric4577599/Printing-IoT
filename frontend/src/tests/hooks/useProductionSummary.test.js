import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// 以 mock 取代 axios(沿用專案既有寫法),讓 hook 走真正的 api.js。
const mockInstance = {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: null })),
    put: vi.fn(() => Promise.resolve({ data: null })),
    delete: vi.fn(() => Promise.resolve({ data: null })),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
    },
};

vi.mock('axios', () => ({
    default: { create: () => mockInstance },
}));

const { useProductionSummary } = await import('../../hooks/useProductionSummary');

/**
 * S8 / §3、§4:彙總資料來源的判斷(AC-16 ~ AC-18)。
 *
 * 這組測試守的是一條容易被「順手簡化」掉的規則:
 * 本機還有未回填的舊實績時,**不可以**採用後端彙總 ——
 * 那會讓彙總數字與逐筆明細互相矛盾。
 */

const BACKEND_SUMMARY = { totalOrders: 7, totalGood: 900, avgOEE: 71.4 };

describe('useProductionSummary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockInstance.get.mockResolvedValue({ data: BACKEND_SUMMARY });
    });

    it('AC-16 沒有本機殘留時採用後端彙總', async () => {
        const { result } = renderHook(() => useProductionSummary({
            kind: 'daily', from: '2026-03-01', to: '2026-03-31', localOnlyCount: 0,
        }));

        await waitFor(() => expect(result.current.source).toBe('backend'));

        expect(result.current.data).toEqual(BACKEND_SUMMARY);
        expect(result.current.reason).toBeNull();
        expect(mockInstance.get).toHaveBeenCalledWith(
            '/production/summary/daily',
            { params: { from: '2026-03-01', to: '2026-03-31' } }
        );
    });

    it('AC-17 有本機殘留時不採用後端彙總,而且連請求都不發', async () => {
        const { result } = renderHook(() => useProductionSummary({
            kind: 'daily', from: '2026-03-01', to: '2026-03-31', localOnlyCount: 3,
        }));

        await waitFor(() => expect(result.current.reason).toBe('localOnly'));

        expect(result.current.source).toBe('local');
        expect(result.current.data).toBeNull();
        // 打了也不能用,不該白費一次請求
        expect(mockInstance.get).not.toHaveBeenCalled();
    });

    it('AC-18 後端失敗時退回前端計算並標示降級', async () => {
        mockInstance.get.mockRejectedValue(new Error('boom'));

        const { result } = renderHook(() => useProductionSummary({
            kind: 'monthly', from: '2026-03-01', to: '2026-03-31', localOnlyCount: 0,
        }));

        await waitFor(() => expect(result.current.reason).toBe('error'));

        expect(result.current.source).toBe('local');
        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeInstanceOf(Error);
    });

    it('enabled 為 false 時不抓取,reason 為 disabled', async () => {
        const { result } = renderHook(() => useProductionSummary({
            kind: 'daily', from: '2026-03-01', to: '2026-03-31', enabled: false,
        }));

        expect(result.current.source).toBe('local');
        expect(result.current.reason).toBe('disabled');
        expect(mockInstance.get).not.toHaveBeenCalled();
    });

    it("班別 '全部' 是 UI 值,不往後端送", async () => {
        const { result } = renderHook(() => useProductionSummary({
            kind: 'daily', from: '2026-03-01', to: '2026-03-01', shift: '全部', localOnlyCount: 0,
        }));

        await waitFor(() => expect(result.current.source).toBe('backend'));

        expect(mockInstance.get).toHaveBeenCalledWith(
            '/production/summary/daily',
            { params: { from: '2026-03-01', to: '2026-03-01' } }
        );
    });

    it('切換區間時不得把上一次的結果配到新區間', async () => {
        mockInstance.get.mockResolvedValue({ data: { totalOrders: 1 } });

        const { result, rerender } = renderHook(
            ({ to }) => useProductionSummary({ kind: 'monthly', from: '2026-03-01', to, localOnlyCount: 0 }),
            { initialProps: { to: '2026-03-31' } }
        );

        await waitFor(() => expect(result.current.source).toBe('backend'));

        // 換到下個月:新結果還沒回來之前,不可以繼續回報 source = 'backend',
        // 否則畫面會拿三月的數字配四月的標題
        mockInstance.get.mockImplementation(() => new Promise(() => {}));
        rerender({ to: '2026-04-30' });

        expect(result.current.source).toBe('local');
        expect(result.current.data).toBeNull();
        expect(result.current.isLoading).toBe(true);
    });
});
