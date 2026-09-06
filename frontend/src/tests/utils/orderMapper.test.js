import { describe, it, expect } from 'vitest';
import {
    toBackendOrder,
    fromBackendOrder,
    sortBySequence,
    isGuid,
    isSchedulableBackendOrder,
    BACKEND_STATUS,
} from '../../utils/orderMapper';

// 對應 S2 Phase 2:排程訂單前後端對映(SpecJson 保存 BoxDiagram 規格、狀態數字化、排序)。

const richOrder = {
    id: 'ord_123',
    orderNo: 'O-1',
    customer: '客戶A',
    qty: 500,
    boxType: 'A Type',
    boxNo: 'BX-9',
    status: 'Queued',
    seqNo: 20,
    // BoxDiagram 規格欄位(後端無 typed 欄)
    boxLen: 300, boxWid: 200, boxHgt: 150,
    dimL1: 10, dimW1: 5, l1: 1, w1: 2, h1: 3,
    dieCutType: 'RSC', special: 'none',
};

describe('toBackendOrder', () => {
    it('對映核心欄位並把狀態轉為後端數字', () => {
        const be = toBackendOrder(richOrder, 3);
        expect(be).toMatchObject({
            orderNumber: 'O-1',
            customerName: '客戶A',
            quantity: 500,
            boxType: 'A Type',
            productCode: 'BX-9',        // 無 productCode 時退回 boxNo
            sequence: 3,
            status: BACKEND_STATUS.Pending, // 'Queued' → 0
        });
    });

    it('SpecJson 保存完整規格(不含 id)', () => {
        const be = toBackendOrder(richOrder, 3);
        const spec = JSON.parse(be.specJson);
        expect(spec.boxLen).toBe(300);
        expect(spec.dieCutType).toBe('RSC');
        expect(spec.id).toBeUndefined(); // id 不放進 SpecJson
    });

    it('Running → InProgress(1)', () => {
        expect(toBackendOrder({ ...richOrder, status: 'Running' }, 1).status).toBe(BACKEND_STATUS.InProgress);
    });

    it('未給 sequence 時退回 order.sequence 再退 0', () => {
        expect(toBackendOrder({ orderNo: 'X' }).sequence).toBe(0);
        expect(toBackendOrder({ orderNo: 'X', sequence: 7 }).sequence).toBe(7);
    });

    it('qty 非數字時歸零', () => {
        expect(toBackendOrder({ orderNo: 'X', qty: undefined }).quantity).toBe(0);
    });

    it('GUID id 會帶進 payload(供後端 upsert),非 GUID 暫時 id 不帶', () => {
        const guid = '11111111-1111-1111-1111-111111111111';
        expect(toBackendOrder({ orderNo: 'X', id: guid }, 0).id).toBe(guid);
        expect(toBackendOrder({ orderNo: 'X', id: 'ord_123' }, 0).id).toBeUndefined();
        expect(toBackendOrder({ orderNo: 'X', id: 'placeholder' }, 0).id).toBeUndefined();
    });
});

// S1 / DF-05:目標長度與楞別不再被鏡像同步歸零 —— 有值才送,沒有就整個鍵不輸出。
describe('toBackendOrder — 楞別與目標長度(DF-05)', () => {
    it('有 flute 時輸出 paperSpec', () => {
        const be = toBackendOrder({ ...richOrder, flute: 'AB' }, 0);
        expect(be.paperSpec).toBe('AB');
    });

    it('paperSpec 優先於 flute', () => {
        const be = toBackendOrder({ ...richOrder, flute: 'AB', paperSpec: 'BC' }, 0);
        expect(be.paperSpec).toBe('BC');
    });

    it('沒有楞別資訊時 payload 不含 paperSpec 鍵(後端收到 null → 不覆寫)', () => {
        const be = toBackendOrder(richOrder, 0);
        expect('paperSpec' in be).toBe(false);
    });

    it('楞別為空字串時同樣不輸出該鍵', () => {
        const be = toBackendOrder({ ...richOrder, flute: '' }, 0);
        expect('paperSpec' in be).toBe(false);
    });

    it('有 targetLength 時輸出數字', () => {
        const be = toBackendOrder({ ...richOrder, targetLength: 5000 }, 0);
        expect(be.targetLength).toBe(5000);
        expect(typeof be.targetLength).toBe('number');
    });

    it('targetLen 別名也能輸出', () => {
        expect(toBackendOrder({ ...richOrder, targetLen: '1200' }, 0).targetLength).toBe(1200);
    });

    it('沒有目標長度時 payload 不含 targetLength 鍵,不會送 0', () => {
        const be = toBackendOrder(richOrder, 0);
        expect('targetLength' in be).toBe(false);
    });

    it('目標長度非數值時不輸出該鍵', () => {
        expect('targetLength' in toBackendOrder({ ...richOrder, targetLength: 'abc' }, 0)).toBe(false);
    });
});

describe('isGuid', () => {
    it('辨識 GUID 字串', () => {
        expect(isGuid('11111111-1111-1111-1111-111111111111')).toBe(true);
        expect(isGuid('ABCDEF01-2345-6789-ABCD-EF0123456789')).toBe(true);
    });
    it('拒絕非 GUID', () => {
        expect(isGuid('ord_123')).toBe(false);
        expect(isGuid('placeholder')).toBe(false);
        expect(isGuid('')).toBe(false);
        expect(isGuid(123)).toBe(false);
        expect(isGuid(null)).toBe(false);
    });
});

describe('fromBackendOrder', () => {
    const backend = {
        id: '11111111-1111-1111-1111-111111111111',
        orderNumber: 'O-1',
        customerName: '客戶A',
        quantity: 500,
        boxType: 'A Type',
        status: 1, // InProgress(數字序列化)
        sequence: 2,
        specJson: JSON.stringify({ orderNo: 'O-1', boxNo: 'BX-9', boxLen: 300, dieCutType: 'RSC' }),
    };

    it('以 SpecJson 還原 BoxDiagram 規格', () => {
        const fe = fromBackendOrder(backend);
        expect(fe.boxLen).toBe(300);
        expect(fe.dieCutType).toBe('RSC');
    });

    it('後端 GUID 覆蓋為 id 身分真相', () => {
        expect(fromBackendOrder(backend).id).toBe('11111111-1111-1111-1111-111111111111');
    });

    it('狀態數字還原為前端字串(1 → Running)', () => {
        expect(fromBackendOrder(backend).status).toBe('Running');
    });

    it('附上 _sequence 供排序', () => {
        expect(fromBackendOrder(backend)._sequence).toBe(2);
    });

    it('SpecJson 損毀或缺漏時不丟例外,核心欄位仍可用', () => {
        const fe = fromBackendOrder({ ...backend, specJson: '{bad json' });
        expect(fe.orderNo).toBe('O-1');
        expect(fe.customer).toBe('客戶A');
        expect(fe.id).toBe(backend.id);
    });

    it('狀態以字串形式進來也能還原(防未來加 enum converter)', () => {
        expect(fromBackendOrder({ ...backend, status: 'Completed' }).status).toBe('Completed');
    });
});

describe('fromBackendOrder — 楞別與目標長度還原(DF-05)', () => {
    it('以後端 typed 欄位還原 paperSpec 與 targetLength', () => {
        const fe = fromBackendOrder({
            id: '11111111-1111-1111-1111-111111111111',
            orderNumber: 'O-1',
            paperSpec: 'AB',
            targetLength: 5000,
            specJson: JSON.stringify({ paperSpec: 'BC', targetLength: 999 }),
        });
        expect(fe.paperSpec).toBe('AB');
        expect(fe.targetLength).toBe(5000);
    });

    it('後端值為空時退回 SpecJson 的值', () => {
        const fe = fromBackendOrder({
            id: '11111111-1111-1111-1111-111111111111',
            orderNumber: 'O-1',
            paperSpec: '',
            specJson: JSON.stringify({ paperSpec: 'BC', targetLength: 999 }),
        });
        expect(fe.paperSpec).toBe('BC');
        expect(fe.targetLength).toBe(999);
    });

    it('兩邊都沒有時給預設值', () => {
        const fe = fromBackendOrder({ id: 'x', orderNumber: 'O-1' });
        expect(fe.paperSpec).toBe('');
        expect(fe.targetLength).toBe(0);
    });

    it('flute 仍由 SpecJson 還原(不被 paperSpec 影響)', () => {
        const fe = fromBackendOrder({
            id: 'x',
            orderNumber: 'O-1',
            paperSpec: 'AB',
            specJson: JSON.stringify({ flute: 'E' }),
        });
        expect(fe.flute).toBe('E');
        expect(fe.paperSpec).toBe('AB');
    });
});

describe('round-trip(前端 → 後端 → 前端)', () => {
    it('規格與核心欄位在來回後保持一致', () => {
        const be = toBackendOrder(richOrder, 5);
        // 模擬後端回傳(帶 GUID id)
        const fe = fromBackendOrder({ ...be, id: 'guid-abc' });
        expect(fe.id).toBe('guid-abc');
        expect(fe.orderNo).toBe('O-1');
        expect(fe.qty).toBe(500);
        expect(fe.boxLen).toBe(300);
        expect(fe.dieCutType).toBe('RSC');
        expect(fe.status).toBe('Queued'); // 0 → Queued
        expect(fe._sequence).toBe(5);
    });
});

describe('sortBySequence', () => {
    it('依 _sequence 升冪排序', () => {
        const out = sortBySequence([
            { id: 'c', _sequence: 30 },
            { id: 'a', _sequence: 10 },
            { id: 'b', _sequence: 20 },
        ]);
        expect(out.map(o => o.id)).toEqual(['a', 'b', 'c']);
    });

    it('不變動原陣列', () => {
        const src = [{ id: 'b', _sequence: 20 }, { id: 'a', _sequence: 10 }];
        sortBySequence(src);
        expect(src.map(o => o.id)).toEqual(['b', 'a']);
    });
});

// ── S1 / v2.0:載入端過濾(AC-31)────────────────────────────────────────────
// 完工單改以狀態留在後端而非刪除,載入端必須把 Completed / Cancelled 濾掉,
// 否則它會在下次開頁以「執行中」回到佇列頭部。
describe('isSchedulableBackendOrder(AC-31)', () => {
    // AC-31a:完工/取消不入列
    it('Completed(3)、Cancelled(4) 與其字串形式皆回 false', () => {
        expect(isSchedulableBackendOrder({ status: 3 })).toBe(false);
        expect(isSchedulableBackendOrder({ status: 4 })).toBe(false);
        expect(isSchedulableBackendOrder({ status: 'Completed' })).toBe(false);
        expect(isSchedulableBackendOrder({ status: 'Cancelled' })).toBe(false);
    });

    // AC-31b:寬鬆策略 —— 認不出來的狀態照樣入列
    it('生產中狀態、缺漏狀態與未知狀態皆回 true', () => {
        expect(isSchedulableBackendOrder({ status: 0 })).toBe(true);
        expect(isSchedulableBackendOrder({ status: 1 })).toBe(true);
        expect(isSchedulableBackendOrder({ status: 2 })).toBe(true);
        expect(isSchedulableBackendOrder({ status: 'Pending' })).toBe(true);
        expect(isSchedulableBackendOrder({})).toBe(true);
        expect(isSchedulableBackendOrder({ status: 99 })).toBe(true);
    });

    // AC-31c:與 fromBackendOrder 組合的載入鏈
    it('後端三筆(Pending / InProgress / Completed)過濾後只剩 2 筆,不含完工單', () => {
        const be = [
            { id: '11111111-1111-1111-1111-111111111111', orderNumber: 'P-1', status: BACKEND_STATUS.Pending, sequence: 0 },
            { id: '22222222-2222-2222-2222-222222222222', orderNumber: 'P-2', status: BACKEND_STATUS.InProgress, sequence: 1 },
            { id: '33333333-3333-3333-3333-333333333333', orderNumber: 'P-3', status: BACKEND_STATUS.Completed, sequence: 2 },
        ];

        const mapped = be.filter(isSchedulableBackendOrder).map(fromBackendOrder);

        expect(mapped).toHaveLength(2);
        expect(mapped.map(o => o.orderNo)).toEqual(['P-1', 'P-2']);
        expect(mapped.some(o => o.orderNo === 'P-3')).toBe(false);
    });
});
