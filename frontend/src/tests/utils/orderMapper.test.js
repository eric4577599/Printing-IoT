import { describe, it, expect } from 'vitest';
import {
    toBackendOrder,
    fromBackendOrder,
    sortBySequence,
    isGuid,
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
