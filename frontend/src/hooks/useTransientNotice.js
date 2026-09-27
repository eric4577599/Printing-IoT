import { useState, useRef, useCallback, useEffect } from 'react';

/** 訊息預設停留毫秒數:夠現場看完一行字,又不會蓋住下一個動作的回饋。 */
export const DEFAULT_NOTICE_MS = 5000;

/**
 * useTransientNotice — 畫面上的暫時訊息(取代 window.alert,B15)
 *
 * alert() 會凍結整個分頁:真人只是多點一下,但瀏覽器自動化與 e2e 會直接失去回應。
 * 改成畫面上一行訊息,時間到自動收起,也可以手動關掉。
 *
 * @param {number} [durationMs=DEFAULT_NOTICE_MS] - 訊息停留時間
 * @returns {{ notice: {text: string, tone: 'warn'|'info'}|null, showNotice: Function, clearNotice: Function }}
 *          notice 為目前顯示中的訊息(沒有則為 null);
 *          showNotice(text, tone) 顯示新訊息並取代舊的,計時重新起算;
 *          clearNotice() 立即收起。兩個函式參照穩定,可放心在 keydown 閉包裡呼叫。
 */
export function useTransientNotice(durationMs = DEFAULT_NOTICE_MS) {
    const [notice, setNotice] = useState(null);
    const timerRef = useRef(null);

    const clearNotice = useCallback(() => {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        setNotice(null);
    }, []);

    const showNotice = useCallback((text, tone = 'warn') => {
        clearTimeout(timerRef.current);
        setNotice({ text, tone });
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            setNotice(null);
        }, durationMs);
    }, [durationMs]);

    // 卸載時清掉計時器,避免對已卸載元件 setState
    useEffect(() => () => clearTimeout(timerRef.current), []);

    return { notice, showNotice, clearNotice };
}
