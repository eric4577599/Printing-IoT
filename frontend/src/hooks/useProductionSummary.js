import { useState, useEffect } from 'react';
import { getProductionSummary } from '../services/api';

/**
 * useProductionSummary — 報表彙總的資料來源(S8 / §3、§4)
 *
 * 這個 hook 只回答一個問題:**這張報表的彙總數字,該用後端算的還是前端算的?**
 * 它不做任何算術 —— 前端的計算仍留在 reportUtils,由呼叫端自己算好當備援。
 *
 * 判斷順序(不可調換,理由見 docs/spec20260906-s8-v1 §4):
 *
 *  1. **區間內有僅存在本機的舊實績 → 一律用前端計算**。
 *     後端彙總只看得到後端的資料,若此時採用後端數字,那些舊單會從彙總裡消失,
 *     但逐筆明細裡還看得到 —— 數字與明細互相矛盾,比數字略有漂移更糟。
 *  2. 沒有本機殘留 → 打後端彙總端點,成功就用後端的(單一事實來源)。
 *  3. 後端失敗(含資料量超過上限的 400)→ 退回前端計算,但把降級狀態往外報,
 *     由畫面明確標示,不讓使用者以為看到的是權威數字。
 *
 * 實作註記:state 裡一併存下該筆結果**屬於哪一組查詢條件**(queryKey)。
 * 這樣有兩個好處:effect 不必為了「清掉上一次的結果」而同步 setState
 * (那會觸發連鎖重繪),而且切換月份時舊結果會因為 key 不符自動失效 ——
 * 不會出現「這個月的標題配上個月的數字」。條件不符時退回前端計算,
 * 而前端算的一定是**正確區間**的數字,所以這個空窗期是安全的。
 */

/**
 * 取得指定區間的報表彙總
 * @param {Object} params - 查詢條件
 * @param {'daily'|'monthly'|'stop-reasons'} params.kind - 要哪一組彙總
 * @param {string} [params.from] - 起始工廠日 YYYY-MM-DD
 * @param {string} [params.to] - 結束工廠日 YYYY-MM-DD
 * @param {string} [params.shift] - 班別;'全部' 或空值視為不過濾
 * @param {number} [params.localOnlyCount=0] - 區間內僅存在本機的筆數
 * @param {boolean} [params.enabled=true] - false 時不抓取(供尚未決定區間的分頁使用)
 * @returns {{ data: Object|Array|null, source: 'backend'|'local', reason: string|null,
 *            isLoading: boolean, error: Error|null }}
 *          source 為 'local' 時 data 為 null,呼叫端應改用自己的前端計算結果;
 *          reason 說明為什麼沒用後端('localOnly' / 'error' / 'disabled'),供畫面標示。
 */
export function useProductionSummary({
    kind,
    from,
    to,
    shift,
    localOnlyCount = 0,
    enabled = true,
} = {}) {
    // 本機還有舊實績時連打都不打 —— 打了也不能用,徒增一次請求
    const shouldFetch = enabled && localOnlyCount === 0;
    const queryKey = shouldFetch ? `${kind}|${from ?? ''}|${to ?? ''}|${shift ?? ''}` : null;

    const [result, setResult] = useState({ key: null, data: null, error: null });

    useEffect(() => {
        if (!queryKey) return undefined;

        let cancelled = false;

        getProductionSummary(kind, { from, to, shift })
            .then(data => {
                if (!cancelled) setResult({ key: queryKey, data, error: null });
            })
            .catch(err => {
                if (cancelled) return;
                // 降級不中斷現場:報表照樣顯示,但來源必須讓使用者看得見
                console.warn('[useProductionSummary] 後端彙總取得失敗,改用前端計算', err);
                setResult({ key: queryKey, data: null, error: err });
            });

        // 條件變更時讓進行中的回應失效,避免慢回應覆蓋掉後發的查詢
        return () => { cancelled = true; };
    }, [queryKey, kind, from, to, shift]);

    // 只有「屬於當前查詢條件」的結果才算數
    const fresh = queryKey !== null && result.key === queryKey;

    let source = 'local';
    let reason = 'disabled';

    if (!enabled) {
        reason = 'disabled';
    } else if (localOnlyCount > 0) {
        reason = 'localOnly';
    } else if (fresh && result.error) {
        reason = 'error';
    } else if (fresh && result.data !== null) {
        source = 'backend';
        reason = null;
    }

    return {
        data: source === 'backend' ? result.data : null,
        source,
        reason,
        isLoading: shouldFetch && !fresh,
        error: fresh ? result.error : null,
    };
}
