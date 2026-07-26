// 排程列表拖拉排序(Drag & Drop)的純函式核心。
// 與 React / dnd-kit 解耦,方便單元測試;UI 層(Schedule.jsx)與狀態層(MainLayout.jsx)皆呼叫此處。

/**
 * 將陣列元素從 from 位置搬移到 to 位置(splice 搬移,非相鄰交換)。
 * - 相鄰移動(|from-to|===1)結果與「交換」相同,故可安全取代原本的 swap 版 moveOrder。
 * - from/to 相等或越界時回傳原陣列的淺拷貝(不變動)。
 * @param {Array} arr 原陣列
 * @param {number} from 來源索引
 * @param {number} to 目標索引
 * @returns {Array} 搬移後的新陣列
 */
export function spliceMove(arr, from, to) {
    if (from === to) return [...arr];
    if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return [...arr];
    const next = [...arr];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}

/**
 * 依目前排列重新編號 seqNo 為 10, 20, 30…(保留 id 與其餘欄位)。
 * @param {Array<Object>} orders 訂單陣列
 * @returns {Array<Object>} 重新編號後的新陣列
 */
export function renumberSeq(orders) {
    return orders.map((o, index) => ({ ...o, seqNo: (index + 1) * 10 }));
}

/**
 * 解析一次拖拉放開事件,套用排程商規並回傳是否可執行與來源/目標索引。
 * 商規:
 *  - 找不到 active/over 對應的訂單 id → 不動作
 *  - 來源與目標相同 → 不動作
 *  - 來源或目標為 index 0(執行中訂單鎖定,不可移動、也不可被插到其前)→ 不動作
 * @param {Array<Object>} orders 訂單陣列(需含 id)
 * @param {string|number} activeId 被拖拉列的 id
 * @param {string|number} overId 放開時所在列的 id
 * @returns {{ allowed: boolean, oldIndex: number, newIndex: number }}
 */
export function resolveDragReorder(orders, activeId, overId) {
    const oldIndex = orders.findIndex(o => String(o.id) === String(activeId));
    const newIndex = orders.findIndex(o => String(o.id) === String(overId));
    const allowed =
        oldIndex !== -1 &&
        newIndex !== -1 &&
        oldIndex !== newIndex &&
        oldIndex !== 0 &&
        newIndex !== 0;
    return { allowed, oldIndex, newIndex };
}
