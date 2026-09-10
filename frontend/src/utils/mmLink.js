// MM 維護模組入口的網址組裝與可見性判準(P1)。
//
// 依 `docs/spec20260910-1.md` §7.1:
//  - 網址從設定讀,不寫死(不同廠的 MM 網址不同)
//  - 未設定時**不顯示入口** —— 不留一個必然打不開的死連結
//  - 帶 machine 參數讓 MM 綁定同一台機器,並帶 from=priiot 供 MM 判斷來源
//  - 權限與 S14 文件分權同一組判準:ADMIN / ENGINEER / SUPERVISOR 可見,OPERATOR 不可見
//
// 抽成純函式的理由:這裡每一條都是**判準**,而判準要能被測試釘住。

/** 看得到 MM 入口的角色。OPERATOR 不在其中 —— 保養是技術與管理職的事。 */
export const MM_ENTRY_ROLES = Object.freeze(['ADMIN', 'ENGINEER', 'SUPERVISOR']);

/**
 * 組出 MM 入口網址
 * @param {string} baseUrl - 設定中的 MM 網址(可能沒有協定、可能有尾斜線)
 * @param {string} machineId - 主系統的機台識別碼,對應 MM 的 MachineCode
 * @returns {string|null} 完整網址;baseUrl 空白或不是合法網址時回 null
 * @description 沒有協定時補 https://(現場常直接貼主機名)。
 *              machineId 空白時仍回傳網址,只是不帶 machine 參數 ——
 *              入口本身仍有價值,綁不綁得到是 MM 那側的事。
 *              參數一律 encodeURIComponent,機台代號含空白或中文時才不會壞掉。
 */
export function buildMmUrl(baseUrl, machineId) {
    const raw = String(baseUrl ?? '').trim();
    if (!raw) return null;

    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    let url;
    try {
        url = new URL(withProtocol);
    } catch {
        return null; // 設定裡是一串亂碼時,寧可不顯示入口也不要給一個打不開的連結
    }
    if (!url.hostname) return null;

    url.searchParams.set('from', 'priiot');

    const code = String(machineId ?? '').trim();
    if (code) url.searchParams.set('machine', code);

    return url.toString();
}

/**
 * 判斷是否顯示 MM 入口
 * @param {Object} deps
 * @param {string} deps.baseUrl - 設定中的 MM 網址
 * @param {(...roles: string[]) => boolean} deps.hasRole - AuthContext 的 hasRole
 * @returns {boolean}
 * @description 兩個條件都要成立:網址設得出合法連結、且角色看得到。
 *              未登入(hasRole 不可用)一律不顯示 —— 預設拒絕。
 */
export function shouldShowMmEntry({ baseUrl, hasRole }) {
    if (typeof hasRole !== 'function') return false;
    if (!buildMmUrl(baseUrl, '')) return false;
    return hasRole(...MM_ENTRY_ROLES);
}
