import { useState, useEffect, useCallback } from 'react';
import { getReasonCodes } from '../services/api';

/**
 * useReasonCodes — 停機 / 不良原因主檔 Hook(S3 / F8)
 *
 * 三個消費端(StopReasonModal、FinishOrderModal、GeneralTab)共用這一份資料與形狀,
 * 不再各自寫死一份清單。
 *
 * 降級順序(現場永遠有原因可選,見規格 §2 原則 4):
 *   後端 API(非空) → localStorage 快取 → 元件內建預設 fallbackList
 */

/** type 與 localStorage 快取鍵的對應(沿用設定頁既有的鍵名)。 */
const CACHE_KEYS = {
    stop: 'stopReasonsList',
    defect: 'defectReasonsList',
};

/**
 * 把任意來源的原因項正規化成統一形狀
 * @param {Object} item - 後端 DTO、localStorage 快取項或元件內建預設項
 * @returns {{ id: string, code: string, name: string, category: string }} 正規化後的原因
 * @description 後端用 { id, code, name },舊 localStorage 用 { id, reason },
 *              元件內建預設用 { code, name };三種來源在此收斂成同一形狀。
 */
function normalize(item) {
    const code = item.code ?? item.id ?? '';
    return {
        id: item.id != null ? String(item.id) : String(code),
        code: String(code),
        name: item.name ?? item.reason ?? '',
        category: item.category ?? 'General',
    };
}

/**
 * 讀取 localStorage 的原因快取
 * @param {string} type - 'stop' | 'defect'
 * @returns {Array|null} 正規化後的清單,無快取或解析失敗回 null
 */
function readCache(type) {
    const key = CACHE_KEYS[type];
    if (!key) return null;

    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) return null;
        return parsed.map(normalize);
    } catch (err) {
        console.warn(`[useReasonCodes] 讀取 ${key} 快取失敗`, err);
        return null;
    }
}

/**
 * 寫入 localStorage 的原因快取
 * @param {string} type - 'stop' | 'defect'
 * @param {Array} reasons - 已正規化的清單
 * @returns {void}
 */
function writeCache(type, reasons) {
    const key = CACHE_KEYS[type];
    if (!key) return;

    try {
        localStorage.setItem(key, JSON.stringify(reasons));
    } catch (err) {
        console.warn(`[useReasonCodes] 寫入 ${key} 快取失敗`, err);
    }
}

/**
 * 取得停機 / 不良原因清單
 * @param {string} type - 'stop' | 'defect'
 * @param {Array} [fallbackList=[]] - 元件內建預設清單(API 與快取皆不可用時使用)
 * @returns {{ reasons: Array, loading: boolean, error: Error|null, reload: Function }}
 *          reasons 為正規化的 { id, code, name, category } 陣列
 * @description 掛載時打 GET /api/reasons?type=<type>;成功且清單非空就採用後端資料並寫一份
 *              localStorage 快取;失敗或回空清單則依序退回快取 → fallbackList 並設 error,
 *              讓現場照常能選原因(不阻擋作業)。
 */
export function useReasonCodes(type, fallbackList = []) {
    const [reasons, setReasons] = useState(() => (fallbackList || []).map(normalize));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * 套用降級清單(快取優先,沒有才用內建預設)
     * @param {Error} err - 觸發降級的原因
     * @returns {void}
     */
    const applyFallback = useCallback((err) => {
        const cached = readCache(type);
        if (cached) {
            setReasons(cached);
        } else {
            console.warn(`[useReasonCodes] ${type} 原因主檔不可用,改用元件內建預設清單`, err);
            setReasons((fallbackList || []).map(normalize));
        }
        setError(err);
        // fallbackList 由呼叫端以模組常數提供,不隨渲染改變
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getReasonCodes(type);
            if (Array.isArray(data) && data.length > 0) {
                const normalized = data.map(normalize);
                setReasons(normalized);
                writeCache(type, normalized);
                setError(null);
            } else {
                // 主檔被清空(全部軟刪除)也算不可用 —— 現場不能沒有原因可選
                applyFallback(new Error('原因主檔回傳空清單'));
            }
        } catch (err) {
            applyFallback(err);
        } finally {
            setLoading(false);
        }
    }, [type, applyFallback]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { reasons, loading, error, reload };
}

export default useReasonCodes;
