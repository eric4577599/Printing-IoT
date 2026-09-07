import { describe, it, expect, vi } from 'vitest';
import {
    classifyFailure,
    nextDelayMs,
    sendCompletionWithRetry,
    DEFAULT_RETRY_DELAYS_MS,
    RATE_LIMIT_FALLBACK_MS,
    MAX_RETRY_AFTER_MS,
} from '../../utils/completionRetry';

/** 造一個 axios 風格的錯誤 */
const httpError = (status, headers = {}) => ({ response: { status, headers } });

describe('classifyFailure — 該不該重試', () => {
    it('斷網(沒有 response)要重試', () => {
        expect(classifyFailure(new Error('Network Error'))).toEqual({ retry: true, reason: 'network' });
    });

    it('429 / 408 / 5xx 要重試', () => {
        expect(classifyFailure(httpError(429)).retry).toBe(true);
        expect(classifyFailure(httpError(408)).retry).toBe(true);
        expect(classifyFailure(httpError(500)).retry).toBe(true);
        expect(classifyFailure(httpError(502)).retry).toBe(true);
        expect(classifyFailure(httpError(503)).retry).toBe(true);
    });

    it('401 要重試 —— 作業員可能正在別處重新登入', () => {
        expect(classifyFailure(httpError(401))).toEqual({ retry: true, reason: 'unauthorized' });
    });

    it('400 / 403 / 409 不重試 —— 重送同樣內容只會得到同樣的拒絕', () => {
        expect(classifyFailure(httpError(400))).toEqual({ retry: false, reason: 'http400' });
        expect(classifyFailure(httpError(403)).retry).toBe(false);
        expect(classifyFailure(httpError(409)).retry).toBe(false);
    });
});

describe('nextDelayMs — 等多久', () => {
    it('依階梯遞增,用完回 0', () => {
        const err = httpError(500);
        expect(nextDelayMs(err, 0)).toBe(DEFAULT_RETRY_DELAYS_MS[0]);
        expect(nextDelayMs(err, 1)).toBe(DEFAULT_RETRY_DELAYS_MS[1]);
        expect(nextDelayMs(err, 2)).toBe(DEFAULT_RETRY_DELAYS_MS[2]);
        expect(nextDelayMs(err, 3)).toBe(0);
    });

    it('429 帶 Retry-After 時以伺服器說的為準', () => {
        expect(nextDelayMs(httpError(429, { 'retry-after': '7' }), 0)).toBe(7000);
    });

    it('429 沒帶 Retry-After 時用固定退避', () => {
        expect(nextDelayMs(httpError(429), 0)).toBe(RATE_LIMIT_FALLBACK_MS);
        expect(nextDelayMs(httpError(429, { 'retry-after': 'later' }), 0)).toBe(RATE_LIMIT_FALLBACK_MS);
    });

    it('Retry-After 再長也夾在上限內 —— 一筆不得卡死整條路徑', () => {
        expect(nextDelayMs(httpError(429, { 'retry-after': '3600' }), 0)).toBe(MAX_RETRY_AFTER_MS);
    });

    it('階梯用完時,即使 429 也不再等', () => {
        expect(nextDelayMs(httpError(429, { 'retry-after': '5' }), DEFAULT_RETRY_DELAYS_MS.length)).toBe(0);
    });
});

describe('sendCompletionWithRetry', () => {
    const payload = { clientRecordId: '1757000000000', goodQty: 100 };
    const noSleep = vi.fn().mockResolvedValue(undefined);

    it('一次就成功時不重試', async () => {
        const send = vi.fn().mockResolvedValue({ id: 'be-1' });
        const out = await sendCompletionWithRetry(payload, { send, sleep: noSleep });

        expect(out.ok).toBe(true);
        expect(out.result).toEqual({ id: 'be-1' });
        expect(out.attempts).toBe(1);
        expect(send).toHaveBeenCalledTimes(1);
    });

    it('暫時性失敗後成功 —— 這正是原本會永遠留在 pending 的那一筆', async () => {
        const send = vi.fn()
            .mockRejectedValueOnce(httpError(502))
            .mockResolvedValueOnce({ id: 'be-2' });
        const sleep = vi.fn().mockResolvedValue(undefined);

        const out = await sendCompletionWithRetry(payload, { send, sleep });

        expect(out.ok).toBe(true);
        expect(out.attempts).toBe(2);
        expect(sleep).toHaveBeenCalledWith(DEFAULT_RETRY_DELAYS_MS[0]);
    });

    it('每次重送的都是同一個 payload —— 冪等鍵不變才不會長出第二筆', async () => {
        const send = vi.fn()
            .mockRejectedValueOnce(httpError(500))
            .mockRejectedValueOnce(httpError(500))
            .mockResolvedValueOnce({ id: 'be-3' });

        await sendCompletionWithRetry(payload, { send, sleep: noSleep });

        expect(send).toHaveBeenCalledTimes(3);
        for (const call of send.mock.calls) {
            expect(call[0].clientRecordId).toBe('1757000000000');
        }
    });

    it('不可重試的錯誤立刻放棄,不浪費時間拖慢換單', async () => {
        const send = vi.fn().mockRejectedValue(httpError(400));
        const sleep = vi.fn();

        const out = await sendCompletionWithRetry(payload, { send, sleep });

        expect(out.ok).toBe(false);
        expect(out.reason).toBe('http400');
        expect(out.attempts).toBe(1);
        expect(sleep).not.toHaveBeenCalled();
    });

    it('重試用盡後回失敗,而不是無限重試', async () => {
        const send = vi.fn().mockRejectedValue(httpError(503));

        const out = await sendCompletionWithRetry(payload, { send, sleep: noSleep });

        expect(out.ok).toBe(false);
        expect(out.reason).toBe('serverError');
        expect(send).toHaveBeenCalledTimes(DEFAULT_RETRY_DELAYS_MS.length + 1);
    });

    it('元件卸載後停止重試', async () => {
        const send = vi.fn().mockRejectedValue(httpError(500));
        let unmounted = false;
        const sleep = vi.fn().mockImplementation(async () => { unmounted = true; });

        const out = await sendCompletionWithRetry(payload, {
            send,
            sleep,
            isCancelled: () => unmounted,
        });

        expect(out.ok).toBe(false);
        expect(out.reason).toBe('cancelled');
        expect(send).toHaveBeenCalledTimes(1);
    });

    it('絕不 reject —— 完工路徑不能因為送不出去就炸掉', async () => {
        const send = vi.fn().mockRejectedValue(new Error('boom'));
        await expect(sendCompletionWithRetry(payload, { send, sleep: noSleep })).resolves.toBeTruthy();

        const out = await sendCompletionWithRetry(payload, {});
        expect(out.ok).toBe(false);
        expect(out.reason).toBe('noSender');
    });

    it('onAttempt 把每次重試的原因與等待時間報出來(不靜默)', async () => {
        const send = vi.fn()
            .mockRejectedValueOnce(httpError(429, { 'retry-after': '3' }))
            .mockResolvedValueOnce({ id: 'be-4' });
        const onAttempt = vi.fn();

        await sendCompletionWithRetry(payload, { send, sleep: noSleep, onAttempt });

        expect(onAttempt).toHaveBeenCalledWith(
            expect.objectContaining({ phase: 'retrying', reason: 'rateLimited', delayMs: 3000 })
        );
        expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ phase: 'succeeded' }));
    });
});
