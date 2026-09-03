// 排程佇列的純函式變換(S1 / v2.0)。
//
// 背景:DF-04 拿掉「全量鏡像刪除」之後,完工單不再會從後端消失,
// 若不回寫狀態,下次開頁就會以「執行中」回到佇列頭部。
// 本模組把 Dashboard 的三條佇列變換抽成純函式,並在完工路徑補上狀態回寫,
// 方便單元測試釘住「GUID 訂單不會無聲流失」這個不變式。
//
// 原則:只做陣列運算與(完工時)一次盡力而為的狀態回寫;
// 計時器歸零、MQTT publish、setResetOffset、clearCurrentOrder 等 side effect 一律留在 Dashboard。

import { BACKEND_STATUS, isGuid } from './orderMapper';

/**
 * 完工推進:把隊首訂單移出佇列。
 * @param {Array<Object>} orders 目前排程佇列
 * @returns {{ nextOrders: Array<Object>, finishedOrder: Object|null }}
 *          nextOrders = orders.slice(1);orders 非陣列或為空時回 { nextOrders: [], finishedOrder: null }
 */
export function advanceQueueOnFinish(orders) {
    if (!Array.isArray(orders) || orders.length === 0) {
        return { nextOrders: [], finishedOrder: null };
    }
    return { nextOrders: orders.slice(1), finishedOrder: orders[0] };
}

/**
 * 完工推進並回寫後端狀態(依賴以參數注入,便於測試)。
 * @param {Array<Object>} orders 目前排程佇列
 * @param {{ updateStatus?: (id: string, status: number) => Promise<any> }} deps
 *        updateStatus 未提供時只做佇列推進、不回寫
 * @returns {{ nextOrders: Array<Object>, finishedOrder: Object|null }} 與 advanceQueueOnFinish 相同
 * 邏輯:推進佇列;若 isGuid(finishedOrder.id) 為真且 updateStatus 有提供,
 *       以 (id, BACKEND_STATUS.Completed) 呼叫之,並掛 .catch 只 console.warn。
 *       本函式同步回傳,絕不因回寫失敗而拋出或改變 nextOrders。
 */
export function finishHeadOrder(orders, deps = {}) {
    const { nextOrders, finishedOrder } = advanceQueueOnFinish(orders);
    const updateStatus = deps && deps.updateStatus;

    if (finishedOrder && isGuid(finishedOrder.id) && typeof updateStatus === 'function') {
        try {
            const pending = updateStatus(finishedOrder.id, BACKEND_STATUS.Completed);
            if (pending && typeof pending.catch === 'function') {
                // 盡力而為:回寫失敗不阻塞 UI,該筆下次開頁會回到佇列,使用者可再完工一次
                pending.catch((err) => {
                    console.warn('[orders] 完工狀態回寫失敗(不阻塞 UI)', err);
                });
            }
        } catch (err) {
            console.warn('[orders] 完工狀態回寫呼叫失敗(不阻塞 UI)', err);
        }
    }

    return { nextOrders, finishedOrder };
}

/**
 * F3 placeholder 遞補:把 selectedOrderId 那筆移到隊首並吃掉 placeholder。
 * @param {Array<Object>} orders 目前排程佇列(index 0 應為 placeholder)
 * @param {string} selectedOrderId 使用者選取的訂單 id
 * @returns {Array<Object>} 新陣列;找不到或 idx <= 0 時回傳輸入的淺拷貝(不動)
 * 邏輯:next[0] = { ...orders[idx], status: 'Running' };next.splice(idx, 1)。
 *       被移除的是 index 0 的 placeholder(已被覆寫),GUID 訂單集合不變。
 */
export function promoteSelectedToHead(orders, selectedOrderId) {
    const next = Array.isArray(orders) ? [...orders] : [];
    const idx = next.findIndex(o => o && o.id === selectedOrderId);
    if (idx <= 0) return next;

    const selected = next[idx];
    next[0] = { ...selected, status: 'Running' };
    next.splice(idx, 1);
    return next;
}

/**
 * F10 退回:把當前工單退回佇列。
 * @param {Array<Object>} orders 目前排程佇列(index 0 應為非 placeholder 的當前工單)
 * @param {{ autoNext: boolean, placeholder: Object }} options autoNext 為真且佇列多於一筆時走交換分支
 * @returns {Array<Object>} 新陣列;輸入為空時回傳空陣列
 * 邏輯:returnedOrder = { ...orders[0], status: 'Queued' };
 *       autoNext 且長度 > 1 → next[0] = { ...orders[1], status: 'Running' }、next[1] = returnedOrder;
 *       否則 → 於隊首插入 placeholder、next[1] = returnedOrder。
 *       兩個分支都沒有元素被移除,GUID 訂單集合不變。
 */
export function returnCurrentToQueue(orders, options = {}) {
    const next = Array.isArray(orders) ? [...orders] : [];
    if (next.length === 0) return next;

    const { autoNext = false, placeholder } = options;
    const returnedOrder = { ...next[0], status: 'Queued' };

    if (autoNext && next.length > 1) {
        next[0] = { ...next[1], status: 'Running' };
        next[1] = returnedOrder;
    } else {
        next.splice(0, 0, placeholder);
        next[1] = returnedOrder;
    }

    return next;
}
