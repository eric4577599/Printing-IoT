import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    advanceQueueOnFinish,
    finishHeadOrder,
    promoteSelectedToHead,
    returnCurrentToQueue,
} from '../../utils/orderQueue';
import { isGuid, BACKEND_STATUS } from '../../utils/orderMapper';

// 對應 S1 / v2.0(§9.3.1):完工回寫狀態 + F3/F10 佇列變換的行為保持重構。
// 核心不變式:F3 / F10 之後,GUID 訂單集合不多不少(不能有訂單無聲流失)。

const A = { id: '11111111-1111-1111-1111-111111111111', orderNo: 'A', status: 'Running' };
const B = { id: '22222222-2222-2222-2222-222222222222', orderNo: 'B', status: 'Queued' };
const C = { id: '33333333-3333-3333-3333-333333333333', orderNo: 'C', status: 'Queued' };
const PLACEHOLDER = { id: 'placeholder', boxNo: 'WAITING', orderNo: '-', qty: 0, status: 'Idle' };

/** 取出陣列中所有 GUID id 所成集合(供不變式比對)。 */
const guidIds = (orders) => new Set(orders.filter(o => isGuid(o.id)).map(o => o.id));

describe('advanceQueueOnFinish(AC-30a)', () => {
    it('多筆佇列:隊首為完工單,其餘往前遞補', () => {
        const { nextOrders, finishedOrder } = advanceQueueOnFinish([A, B, C]);
        expect(finishedOrder).toBe(A);
        expect(nextOrders).toEqual([B, C]);
    });

    it('只剩一筆:完工後佇列為空', () => {
        const { nextOrders, finishedOrder } = advanceQueueOnFinish([A]);
        expect(finishedOrder).toBe(A);
        expect(nextOrders).toEqual([]);
    });

    it('空陣列與 undefined 皆不拋錯,回 { nextOrders: [], finishedOrder: null }', () => {
        expect(advanceQueueOnFinish([])).toEqual({ nextOrders: [], finishedOrder: null });
        expect(advanceQueueOnFinish(undefined)).toEqual({ nextOrders: [], finishedOrder: null });
    });
});

describe('finishHeadOrder 狀態回寫(AC-30b/c/d)', () => {
    let warnSpy;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    // AC-30b:隊首為 GUID → 以 (id, 3) 恰好呼叫一次
    it('隊首 id 為 GUID 時以 (id, Completed) 呼叫 updateStatus 一次', () => {
        const updateStatus = vi.fn(() => Promise.resolve());

        const { nextOrders, finishedOrder } = finishHeadOrder([A, B], { updateStatus });

        expect(updateStatus).toHaveBeenCalledTimes(1);
        expect(updateStatus).toHaveBeenCalledWith(A.id, BACKEND_STATUS.Completed);
        expect(BACKEND_STATUS.Completed).toBe(3);
        expect(finishedOrder).toBe(A);
        expect(nextOrders).toEqual([B]);
    });

    // AC-30c:非 GUID(placeholder)或空佇列 → 完全不呼叫
    it('隊首為 placeholder 或佇列為空時不呼叫 updateStatus', () => {
        const updateStatus = vi.fn(() => Promise.resolve());

        finishHeadOrder([PLACEHOLDER, B], { updateStatus });
        finishHeadOrder([], { updateStatus });

        expect(updateStatus).not.toHaveBeenCalled();
    });

    it('未注入 updateStatus 時只做佇列推進,不拋錯', () => {
        expect(() => finishHeadOrder([A, B])).not.toThrow();
        expect(finishHeadOrder([A, B]).nextOrders).toEqual([B]);
    });

    // AC-30d:回寫失敗不拋出、不產生 unhandled rejection
    it('updateStatus 回傳 rejected promise 時不拋出,nextOrders 仍為 slice(1)', async () => {
        const updateStatus = vi.fn(() => Promise.reject(new Error('network down')));

        let result;
        expect(() => { result = finishHeadOrder([A, B], { updateStatus }); }).not.toThrow();
        expect(result.nextOrders).toEqual([B]);

        // 讓 microtask 佇列跑完,確認 rejection 已被 .catch 收掉(否則會變成 unhandled rejection)
        await Promise.resolve();
        await Promise.resolve();
        expect(warnSpy).toHaveBeenCalled();
    });

    it('updateStatus 同步拋出時也不影響佇列推進', () => {
        const updateStatus = vi.fn(() => { throw new Error('boom'); });

        const { nextOrders } = finishHeadOrder([A, B], { updateStatus });

        expect(nextOrders).toEqual([B]);
        expect(warnSpy).toHaveBeenCalled();
    });
});

describe('promoteSelectedToHead(AC-33a/b)', () => {
    // AC-33a
    it('把選取的訂單移到隊首並吃掉 placeholder', () => {
        const out = promoteSelectedToHead([PLACEHOLDER, A, B], B.id);

        expect(out).toHaveLength(2);
        expect(out[0]).toEqual({ ...B, status: 'Running' });
        expect(out[1]).toEqual(A);
        expect(out.some(o => o.id === 'placeholder')).toBe(false);
    });

    // AC-33b
    it('找不到選取 id、或該筆已在 index 0 時,內容與輸入相同', () => {
        const src = [PLACEHOLDER, A, B];

        expect(promoteSelectedToHead(src, 'not-exist')).toEqual(src);
        expect(promoteSelectedToHead(src, PLACEHOLDER.id)).toEqual(src);
    });

    it('不變動原陣列', () => {
        const src = [PLACEHOLDER, A, B];
        promoteSelectedToHead(src, B.id);
        expect(src).toEqual([PLACEHOLDER, A, B]);
    });
});

describe('returnCurrentToQueue(AC-33c/d/e)', () => {
    // AC-33c
    it('autoNext 且佇列多於一筆 → 與次筆交換,長度不變且無 placeholder', () => {
        const out = returnCurrentToQueue([A, B], { autoNext: true, placeholder: PLACEHOLDER });

        expect(out).toHaveLength(2);
        expect(out[0]).toEqual({ ...B, status: 'Running' });
        expect(out[1]).toEqual({ ...A, status: 'Queued' });
        expect(out.some(o => o.id === 'placeholder')).toBe(false);
    });

    // AC-33d
    it('手動退回 → 隊首插入 placeholder,長度加一', () => {
        const out = returnCurrentToQueue([A, B], { autoNext: false, placeholder: PLACEHOLDER });

        expect(out).toHaveLength(3);
        expect(out[0]).toEqual(PLACEHOLDER);
        expect(out[1]).toEqual({ ...A, status: 'Queued' });
        expect(out[2]).toEqual(B);
    });

    // AC-33e
    it('autoNext 但只剩一筆時走手動分支', () => {
        const out = returnCurrentToQueue([A], { autoNext: true, placeholder: PLACEHOLDER });

        expect(out).toHaveLength(2);
        expect(out[0]).toEqual(PLACEHOLDER);
        expect(out[1]).toEqual({ ...A, status: 'Queued' });
    });

    it('空佇列回空陣列,不拋錯', () => {
        expect(returnCurrentToQueue([], { autoNext: false, placeholder: PLACEHOLDER })).toEqual([]);
    });
});

// AC-32:P3 / P4 的不變式 —— GUID 訂單集合不多不少
describe('GUID 訂單不會無聲流失(AC-32)', () => {
    it('promoteSelectedToHead 前後的 GUID 集合完全相同', () => {
        const src = [PLACEHOLDER, A, B, C];
        expect(guidIds(promoteSelectedToHead(src, C.id))).toEqual(guidIds(src));
    });

    it('returnCurrentToQueue(autoNext) 前後的 GUID 集合完全相同', () => {
        const src = [A, B, C];
        const out = returnCurrentToQueue(src, { autoNext: true, placeholder: PLACEHOLDER });
        expect(guidIds(out)).toEqual(guidIds(src));
    });

    it('returnCurrentToQueue(手動) 前後的 GUID 集合完全相同', () => {
        const src = [A, B, C];
        const out = returnCurrentToQueue(src, { autoNext: false, placeholder: PLACEHOLDER });
        expect(guidIds(out)).toEqual(guidIds(src));
    });
});
