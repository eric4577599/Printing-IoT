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
        }
    });

    // (d) AuthContext / LoginModal 完全不該有 password 欄位:
    //     前者只把密碼當參數轉手給 api.login,後者只有受控輸入框。
    it('AuthContext / LoginModal 不得出現 password 欄位', () => {
        for (const suffix of ['modules/auth/AuthContext.jsx', 'modules/auth/LoginModal.jsx']) {
            const code = readSource(suffix);
            expect(code, `${suffix} 不存在`).not.toBeNull();
            // \b 是必要的:沒有它,`isAdminMode ? loginPassword : X` 這種三元運算
            // 會被當成 password 欄位誤報,而那既不是欄位也沒有值落地。
            expect(/\bpassword\s*:/i.test(code), `${suffix} 仍含 password 欄位`).toBe(false);
        }
    });

    // (d-2) S17:LoginModal 刻意帶一個作業員約定密碼(DEFAULT_OPERATOR_PASSWORD)。
    //       它不是外洩憑證,是全廠約定值 —— 但**只准有這一個**,而且只准是那個常數,
    //       否則這個豁免會變成「以後想寫死什麼都可以」的破口。
    it("LoginModal 的硬編碼密碼僅限 DEFAULT_OPERATOR_PASSWORD 一個", () => {
        const code = readSource('modules/auth/LoginModal.jsx');
        expect(code, 'LoginModal.jsx 不存在').not.toBeNull();

        // 宣告樣式必須完全吻合(常數名 + 單引號字面值),換個名字或多寫一個都會被抓到
        const declarations = code.match(/const\s+DEFAULT_OPERATOR_PASSWORD\s*=\s*'[^']*';/g) ?? [];
        expect(declarations.length, '預設密碼常數的宣告不是剛好一個').toBe(1);

        // 除了該常數之外,不得再有第二個被當成密碼送出的字面值
        const literalPasswordCalls = code.match(/login\([^)]*,\s*['"`]/g) ?? [];
        expect(literalPasswordCalls, '有把密碼字面值直接送進 login()').toEqual([]);
    });

    // (d-3) 約定密碼不得落地 —— 它雖然不是秘密,寫進 localStorage 只會多一份會漂掉的副本
    it('LoginModal 不把密碼寫進 localStorage', () => {
        const code = readSource('modules/auth/LoginModal.jsx');
        const isComment = (line) => /^\s*(\/\/|\/\*|\*)/.test(line);

        const offending = code
            .split('\n')
            .map((line, i) => [i + 1, line])
            .filter(([, line]) => !isComment(line))
            .filter(([, line]) => line.includes('localStorage') && /password/i.test(line))
            .map(([n]) => n);

        expect(offending, `以下行號同時碰 localStorage 與密碼:${offending.join(', ')}`).toEqual([]);
    });

    // (e) GeneralTab 自 S7 起必須把密碼送去 POST/PUT /v1/auth/users,
    //     因此不能再用「有沒有 password 欄位」當判準 —— 那會把正當的建立帳號一併擋掉。
    //     真正的不變量是**密碼絕不落地**:任何一行只要碰 localStorage 就不得同時碰密碼。
    it('GeneralTab 的密碼絕不寫入 localStorage', () => {
        const code = readSource('components/settings/GeneralTab.jsx');
        expect(code, 'GeneralTab.jsx 不存在').not.toBeNull();

        // 註解行不算:說明「不得存密碼」的註解本身就會同時出現這兩個詞
        const isComment = (line) => /^\s*(\/\/|\/\*|\*)/.test(line);

        const offending = code
            .split('\n')
            .map((line, i) => [i + 1, line])
            .filter(([, line]) => !isComment(line))
            .filter(([, line]) => line.includes('localStorage') && /password/i.test(line))
            .map(([n]) => n);

        expect(offending, `以下行號同時碰 localStorage 與密碼:${offending.join(', ')}`).toEqual([]);

        // 名冊快取的白名單投影不得出現 password 欄位(這是實際寫進去的那一份)
        const cacheProjection = code.match(/const toRosterCache[\s\S]*?\n\n/)?.[0] ?? '';
        expect(cacheProjection, 'toRosterCache 投影未找到').not.toBe('');
        expect(/password/i.test(cacheProjection), '名冊快取投影含密碼欄位').toBe(false);
    });
});
