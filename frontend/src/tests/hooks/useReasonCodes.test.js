import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// 以 mock 取代 api 模組:只驗證 hook 對「成功 / 失敗 / 空清單」三種回應的行為
const getReasonCodes = vi.fn();
vi.mock('../../services/api', () => ({
    getReasonCodes: (...args) => getReasonCodes(...args),
}));

const { useReasonCodes } = await import('../../hooks/useReasonCodes');

/**
 * useReasonCodes 測試(S3 / F8,對應 AC-28)。
 *
 * 降級順序:後端 API(非空)→ localStorage 快取 → 元件內建 fallbackList。
 * 現場永遠要有原因可選,任何一層失敗都不得讓清單變空。
 */
describe('useReasonCodes(S3 / F8,AC-28)', () => {
    const FALLBACK = [
        { code: '001', name: '送紙歪斜' },
        { code: '002', name: '印刷不清' },
    ];

    beforeEach(() => {
        getReasonCodes.mockReset();
        localStorage.clear();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('API 回三筆 → 使用 API 資料', async () => {
        getReasonCodes.mockResolvedValue([
            { id: 'g1', code: 'X1', name: '自訂一', category: 'A' },
            { id: 'g2', code: 'X2', name: '自訂二', category: 'B' },
            { id: 'g3', code: 'X3', name: '自訂三', category: 'C' },
        ]);

        const { result } = renderHook(() => useReasonCodes('stop', FALLBACK));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(getReasonCodes).toHaveBeenCalledWith('stop');
        expect(result.current.reasons).toHaveLength(3);
        expect(result.current.reasons.map(r => r.code)).toEqual(['X1', 'X2', 'X3']);
        expect(result.current.error).toBeNull();
    });

    it('API 成功時把清單寫進 localStorage 當離線快取', async () => {
        getReasonCodes.mockResolvedValue([{ id: 'g1', code: 'X1', name: '自訂一', category: 'A' }]);

        const { result } = renderHook(() => useReasonCodes('stop', FALLBACK));
        await waitFor(() => expect(result.current.loading).toBe(false));

        const cached = JSON.parse(localStorage.getItem('stopReasonsList'));
        expect(cached).toHaveLength(1);
        expect(cached[0].code).toBe('X1');
    });

    it('不良原因使用 defectReasonsList 快取鍵', async () => {
        getReasonCodes.mockResolvedValue([{ id: 'd1', code: 'A01', name: '壓扁', category: 'General' }]);

        const { result } = renderHook(() => useReasonCodes('defect', []));
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(getReasonCodes).toHaveBeenCalledWith('defect');
        expect(JSON.parse(localStorage.getItem('defectReasonsList'))).toHaveLength(1);
    });

    it('API 拋錯 → 使用 fallback 且 error 為真', async () => {
        getReasonCodes.mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useReasonCodes('stop', FALLBACK));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.reasons.map(r => r.code)).toEqual(['001', '002']);
        expect(result.current.error).toBeTruthy();
    });

    it('API 回空陣列 → 使用 fallback 且 error 為真(主檔被清空也不能沒得選)', async () => {
        getReasonCodes.mockResolvedValue([]);

        const { result } = renderHook(() => useReasonCodes('stop', FALLBACK));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.reasons).toHaveLength(2);
        expect(result.current.error).toBeTruthy();
    });

    it('API 失敗但有 localStorage 快取 → 優先用快取(快取比內建預設新)', async () => {
        localStorage.setItem('stopReasonsList', JSON.stringify([
            { id: 'c1', code: 'C1', name: '快取原因', category: 'Cached' },
        ]));
        getReasonCodes.mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useReasonCodes('stop', FALLBACK));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.reasons).toHaveLength(1);
        expect(result.current.reasons[0].code).toBe('C1');
        expect(result.current.error).toBeTruthy();
    });

    it('舊格式快取({ id, reason })也能正規化成 { id, code, name, category }', async () => {
        localStorage.setItem('stopReasonsList', JSON.stringify([
            { id: '001', reason: '送紙歪斜 (Feed Skew)', category: 'Feed' },
        ]));
        getReasonCodes.mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useReasonCodes('stop', FALLBACK));
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.reasons[0]).toEqual({
            id: '001',
            code: '001',
            name: '送紙歪斜 (Feed Skew)',
            category: 'Feed',
        });
    });

    it('reload() 會重新打 API 並更新清單', async () => {
        getReasonCodes.mockResolvedValue([{ id: 'g1', code: 'X1', name: '第一版', category: 'A' }]);

        const { result } = renderHook(() => useReasonCodes('stop', FALLBACK));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.reasons[0].name).toBe('第一版');

        getReasonCodes.mockResolvedValue([
            { id: 'g1', code: 'X1', name: '第一版', category: 'A' },
            { id: 'g2', code: 'X2', name: '新增的', category: 'B' },
        ]);

        await result.current.reload();

        await waitFor(() => expect(result.current.reasons).toHaveLength(2));
        expect(getReasonCodes).toHaveBeenCalledTimes(2);
    });

    it('fallbackList 省略時不拋例外,清單為空但 error 為真', async () => {
        getReasonCodes.mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useReasonCodes('stop'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.reasons).toEqual([]);
        expect(result.current.error).toBeTruthy();
    });
});
