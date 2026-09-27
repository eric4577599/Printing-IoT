import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransientNotice, DEFAULT_NOTICE_MS } from '../../hooks/useTransientNotice';

/**
 * useTransientNotice 測試(B15)
 * 驗證:顯示 / 自動收起 / 新訊息取代舊訊息並重新計時 / 手動關閉 / 函式參照穩定
 */
describe('useTransientNotice', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('初始沒有訊息', () => {
        const { result } = renderHook(() => useTransientNotice());
        expect(result.current.notice).toBeNull();
    });

    it('顯示訊息,預設 tone 為 warn,時間到自動收起', () => {
        const { result } = renderHook(() => useTransientNotice());
        act(() => result.current.showNotice('速度不為 0'));
        expect(result.current.notice).toEqual({ text: '速度不為 0', tone: 'warn' });

        act(() => vi.advanceTimersByTime(DEFAULT_NOTICE_MS - 1));
        expect(result.current.notice).not.toBeNull();
        act(() => vi.advanceTimersByTime(1));
        expect(result.current.notice).toBeNull();
    });

    it('新訊息取代舊訊息,計時重新起算', () => {
        const { result } = renderHook(() => useTransientNotice(1000));
        act(() => result.current.showNotice('A'));
        act(() => vi.advanceTimersByTime(800));
        act(() => result.current.showNotice('B', 'info'));
        expect(result.current.notice).toEqual({ text: 'B', tone: 'info' });

        // 舊計時器若沒清掉,這裡(A 起算 1000ms)就會把 B 收掉
        act(() => vi.advanceTimersByTime(300));
        expect(result.current.notice).toEqual({ text: 'B', tone: 'info' });
        act(() => vi.advanceTimersByTime(700));
        expect(result.current.notice).toBeNull();
    });

    it('clearNotice 立即收起', () => {
        const { result } = renderHook(() => useTransientNotice());
        act(() => result.current.showNotice('A'));
        act(() => result.current.clearNotice());
        expect(result.current.notice).toBeNull();
    });

    it('函式參照穩定(keydown 閉包拿到的永遠可用)', () => {
        const { result, rerender } = renderHook(() => useTransientNotice());
        const { showNotice, clearNotice } = result.current;
        act(() => showNotice('A'));
        rerender();
        expect(result.current.showNotice).toBe(showNotice);
        expect(result.current.clearNotice).toBe(clearNotice);
    });

    it('卸載後計時器不再觸發', () => {
        const { result, unmount } = renderHook(() => useTransientNotice());
        act(() => result.current.showNotice('A'));
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });
});
