import { useState, useCallback, useRef } from 'react';
import {
    getAllProductionCompletions,
    createProductionCompletion,
    getFactoryTimeSettings,
} from '../services/api';
import { classifyForBackfill, summariseIssues } from '../utils/backfillMapper';
import { patchLocalProductionRecord } from './useProductionRecords';

/**
 * useBackfill — 把只存在本機的舊實績回填後端(handoff Next Step 9)
 *
 * 為什麼需要它:S3 起完工會即時送後端,但兩群紀錄留在本機沒上去 ——
 * ① S3 之前的舊單(根本沒有 syncState 欄位);
 * ② 送失敗的單(`Dashboard.jsx` 的 catch 只 console.warn,**沒有任何重試**,
 *    那筆就永遠停在 pending)。自從 S5/S6 開了認證,任何在未登入或權杖過期時
 *    完工的單都會 401 然後留在本機。
 *
 * 所以這不是一次性遷移,是**常態對帳**:掃描 → 檢視 → 回填,可以重複執行。
 *
 * 三條紀律:
 *  1. **先掃描再寫入**。scan() 只讀不寫,讓人先看清楚會發生什麼、有幾筆是有損轉換。
 *  2. **不靜默**。每一筆的結果(成功 / 後端已有 / 失敗原因)都收在 results 裡。
 *  3. **冪等命中要驗內容**。後端回 duplicated 時比對關鍵欄位,不一致就標成衝突 ——
 *     本機 id 用的是 `Date.now()`,兩台終端同一毫秒完工會撞鍵,那時「已存在」
 *     其實是另一筆單,靜默跳過等於弄丟一筆實績。
 */

const STORAGE_KEY = 'productionHistory';

// 撞到限流時的退避:我們自己的全域額度是 600/分(5 台 × 120),
// 一次回填上千筆一定會撞到。撞到就等,不是失敗。
const RATE_LIMIT_BACKOFF_MS = 5000;
const MAX_RATE_LIMIT_RETRIES = 12; // 最多等約一分鐘,足夠讓固定視窗翻頁

/**
 * 讀取本機的原始生產紀錄
 * @returns {Array} 原始陣列;讀取或解析失敗回空陣列
 */
function readLocalRecords() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.warn('[useBackfill] 讀取本機紀錄失敗', err);
        return [];
    }
}

/**
 * 從本機紀錄推出要向後端查詢的工廠日區間
 * @param {Array} records - 本機紀錄
 * @returns {{ from: string|undefined, to: string|undefined }}
 * @description 只查涵蓋得到的區間,不要無條件把整個資料庫拉下來。
 *              取不到日期時回空區間(等同不限制),由呼叫端承擔較多分頁。
 */
function dateRangeOf(records) {
    const dates = records
        .map(r => r?.date)
        .filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();
    if (dates.length === 0) return { from: undefined, to: undefined };
    return { from: dates[0], to: dates[dates.length - 1] };
}

/**
 * 判斷後端回的冪等命中,內容是否與本機這筆相符
 * @param {Object} request - 我們送出的請求
 * @param {Object} result - 後端回的結果(duplicated = true)
 * @returns {string|null} 不一致的說明;一致時回 null
 * @description 只比對後端會回傳、且足以辨識「是不是同一筆單」的欄位。
 *              率值不比 —— 舊資料的率值本來就可能與後端重算的不同,那是預期的。
 */
function describeConflict(request, result) {
    const differences = [];

    const sentDefectQty = (request.defects || []).reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
    if (result.defectQty != null && result.defectQty !== sentDefectQty) {
        differences.push(`不良數 本機 ${sentDefectQty} / 後端 ${result.defectQty}`);
    }

    const sentStopCount = (request.stops || []).length;
    if (result.stopCount != null && result.stopCount !== sentStopCount) {
        differences.push(`停機次數 本機 ${sentStopCount} / 後端 ${result.stopCount}`);
    }

    return differences.length > 0 ? differences.join(';') : null;
}

/**
 * 等待指定毫秒
 * @param {number} ms - 毫秒
 * @returns {Promise<void>}
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 本機舊實績回填
 * @returns {{ scan: Function, run: Function, cancel: Function, state: Object }}
 * @description state 形狀:
 *   { phase, scanned, summary, progress, results, error }
 *   phase: 'idle' | 'scanning' | 'scanned' | 'running' | 'done' | 'error'
 */
export function useBackfill() {
    const [state, setState] = useState({
        phase: 'idle',
        summary: null,
        progress: null,
        results: [],
        error: null,
    });

    // 掃描結果留在 ref:run() 要用,但它不該因為 state 更新而重跑
    const pendingRef = useRef([]);
    const cancelRef = useRef(false);

    /**
     * 掃描:只讀不寫,算出有幾筆待回填、幾筆是有損轉換
     * @returns {Promise<Object|null>} 摘要;失敗回 null
     */
    const scan = useCallback(async () => {
        setState(s => ({ ...s, phase: 'scanning', error: null }));

        try {
            const local = readLocalRecords();
            const { from, to } = dateRangeOf(local);

            const [settings, backend] = await Promise.all([
                getFactoryTimeSettings().catch(() => ({})),
                getAllProductionCompletions({ from, to }),
            ]);

            const backendKeys = new Set(
                (backend.items || [])
                    .map(row => row?.clientRecordId)
                    .filter(Boolean)
                    .map(String)
            );

            const classified = classifyForBackfill(local, backendKeys, settings);
            pendingRef.current = classified.pending;

            const summary = {
                localTotal: local.length,
                alreadySynced: classified.alreadySynced.length,
                pending: classified.pending.length,
                blocked: classified.blocked,
                duplicateKeys: classified.duplicateKeys.length,
                issues: summariseIssues(classified.pending),
                // 後端清單沒取完時,「已同步」會被低估 → 可能重送(冪等擋著,無害)
                backendTruncated: Boolean(backend.truncated),
                settings,
            };

            setState(s => ({ ...s, phase: 'scanned', summary, results: [], progress: null }));
            return summary;
        } catch (err) {
            console.error('[useBackfill] 掃描失敗', err);
            setState(s => ({ ...s, phase: 'error', error: err }));
            return null;
        }
    }, []);

    /**
     * 執行回填:逐筆送出,撞限流就退避重試
     * @returns {Promise<Array>} 每一筆的結果
     * @description 刻意逐筆而不併發:併發只會更快撞到限流,而且讓進度顯示失去意義。
     */
    const run = useCallback(async () => {
        const pending = pendingRef.current;
        if (pending.length === 0) return [];

        cancelRef.current = false;
        setState(s => ({ ...s, phase: 'running', results: [], progress: { done: 0, total: pending.length } }));

        const results = [];

        for (let i = 0; i < pending.length; i++) {
            if (cancelRef.current) {
                results.push({ key: pending[i].key, status: 'cancelled' });
                break;
            }

            const { request, key, record } = pending[i];
            let attempt = 0;
            let outcome = null;

            while (attempt <= MAX_RATE_LIMIT_RETRIES) {
                try {
                    const result = await createProductionCompletion(request);

                    if (result?.duplicated) {
                        const conflict = describeConflict(request, result);
                        outcome = conflict
                            ? { key, status: 'conflict', detail: conflict }
                            : { key, status: 'alreadyExists' };
                    } else {
                        outcome = { key, status: 'created', backendId: result?.id };
                    }

                    // 成功(含冪等命中)就把本機那筆標為已同步,下次掃描不再列入
                    patchLocalProductionRecord(record.id, {
                        syncState: 'synced',
                        backendId: result?.id,
                        date: result?.productionDate || record.date,
                    });
                    break;
                } catch (err) {
                    const status = err?.response?.status;

                    // 429:不是失敗,是要等。退避後重試同一筆。
                    if (status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
                        attempt += 1;
                        setState(s => ({
                            ...s,
                            progress: { ...s.progress, waitingForRateLimit: true, done: i },
                        }));
                        await sleep(RATE_LIMIT_BACKOFF_MS);
                        continue;
                    }

                    outcome = {
                        key,
                        status: 'failed',
                        detail: err?.response?.data?.error || err?.message || String(err),
                        httpStatus: status,
                    };
                    break;
                }
            }

            results.push(outcome);
            setState(s => ({
                ...s,
                results: [...results],
                progress: { done: i + 1, total: pending.length, waitingForRateLimit: false },
            }));
        }

        setState(s => ({ ...s, phase: 'done', results }));
        return results;
    }, []);

    /** 要求中止:已送出的那筆會跑完,之後不再繼續。 */
    const cancel = useCallback(() => { cancelRef.current = true; }, []);

    return { scan, run, cancel, state };
}
