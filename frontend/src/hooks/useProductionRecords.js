import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllProductionCompletions } from '../services/api';
import { filterByDateRange } from '../utils/reportUtils';
import {
    mapCompletionToRecord,
    normalizeLocalRecord,
    mergeCompletionRecords,
    buildEnrichMap,
} from '../utils/completionMapper';

/**
 * useProductionRecords — 報表與分析共用的生產紀錄資料來源(S4 / F3)
 *
 * 取代 ReportsPage 與 useAnalysisData 各自直讀 localStorage 的寫法:
 * 後端是實績的權威來源,localStorage 降為「兩個來源之一」,只在後端沒有該筆時才貢獻資料。
 *
 * 三條紀律(見 docs/spec20260905-s4-v1.md §2):
 *  - 降級不中斷現場:API 失敗改用本機快取渲染,但 isDegraded 必須看得見;
 *  - 不可靜默截斷:觸到分頁硬上限時回報 truncated,由畫面明確標示;
 *  - 不讓使用者以為資料遺失:僅存在本機的舊單照樣顯示,並回報 localOnlyCount。
 */

const STORAGE_KEY = 'productionHistory';

/**
 * 讀取本機快取並正規化、過濾到指定區間
 * @param {string} from - 起始工廠日 YYYY-MM-DD(可省略)
 * @param {string} to - 結束工廠日 YYYY-MM-DD(可省略)
 * @returns {Array} 已正規化且落在區間內的本機列;讀取或解析失敗時回空陣列
 * @description 本機列不經 API,必須自己過濾區間。JSON 壞掉或 localStorage 不可用時
 *              只 console.warn 並當作空陣列,不得影響後端列的顯示。
 *              先正規化再過濾:normalizeLocalRecord 會以 finishedAt 補 date,
 *              先過濾會讓只有 finishedAt 的紀錄被誤殺。
 */
function readLocalRecords(from, to) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = JSON.parse(raw || '[]');
        if (!Array.isArray(parsed)) return [];
        const normalized = parsed.map(normalizeLocalRecord).filter(Boolean);
        return filterByDateRange(normalized, from, to);
    } catch (err) {
        console.warn('[useProductionRecords] 讀取本機快取失敗,改以空清單處理', err);
        return [];
    }
}

/**
 * 就地修改本機快取中的一筆生產紀錄
 * @param {string|number} id - 該筆紀錄的本機 id
 * @param {Object} patch - 要覆寫的欄位(如 { goodQty, defectQty })
 * @returns {boolean} 是否成功寫入
 * @description 手動上傳報工目前仍只寫本機快取(後端沒有實績修改端點,見 spec §8 backlog 第 4 項)。
 *              儲存層存取集中在本模組,呼叫端不直接碰 localStorage;
 *              寫完後由呼叫端 reload(),讓率值以現行公式重算後回到畫面。
 */
export function patchLocalProductionRecord(id, patch) {
    try {
        const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(cached)) return false;
        const updated = cached.map(r => (String(r?.id) === String(id) ? { ...r, ...patch } : r));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return true;
    } catch (err) {
        console.error('[useProductionRecords] 寫入本機快取失敗', err);
        return false;
    }
}

/**
 * 取得指定工廠日區間的生產紀錄(後端為主、本機快取補洞)
 * @param {Object} params - 查詢條件
 * @param {string} [params.from] - 起始工廠日 YYYY-MM-DD
 * @param {string} [params.to] - 結束工廠日 YYYY-MM-DD
 * @param {boolean} [params.enabled=true] - false 時不抓取(供尚未決定區間的分頁使用)
 * @returns {{ records: Array, isLoading: boolean, error: Error|null, isDegraded: boolean,
 *            truncated: boolean, localOnlyCount: number, reload: Function }}
 * @description 邏輯:
 *              1. from / to 變動即重新抓取;
 *              2. 先讀本機快取(順便建 customer / productName 的補欄位索引);
 *              3. 逐頁抓後端 → 對映 → 與本機列合併去重(後端勝出);
 *              4. 後端失敗 → 只留本機列、isDegraded = true、error 帶原始錯誤,不重新拋出;
 *              5. 競態:以遞增請求序號判斷,只有最後一次請求的結果可寫入 state;
 *              6. 元件卸載後不 setState。
 */
export function useProductionRecords({ from, to, enabled = true } = {}) {
    const [state, setState] = useState({
        records: [],
        isLoading: enabled !== false,
        error: null,
        isDegraded: false,
        truncated: false,
        localOnlyCount: 0,
    });

    // 請求序號:每次抓取遞增,回應寫入前比對,避免過期回應覆蓋新區間的結果(E-14)
    const requestIdRef = useRef(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const load = useCallback(async () => {
        if (enabled === false) {
            setState({ records: [], isLoading: false, error: null, isDegraded: false, truncated: false, localOnlyCount: 0 });
            return;
        }

        const requestId = ++requestIdRef.current;
        setState(prev => ({ ...prev, isLoading: true }));

        const localRecords = readLocalRecords(from, to);

        try {
            const { items, truncated } = await getAllProductionCompletions({ from, to });
            if (!mountedRef.current || requestId !== requestIdRef.current) return;

            const enrichMap = buildEnrichMap(localRecords);
            const backendRecords = (items || []).map(dto =>
                mapCompletionToRecord(dto, enrichMap.get(String(dto?.clientRecordId ?? '')))
            );
            const { records, localOnlyCount } = mergeCompletionRecords(backendRecords, localRecords);

            setState({ records, isLoading: false, error: null, isDegraded: false, truncated: !!truncated, localOnlyCount });
        } catch (err) {
            if (!mountedRef.current || requestId !== requestIdRef.current) return;

            // 降級:退回本機快取繼續渲染(顯示空清單等同謊稱「這段期間沒有生產」)
            const { records, localOnlyCount } = mergeCompletionRecords([], localRecords);
            setState({ records, isLoading: false, error: err, isDegraded: true, truncated: false, localOnlyCount });
        }
    }, [from, to, enabled]);

    useEffect(() => {
        load();
    }, [load]);

    return { ...state, reload: load };
}

export default useProductionRecords;
