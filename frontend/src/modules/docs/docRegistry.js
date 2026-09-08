/**
 * docRegistry — 文件登錄簿(S14)
 *
 * 為什麼存在:原本 `/docs` 走後端 `/api/docs/:filename`,而 **`doc/` 從來沒進過 API 容器** ——
 * compose 的建置脈絡是 `./backend`,`doc/` 在專案根,Dockerfile 的 `COPY . .` 抄不到它,
 * `GetDocPath()` 三段 fallback 全部落空,於是清單空、單檔一律 404。
 * Eric 裁決改為**不經 API**:建置時把 `doc/*.md` 收進前端,頁面不發任何請求。
 *
 * 三條紀律:
 *  1. **清單由實際存在的檔案產生**,不是手寫的。原本 31 個 md 檔裡只有 18 個被手寫索引列到,
 *     其餘(業務推廣企劃書、高中生簡報、ERROR_TEST_MATRIX 等)在畫面上根本不存在;
 *     而手寫索引一旦與 `doc/` 脫節就會描述一個不存在的系統(S9 的 O-06 正是這一類)。
 *     改由 glob 產生之後,新增一個 md 檔就自動出現,不會再漏也不會再指空。
 *  2. **延遲載入**。31 個檔約 178 KB,全部塞進主 bundle 只為了讓人看其中一份並不划算;
 *     glob 不用 eager,每份文件是自己的 chunk,點了才抓。
 *  3. **角色分權在這裡收斂**,不散在畫面上。
 *
 * 代價(已知並接受):文件內容成為靜態資源,**能載入前端的人不必登入也抄得到**。
 * 這是「不經 API」的必然結果,不是疏漏。
 */

/**
 * 建置時掃入 doc/ 底下所有 Markdown。
 * 路徑由本檔往上四層到專案根:modules → src → frontend → 專案根。
 */
const loaders = import.meta.glob('../../../../doc/*.md', {
    query: '?raw',
    import: 'default',
});

/** 分類代碼 —— 顯示名稱走 i18n,這裡只放資料 */
export const CATEGORY = {
    WORKFLOW: 'workflow',
    DESIGN: 'design',
    DEPLOY: 'deploy',
    REFACTOR: 'refactor',
    TESTING: 'testing',
    MEETING: 'meeting',
    OTHER: 'other',
};

/**
 * 檔名 → { category, i18nKey?, name? }
 * i18nKey 有值時顯示名稱走翻譯;沒有的用 name,兩者都沒有就退回檔名。
 * **這份表只負責歸類與命名,不決定有沒有這份文件** —— 那由 glob 的結果決定。
 */
export const CURATED_INDEX = {
    '操作說明書.md': { category: CATEGORY.WORKFLOW, i18nKey: 'docs.file.manual' },
    'Operator Manual.md': { category: CATEGORY.WORKFLOW, name: 'Operator Manual' },
    'Supervisor_Manual.md': { category: CATEGORY.WORKFLOW, name: 'Supervisor Manual' },

    'SASD說明書.md': { category: CATEGORY.DESIGN, i18nKey: 'docs.file.sasd' },
    '開發說明書.md': { category: CATEGORY.DESIGN, i18nKey: 'docs.file.dev' },
    '維護保養開發設計書.md': { category: CATEGORY.DESIGN, i18nKey: 'docs.file.maintenance' },
    'MQTT訊息處理流程.md': { category: CATEGORY.DESIGN, i18nKey: 'docs.file.mqtt' },
    '整合設計與重新拆分規劃_20260617.md': { category: CATEGORY.DESIGN, name: '整合設計與重新拆分規劃 2026/06/17' },

    'DEPLOYMENT_GUIDE_v1.md': { category: CATEGORY.DEPLOY, name: 'Deployment Guide v1' },
    'FLEXO_HQ_INTEGRATION.md': { category: CATEGORY.DEPLOY, name: 'Flexo HQ Integration' },
    'HANDOVER.md': { category: CATEGORY.DEPLOY, i18nKey: 'docs.file.handover' },
    'PROJECT_STATUS.md': { category: CATEGORY.DEPLOY, i18nKey: 'docs.file.projectStatus' },

    'REFACTORING_LOG.md': { category: CATEGORY.REFACTOR, i18nKey: 'docs.file.refactorLog' },

    'TEST_CASES.md': { category: CATEGORY.TESTING, i18nKey: 'docs.file.testCases' },
    'STRESS_TEST_REPORT.md': { category: CATEGORY.TESTING, i18nKey: 'docs.file.stressTest' },
    'ERROR_TEST_MATRIX.md': { category: CATEGORY.TESTING, name: 'Error Test Matrix' },
    'PROJECT_REVIEW_2026_01_16.md': { category: CATEGORY.TESTING, i18nKey: 'docs.file.review', suffix: '2026/01/16' },

    '20260122_維修管理系統分離_團隊會議議程.md': { category: CATEGORY.MEETING, i18nKey: 'docs.file.meeting1', prefix: '2026/01/22' },
    '20260122正隆苗栗保養計劃討論.md': { category: CATEGORY.MEETING, i18nKey: 'docs.file.meeting2', prefix: '2026/01/22' },
};

/**
 * OPERATOR 看得到的檔案。
 * 依 Eric 指示「操作者看操作說明書」;中英兩版都給 —— 現場有五個語系,
 * 只給中文那版等於對非中文母語的作業員關門。
 */
const OPERATOR_FILES = new Set(['操作說明書.md', 'Operator Manual.md']);

/** 從 glob 的鍵取出檔名 */
const baseNameOf = (key) => key.slice(key.lastIndexOf('/') + 1);

/** 分類的呈現順序(未列到的排最後) */
const CATEGORY_ORDER = [
    CATEGORY.WORKFLOW, CATEGORY.DESIGN, CATEGORY.DEPLOY,
    CATEGORY.REFACTOR, CATEGORY.TESTING, CATEGORY.MEETING, CATEGORY.OTHER,
];

/**
 * 目前建置實際收到的所有文件檔名
 * @returns {Array<string>} 檔名陣列(不含路徑),依檔名排序
 */
export function allDocFileNames() {
    return Object.keys(loaders).map(baseNameOf).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}

/**
 * 判斷某個角色看不看得到某份文件
 * @param {string} fileName - 檔名
 * @param {(...roles: string[]) => boolean} hasRole - AuthContext 的 hasRole
 * @returns {boolean}
 * @description OPERATOR 只看操作手冊;其餘角色(ADMIN / ENGINEER / SUPERVISOR)全看。
 *              **未登入或沒有任何角色時一律看不到** —— 預設拒絕,與後端同一個立場。
 */
export function canRead(fileName, hasRole) {
    if (typeof hasRole !== 'function') return false;
    if (hasRole('ADMIN', 'ENGINEER', 'SUPERVISOR')) return true;
    if (hasRole('OPERATOR')) return OPERATOR_FILES.has(fileName);
    return false;
}

/**
 * 產生側欄用的分類清單
 * @param {Object} deps
 * @param {(...roles: string[]) => boolean} deps.hasRole - 角色判斷
 * @param {(key: string) => string} deps.t - i18n 翻譯函式
 * @returns {Array<{ category: string, categoryKey: string, files: Array<{ name: string, path: string }> }>}
 *          只回傳該角色看得到、且檔案真的存在的項目;空分類不回傳
 */
export function listDocs({ hasRole, t }) {
    const translate = typeof t === 'function' ? t : (k) => k;
    const grouped = new Map();

    for (const fileName of allDocFileNames()) {
        if (!canRead(fileName, hasRole)) continue;

        const meta = CURATED_INDEX[fileName] || { category: CATEGORY.OTHER };
        const base = meta.i18nKey ? translate(meta.i18nKey) : (meta.name || fileName.replace(/\.md$/, ''));
        const name = [meta.prefix, base, meta.suffix].filter(Boolean).join(' ');

        if (!grouped.has(meta.category)) grouped.set(meta.category, []);
        grouped.get(meta.category).push({ name, path: fileName });
    }

    return CATEGORY_ORDER
        .filter(key => grouped.has(key))
        .map(key => ({
            categoryKey: key,
            category: translate(`docs.category.${key}`),
            files: grouped.get(key),
        }));
}

/**
 * 讀取一份文件的內容
 * @param {string} fileName - 檔名(listDocs 回傳的 path)
 * @param {(...roles: string[]) => boolean} hasRole - 角色判斷
 * @returns {Promise<string>} Markdown 原文
 * @throws {Error} 角色無權(code = 'FORBIDDEN')或該檔不存在(code = 'NOT_FOUND')
 * @description 權限在這裡再擋一次而不是只靠側欄不畫出來 ——
 *              側欄是呈現,這裡是唯一取得內容的入口。
 */
export async function loadDoc(fileName, hasRole) {
    if (!canRead(fileName, hasRole)) {
        const err = new Error(`無權讀取 ${fileName}`);
        err.code = 'FORBIDDEN';
        throw err;
    }

    const key = Object.keys(loaders).find(k => baseNameOf(k) === fileName);
    if (!key) {
        const err = new Error(`找不到文件 ${fileName}`);
        err.code = 'NOT_FOUND';
        throw err;
    }

    return loaders[key]();
}
