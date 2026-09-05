import { describe, it, expect } from 'vitest';

/**
 * S5 前端硬編碼憑證掃描(AC-44)。
 *
 * 掃 frontend/src 下所有 .js / .jsx(排除 tests/ 自身),確認:
 * (a) 不再出現曾外洩的密碼字串;
 * (b) 不再出現「password: '字面值'」這種把密碼寫進程式碼的樣式;
 * (c) AuthContext / LoginModal / GeneralTab 三個檔案不得再有 '123' 作為密碼值。
 *
 * 取檔方式用 import.meta.glob(?raw)而非 node:fs —— 本專案的 vite-plugin-node-polyfills
 * 會把 node:fs / node:url 換成瀏覽器替身,在測試中無法讀真實檔案。
 *
 * 例外:src/modules/language/ 是五個語系的翻譯字典,其中的 `password:` 是
 * 畫面標籤(如「密碼 (Password)」)而非憑證,故排除於 (b) 之外。
 */

// 以原始字串載入 src 下所有 .js / .jsx(鍵為相對本檔的路徑)
const modules = import.meta.glob('../../**/*.{js,jsx}', { query: '?raw', import: 'default', eager: true });

// 排除 tests/ 自身:glob 鍵是相對本檔的路徑,src/tests 底下的檔案會解析成 './' 或 '../',
// 只有真正在 src/ 其他目錄的檔案才會是 '../../' 開頭。
const sources = Object.entries(modules)
    .filter(([file]) => file.startsWith('../../'))
    .filter(([file]) => !file.includes('/tests/'));

/** 取得單一檔案內容(找不到時回傳 null,供斷言明確指出問題)。 */
const readSource = (suffix) => {
    const found = sources.find(([file]) => file.endsWith(suffix));
    return found ? found[1] : null;
};

describe('前端不得再有硬編碼憑證(S5,AC-44)', () => {
    it('掃描範圍非空(避免測試因路徑錯誤而空轉通過)', () => {
        expect(sources.length).toBeGreaterThan(10);
        expect(sources.some(([f]) => f.endsWith('modules/auth/AuthContext.jsx'))).toBe(true);
        expect(sources.some(([f]) => f.endsWith('modules/auth/LoginModal.jsx'))).toBe(true);
        expect(sources.some(([f]) => f.endsWith('components/settings/GeneralTab.jsx'))).toBe(true);
    });

    // (a)
    it('不得出現曾外洩的密碼字串', () => {
        const hits = sources.filter(([, code]) => code.includes('eric4577599')).map(([f]) => f);
        expect(hits, `以下檔案仍含外洩密碼:${hits.join(', ')}`).toEqual([]);
    });

    // (b)
    it("不得出現 password: '字面值' 的樣式", () => {
        const pattern = /password\s*:\s*['"`]/i;
        const hits = sources
            .filter(([file]) => !file.includes('/modules/language/'))
            .filter(([, code]) => pattern.test(code))
            .map(([f]) => f);
        expect(hits, `以下檔案仍把密碼寫進程式碼:${hits.join(', ')}`).toEqual([]);
    });

    // (c)
    it("AuthContext / LoginModal / GeneralTab 三檔不得出現 '123' 作為密碼值", () => {
        const targets = [
            'modules/auth/AuthContext.jsx',
            'modules/auth/LoginModal.jsx',
            'components/settings/GeneralTab.jsx',
        ];
        for (const suffix of targets) {
            const code = readSource(suffix);
            expect(code, `${suffix} 不存在`).not.toBeNull();
            expect(code.includes("'123'"), `${suffix} 仍含 '123'`).toBe(false);
            expect(/password\s*:/i.test(code), `${suffix} 仍含 password 欄位`).toBe(false);
        }
    });
});
