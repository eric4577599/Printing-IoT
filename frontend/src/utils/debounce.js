/**
 * 防呆工具函式
 * ================
 * 提供 Debounce 和 Throttle 功能，防止使用者快速重複觸發按鈕
 * 
 * @author @automated-test-engineer
 * @date 2025-01-15
 */

/**
 * Debounce - 延遲執行，取最後一次呼叫
 * 適用場景：輸入框搜尋、視窗 resize
 * 
 * @param {Function} func - 要執行的函式
 * @param {number} wait - 延遲時間 (毫秒)
 * @returns {Function} - 包裝後的函式
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle - 節流，固定時間內只執行一次
 * 適用場景：按鈕防連點、捲動事件
 * 
 * @param {Function} func - 要執行的函式
 * @param {number} limit - 限制時間 (毫秒)
 * @returns {Function} - 包裝後的函式
 */
export function throttle(func, limit = 500) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 建立帶有防呆鎖的函式
 * 防止 async 函式在執行中被重複呼叫
 * 
 * @param {Function} asyncFunc - 非同步函式
 * @returns {Function} - 帶鎖的函式
 */
export function withLock(asyncFunc) {
    let isLocked = false;

    return async function lockedFunction(...args) {
        if (isLocked) {
            console.warn('[withLock] 操作進行中，請稍候...');
            return null;
        }

        isLocked = true;
        try {
            return await asyncFunc(...args);
        } finally {
            isLocked = false;
        }
    };
}

/**
 * 建立帶有冷卻時間的函式
 * 執行後需等待冷卻時間才能再次執行
 * 
 * @param {Function} func - 要執行的函式
 * @param {number} cooldown - 冷卻時間 (毫秒)
 * @returns {Function} - 帶冷卻的函式
 */
export function withCooldown(func, cooldown = 1000) {
    let lastCall = 0;

    return function cooldownFunction(...args) {
        const now = Date.now();
        const remaining = cooldown - (now - lastCall);

        if (remaining > 0) {
            console.warn(`[withCooldown] 請等待 ${Math.ceil(remaining / 1000)} 秒後再試`);
            return null;
        }

        lastCall = now;
        return func(...args);
    };
}
