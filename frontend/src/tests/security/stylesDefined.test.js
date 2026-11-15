import { describe, it, expect } from 'vitest';
import settingsJsx from '../../pages/SettingsPage.jsx?raw';
import debugJsx from '../../components/debug/DebugPanel.jsx?raw';

/**
 * 回歸釘樁:
 *  ① 頁面用到的 CSS Module 類別必須在 .module.css 裡定義。
 *     SettingsPage 的 sidebar / menuItem 曾整段遺失(只剩「skipped sidebar」註解),
 *     左側選單變成沒有樣式的小字清單,而且沒有任何測試或錯誤提示。
 *  ② JSX 字串裡不可寫 HTML 實體:'&gt;' 在 JS 字串中不會被解碼,畫面會顯示字面的「&gt;」。
 */
// CSS Module 在 vitest 下不會回傳原始字串(?raw 會被當成模組處理),改用 Node 內建模組直接讀檔(測試自 frontend 目錄執行,路徑相對於它)
const fs = process.getBuiltinModule('node:fs');
const settingsCss = fs.readFileSync('src/pages/SettingsPage.module.css', 'utf-8');

const usedClasses = (jsx) => [...new Set([...jsx.matchAll(/styles\.([A-Za-z_]\w*)/g)].map(m => m[1]))];
const definedClasses = (css) => new Set([...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]));

describe('SettingsPage 樣式類別都有定義', () => {
    const defined = definedClasses(settingsCss);
    for (const cls of usedClasses(settingsJsx)) {
        it(`styles.${cls}`, () => {
            expect(defined.has(cls)).toBe(true);
        });
    }
});

describe('JSX 字串不含 HTML 實體', () => {
    it('DebugPanel 的按鈕符號是一般字元', () => {
        expect(debugJsx).not.toMatch(/'&(lt|gt|amp);'/);
    });
});
