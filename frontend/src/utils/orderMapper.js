// 前端排程訂單 <-> 後端 Order 的欄位對映(純函式,便於單元測試)。
//
// 分工:
//  - 後端擁有「身分(GUID id)+ 排序(sequence)+ 核心查詢欄位」;
//  - 前端 BoxDiagram 需要的完整規格(boxLen/boxWid/dim*/l*/w*/h*/dieCutType…後端未逐一建欄)
//    以 SpecJson(JSON 字串)在後端原樣保存,確保重整後不遺失。
//
// 注意:後端 API 未掛 JsonStringEnumConverter,OrderStatus 以「數字」序列化,且預設 camelCase。

// OrderStatus(後端 enum):Pending=0, InProgress=1, Paused=2, Completed=3, Cancelled=4
export const BACKEND_STATUS = { Pending: 0, InProgress: 1, Paused: 2, Completed: 3, Cancelled: 4 };

// 前端狀態字串 → 後端數字
const STATUS_TO_BACKEND = {
    Idle: BACKEND_STATUS.Pending,
    Queued: BACKEND_STATUS.Pending,
    Pending: BACKEND_STATUS.Pending,
    Running: BACKEND_STATUS.InProgress,
    Paused: BACKEND_STATUS.Paused,
    Completed: BACKEND_STATUS.Completed,
    Cancelled: BACKEND_STATUS.Cancelled,
};

// 後端數字 → 前端狀態字串
const STATUS_FROM_BACKEND = {
    [BACKEND_STATUS.Pending]: 'Queued',
    [BACKEND_STATUS.InProgress]: 'Running',
    [BACKEND_STATUS.Paused]: 'Paused',
    [BACKEND_STATUS.Completed]: 'Completed',
    [BACKEND_STATUS.Cancelled]: 'Cancelled',
};

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 是否為 GUID 字串(後端 Order.Id 形態;鏡像同步以此判斷 upsert vs 新建)。 */
export function isGuid(v) {
    return typeof v === 'string' && GUID_RE.test(v);
}

/** 移除前端訂單的 id(後端以 GUID 為身分,不把前端 id 塞進 SpecJson 以免混淆)。 */
function stripId(order) {
    const { id, ...rest } = order;
    return rest;
}

/**
 * 前端訂單 → 後端 Order 建立/更新 payload。
 * @param {Object} order 前端訂單(含 BoxDiagram 規格等顯示欄位)
 * @param {number} [sequence] 明確指定的排序整數(未給則取 order.sequence,再退 0)
 * @returns {Object} 後端 payload(camelCase)
 */
export function toBackendOrder(order, sequence) {
    const seq = Number.isFinite(sequence) ? sequence : (Number(order.sequence) || 0);
    const out = {
        orderNumber: String(order.orderNo ?? ''),
        customerName: String(order.customer ?? ''),
        quantity: Number(order.qty) || 0,
        boxType: String(order.boxType ?? ''),
        productCode: String(order.productCode ?? order.boxNo ?? ''),
        sequence: seq,
        status: STATUS_TO_BACKEND[order.status] ?? BACKEND_STATUS.Pending,
        // 完整前端 payload 原樣保存(含 BoxDiagram 規格);還原時以此為顯示真相
        specJson: JSON.stringify(stripId(order)),
    };
    // 帶上 GUID id 讓後端 upsert 命中既有列(非 GUID 的前端暫時 id 不送,由後端新建並配 GUID)
    if (isGuid(order.id)) out.id = order.id;
    return out;
}

/**
 * 後端 Order → 前端訂單。
 * 以 SpecJson 還原完整顯示欄位,再用後端 typed 欄位覆蓋核心欄位(避免分歧),
 * 並附上 _sequence 供排序(非顯示欄位)。
 * @param {Object} be 後端 Order(camelCase)
 * @returns {Object} 前端訂單
 */
export function fromBackendOrder(be) {
    let spec = {};
    if (be.specJson) {
        try { spec = JSON.parse(be.specJson) || {}; } catch { spec = {}; }
    }
    const statusNum = typeof be.status === 'number' ? be.status : BACKEND_STATUS[be.status];
    return {
        ...spec,                                   // 還原 BoxDiagram 規格與其餘顯示欄位
        id: be.id,                                 // 後端 GUID = 身分真相
        orderNo: be.orderNumber ?? spec.orderNo ?? '',
        customer: be.customerName ?? spec.customer ?? '',
        qty: be.quantity ?? spec.qty ?? 0,
        boxType: be.boxType ?? spec.boxType ?? '',
        status: STATUS_FROM_BACKEND[statusNum] ?? spec.status ?? 'Queued',
        _sequence: Number(be.sequence) || 0,       // 供排序用,非顯示
    };
}

/**
 * 依 _sequence 升冪排序後端還原的訂單(sequence 相同者維持原順序)。
 * @param {Array<Object>} orders fromBackendOrder 產生的訂單陣列
 * @returns {Array<Object>} 排序後的新陣列
 */
export function sortBySequence(orders) {
    return [...orders].sort((a, b) => (a._sequence || 0) - (b._sequence || 0));
}
