/**
 * authStorage — 權杖與使用者輪廓的持存(S5)。
 *
 * 單一職責:這是全前端「唯一」允許直接碰認證相關 localStorage 鍵的地方。
 * 任何密碼欄位都不得寫入儲存,寫入前一律以白名單挑欄位。
 *
 * 鍵:
 *   authToken   —— JWT 字串
 *   authUser    —— 輪廓 JSON(白名單欄位,無密碼)
 *   currentUser —— 已廢止(舊版曾把含明文密碼的整個物件寫進去),clearAuth 順手清除
 */

export const TOKEN_KEY = 'authToken';
export const PROFILE_KEY = 'authUser';
const LEGACY_PROFILE_KEY = 'currentUser';

// 輪廓白名單:只有這些欄位會被寫入 localStorage
const PROFILE_FIELDS = ['username', 'displayName', 'roles', 'role', 'shift', 'sessionShift', 'expiresAt'];

/**
 * 以白名單重建輪廓物件。
 * 輸入:任意物件(可能含密碼等敏感欄位);
 * 輸出:只含白名單欄位的新物件;
 * 邏輯:逐一挑出白名單內且非 undefined 的欄位,其餘(含 password)一律丟棄。
 */
export const sanitizeProfile = (profile) => {
    if (!profile || typeof profile !== 'object') return {};
    const out = {};
    for (const key of PROFILE_FIELDS) {
        if (profile[key] !== undefined) out[key] = profile[key];
    }
    return out;
};

/**
 * 存入權杖與輪廓。
 * 輸入:權杖字串、輪廓物件;輸出:無;
 * 邏輯:輪廓先過白名單再序列化;順手移除廢止的 currentUser 鍵。
 */
export const saveAuth = (token, profile) => {
    try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfile(profile)));
        localStorage.removeItem(LEGACY_PROFILE_KEY);
    } catch {
        // 隱私模式等情境下 localStorage 可能不可寫;不可寫並非致命錯誤,略過即可
    }
};

/**
 * 讀取權杖。
 * 輸入:無;輸出:權杖字串或 null。
 */
export const getToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

/**
 * 讀取輪廓。
 * 輸入:無;輸出:輪廓物件或 null;
 * 邏輯:JSON 解析失敗視為髒資料,清空認證儲存並回 null。
 */
export const getProfile = () => {
    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            clearAuth();
            return null;
        }
        return parsed;
    } catch {
        clearAuth();
        return null;
    }
};

/**
 * 清除所有認證儲存。
 * 輸入:無;輸出:無;
 * 邏輯:移除 authToken / authUser,並移除舊版遺留的 currentUser(其中可能含明文密碼)。
 */
export const clearAuth = () => {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(PROFILE_KEY);
        localStorage.removeItem(LEGACY_PROFILE_KEY);
    } catch {
        // 同上,儲存不可用時無須中斷流程
    }
};

/**
 * 判斷輪廓是否已過期。
 * 輸入:輪廓物件;輸出:布林;
 * 邏輯:expiresAt 早於現在即為過期;無 expiresAt 或無法解析時視為未過期(交由後端 401 把關)。
 */
export const isExpired = (profile) => {
    if (!profile || !profile.expiresAt) return false;
    const expiry = new Date(profile.expiresAt).getTime();
    if (Number.isNaN(expiry)) return false;
    return expiry < Date.now();
};
