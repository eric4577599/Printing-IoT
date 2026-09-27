import { describe, it, expect } from 'vitest';

/**
 * B15:現場作業路徑(看板、完工視窗、登入)不得使用 alert()。
 *
 * alert() 會凍結整個分頁:對真人只是多點一下,對瀏覽器自動化與 e2e 是直接失去回應,
 * 只能關掉分頁。2026-09-16 實機驗收兩度撞到。這類回歸在單元測試裡不會顯現
 * (jsdom 的 alert 不會卡),因此用靜態掃描把它擋在版控之前。
 *
 * 範圍刻意只限作業員會碰到的檔案;設定頁(管理者)的 alert 另案處理。
 * 取檔方式與 noBareApiFetch.test.js 一致(import.meta.glob ?raw)。
 */

const modules = import.meta.glob('../../**/*.{js,jsx}', { query: '?raw', import: 'default', eager: true });

const SHOP_FLOOR_FILES = [
    'pages/Dashboard.jsx',
    'components/modals/FinishOrderModal.jsx',
    'modules/auth/LoginModal.jsx',
];

// 帶引數的 alert 呼叫;要求括號內有東西,放過註解裡「不再用 alert()」這類描述
const ALERT_CALL = /(?<![.\w])(?:window\.)?alert\s*\(\s*[^)\s]/;

describe('現場作業路徑不得使用 alert()(B15)', () => {
    it.each(SHOP_FLOOR_FILES)('%s 存在於掃描範圍(避免空轉通過)', (file) => {
        expect(Object.keys(modules).some(f => f.endsWith(file))).toBe(true);
    });

    it.each(SHOP_FLOOR_FILES)('%s 沒有 alert() 呼叫', (file) => {
        const [, code] = Object.entries(modules).find(([f]) => f.endsWith(file));
        const lines = code.split('\n')
            .map((line, i) => [i + 1, line])
            .filter(([, line]) => ALERT_CALL.test(line));
        expect(lines, `請改用畫面訊息(useTransientNotice 或視窗內錯誤列):${JSON.stringify(lines)}`).toEqual([]);
    });
});
