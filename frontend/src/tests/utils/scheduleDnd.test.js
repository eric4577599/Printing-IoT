import { describe, it, expect } from 'vitest';
import { spliceMove, renumberSeq, resolveDragReorder } from '../../utils/scheduleDnd';

// 對應規格 docs/spec20260713-1.md §S2(排程列表拖拉排序)的驗收標準 AC-S2-1~4、6。

const makeOrders = () => [
    { id: 'ord_run', orderNo: 'R-0', seqNo: 10, customer: 'A' }, // index 0:執行中(鎖定)
    { id: 'ord_1', orderNo: 'O-1', seqNo: 20, customer: 'B' },
    { id: 'ord_2', orderNo: 'O-2', seqNo: 30, customer: 'C' },
    { id: 'ord_3', orderNo: 'O-3', seqNo: 40, customer: 'D' },
];

describe('spliceMove', () => {
    it('把元素向後搬移(from 1 → to 3)', () => {
        expect(spliceMove(['a', 'b', 'c', 'd'], 1, 3)).toEqual(['a', 'c', 'd', 'b']);
    });

    it('把元素向前搬移(from 3 → to 1)', () => {
        expect(spliceMove(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    });

    it('相鄰搬移結果與「交換」相同(確保不影響上/下移按鈕)', () => {
        // 相鄰交換 [a,b] → [b,a];splice 兩個方向皆應得同結果
        expect(spliceMove(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'c', 'b']);
        expect(spliceMove(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
    });

    it('from === to 不變動', () => {
        expect(spliceMove(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
    });

    it('索引越界回傳原陣列淺拷貝,不變動', () => {
        expect(spliceMove(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
        expect(spliceMove(['a', 'b'], -1, 1)).toEqual(['a', 'b']);
    });

    it('不變動原始陣列(回傳新陣列)', () => {
        const src = ['a', 'b', 'c'];
        const out = spliceMove(src, 0, 2);
        expect(src).toEqual(['a', 'b', 'c']);
        expect(out).not.toBe(src);
    });
});

describe('renumberSeq', () => {
    it('依序重新編號 seqNo 為 10,20,30…(AC-S2-4)', () => {
        const orders = [
            { id: 'x', seqNo: 999 },
            { id: 'y', seqNo: 5 },
            { id: 'z', seqNo: 40 },
        ];
        expect(renumberSeq(orders).map(o => o.seqNo)).toEqual([10, 20, 30]);
    });

    it('保留 id 與其餘欄位', () => {
        const orders = [{ id: 'a', customer: 'K', qty: 500, seqNo: 1 }];
        const out = renumberSeq(orders);
        expect(out[0]).toMatchObject({ id: 'a', customer: 'K', qty: 500, seqNo: 10 });
    });

    it('不變動原始物件', () => {
        const orders = [{ id: 'a', seqNo: 1 }];
        renumberSeq(orders);
        expect(orders[0].seqNo).toBe(1);
    });
});

describe('resolveDragReorder', () => {
    it('一般列拖到另一般列 → 允許(AC-S2-1)', () => {
        const orders = makeOrders();
        expect(resolveDragReorder(orders, 'ord_3', 'ord_1')).toEqual({
            allowed: true,
            oldIndex: 3,
            newIndex: 1,
        });
    });

    it('來源為執行中訂單(index 0)→ 忽略(AC-S2-2)', () => {
        const orders = makeOrders();
        expect(resolveDragReorder(orders, 'ord_run', 'ord_2').allowed).toBe(false);
    });

    it('目標為執行中訂單(index 0)→ 忽略,不可插到其前(AC-S2-2)', () => {
        const orders = makeOrders();
        expect(resolveDragReorder(orders, 'ord_2', 'ord_run').allowed).toBe(false);
    });

    it('來源與目標相同 → 忽略', () => {
        const orders = makeOrders();
        expect(resolveDragReorder(orders, 'ord_2', 'ord_2').allowed).toBe(false);
    });

    it('找不到的 id → 忽略', () => {
        const orders = makeOrders();
        expect(resolveDragReorder(orders, 'nope', 'ord_1').allowed).toBe(false);
        expect(resolveDragReorder(orders, 'ord_1', 'nope').allowed).toBe(false);
    });

    it('id 型別不同(數字 vs 字串)仍能比對', () => {
        const orders = [{ id: 0 }, { id: 1 }, { id: 2 }];
        // index 0 鎖定 → 以字串 '1'→'2' 應允許
        expect(resolveDragReorder(orders, '1', '2')).toEqual({
            allowed: true,
            oldIndex: 1,
            newIndex: 2,
        });
    });
});

describe('端對端組合(解析 → 搬移 → 重新編號)', () => {
    it('拖第 4 列到第 2 列後,順序更新且 seqNo 連續(AC-S2-1 + AC-S2-4)', () => {
        const orders = makeOrders();
        const { allowed, oldIndex, newIndex } = resolveDragReorder(orders, 'ord_3', 'ord_1');
        expect(allowed).toBe(true);

        const moved = spliceMove(orders, oldIndex, newIndex);
        expect(moved.map(o => o.id)).toEqual(['ord_run', 'ord_3', 'ord_1', 'ord_2']);

        const renumbered = renumberSeq(moved);
        expect(renumbered.map(o => o.seqNo)).toEqual([10, 20, 30, 40]);
        // 執行中訂單仍在首位
        expect(renumbered[0].id).toBe('ord_run');
    });

    it('嘗試把一般列拖到執行中訂單之前 → 順序不變(AC-S2-2)', () => {
        const orders = makeOrders();
        const { allowed } = resolveDragReorder(orders, 'ord_2', 'ord_run');
        expect(allowed).toBe(false);
        // 不執行搬移,順序維持原樣
        expect(orders.map(o => o.id)).toEqual(['ord_run', 'ord_1', 'ord_2', 'ord_3']);
    });
});
