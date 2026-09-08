import { describe, it, expect } from 'vitest';

/**
 * S5 補強:前端不得以瀏覽器原生 fetch 直接打後端 /api。
 *
 * 背景:S5 讓後端全面 [Authorize],權杖只由 services/api.js 的 axios 請求攔截器掛上。
 * 任何繞過該 instance 的呼叫(例如原本 DocsPortal 的 `fetch('/api/docs/...')`)都不會帶
 * Authorization,一律回 401 —— 這種錯誤在單元測試不會顯現,只有實際點頁面才看得到,
 * 因此改用靜態掃描把它擋在版控之前。
 *
 * 取檔方式與 noHardcodedCredentials.test.js 一致:用 import.meta.glob(?raw),
 * 因為本專案的 vite-plugin-node-polyfills 會把 node:fs 換成瀏覽器替身、讀不到真實檔案。
 */

// 以原始字串載入 src 下所有 .js / .jsx(鍵為相對本檔的路徑)
const modules = import.meta.glob('../../**/*.{js,jsx}', { query: '?raw', import: 'default', eager: true });

// 只留 src/ 其他目錄的檔案(src/tests 底下會解析成 './' 或 '../',不以 '../../' 開頭)
const sources = Object.entries(modules)
    .filter(([file]) => file.startsWith('../../'))
    .filter(([file]) => !file.includes('/tests/'));

// 比對「fetch( 後面第一個引數是以 /api 開頭的字串或樣板字面值」,
// 前綴的否定判斷是為了放過 `something.fetch(` 這類方法名巧合。
const BARE_API_FETCH = /(?<![.\w])fetch\s*\(\s*[`'"]\/api/;

describe('前端不得繞過 api.js 直接 fetch 後端(S5 補強)', () => {
    it('掃描範圍非空(避免測試因路徑錯誤而空轉通過)', () => {
        expect(sources.length).toBeGreaterThan(10);
        expect(sources.some(([f]) => f.endsWith('pages/DocsPortal.jsx'))).toBe(true);
    });

    it('src 內沒有任何裸 fetch 打向 /api', () => {
        const hits = sources.filter(([, code]) => BARE_API_FETCH.test(code)).map(([f]) => f);
        expect(
            hits,
            `以下檔案用原生 fetch 打後端,不會帶 Authorization,請改走 services/api.js:${hits.join(', ')}`
        ).toEqual([]);
    });

    /*
     * S14:原本這裡釘的是「DocsPortal 必須 import getDocument」。
     * 那條判準是 S5 當下的正確代理 —— 它要防的是裸 fetch 不帶權杖而固定回 401。
     * 但 S14 之後 DocsPortal **完全不發網路請求**(文件在建置時就收進前端),
     * 判準的前提消失了。不放寬斷言,換成對準真實不變量的兩條:
     * 不得有任何網路呼叫,而且內容只能從 docRegistry 這個唯一入口取得。
     */
    it('DocsPortal 完全不發網路請求(S14 起文件不經 API)', () => {
        const found = sources.find(([f]) => f.endsWith('pages/DocsPortal.jsx'));
        expect(found, 'DocsPortal.jsx 不存在').toBeDefined();
        const code = found[1];
        expect(code).not.toMatch(/(?<![.\w])fetch\s*\(/);
        expect(code).not.toContain('XMLHttpRequest');
        expect(code).not.toContain("from '../services/api'");
    });

    it('DocsPortal 只從 docRegistry 取內容 —— 權限在那裡收斂', () => {
        const found = sources.find(([f]) => f.endsWith('pages/DocsPortal.jsx'));
        const code = found[1];
        expect(code).toContain("from '../modules/docs/docRegistry'");
        expect(code).toContain('loadDoc(');
    });
});
