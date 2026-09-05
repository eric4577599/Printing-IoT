import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * S6 v3 回歸釘樁(AC-66 / AC-67):設定 → 一般 → 使用者名冊寫入的 username
 * 必須是**後端帳號(代碼)**,不是顯示名稱。
 *
 * 背景:`localStorage.appUsers` 是同一份資料、兩個元件都會寫 ——
 * 登入視窗的管理者子面板(LoginModal)與本檔測的設定頁(GeneralTab)。
 * v1 只修了 LoginModal,設定頁仍把顯示名稱寫進 username,
 * 管理者從設定頁建立的名冊列一樣會讓作業員點列登入 → 401,
 * 而畫面只說「帳號或密碼錯誤」。本檔走真實 GeneralTab 元件,
 * 直接檢查寫進 localStorage.appUsers 的資料形狀。
 */

// GeneralTab 透過 useReasonCodes 間接使用 services/api,測試中以 mock 取代
const getReasonCodes = vi.fn();
const createReasonCode = vi.fn();
const deleteReasonCode = vi.fn();
vi.mock('../../services/api', () => ({
    getReasonCodes: (...args) => getReasonCodes(...args),
    createReasonCode: (...args) => createReasonCode(...args),
    deleteReasonCode: (...args) => deleteReasonCode(...args),
}));

const GeneralTab = (await import('../../components/settings/GeneralTab')).default;

const renderGeneralTab = () => render(
    <LanguageProvider>
        <GeneralTab />
    </LanguageProvider>
);

/**
 * 取得使用者名冊編輯列的「新增」按鈕。
 * 輸入:無;輸出:該列的 button 元素;
 * 邏輯:「新增」在本頁出現四次(使用者 / 班別 / 停車原因 / 不良原因),
 *       故以代碼欄輸入框的父層 editRow 為錨點,取同層第一顆按鈕。
 */
const rosterAddButton = () =>
    screen.getByPlaceholderText('代碼').parentElement.querySelector('button');

/** 讀回目前寫入 localStorage 的名冊。 */
const storedRoster = () => JSON.parse(localStorage.getItem('appUsers') ?? '[]');

describe('設定頁使用者名冊的 username 來源(S6 v3,D-1)', () => {
    beforeEach(() => {
        localStorage.clear();
        getReasonCodes.mockReset().mockResolvedValue([]);
        createReasonCode.mockReset().mockResolvedValue({});
        deleteReasonCode.mockReset().mockResolvedValue({});
        vi.spyOn(window, 'alert').mockImplementation(() => { });
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    // AC-66:設定頁新增名冊列時,username 取代碼而非顯示名稱
    it('新增名冊列後,該列的 username 是代碼 OP1 而不是顯示名稱', () => {
        renderGeneralTab();

        fireEvent.change(screen.getByPlaceholderText('使用者'), { target: { value: '王小明' } });
        fireEvent.change(screen.getByPlaceholderText('代碼'), { target: { value: 'OP1' } });
        fireEvent.click(rosterAddButton());

        const row = storedRoster().find(u => u.id === 'OP1');
        expect(row).toBeTruthy();
        expect(row.username).toBe('OP1');
        expect(row.username).not.toBe('王小明');
        expect(row.name).toBe('王小明'); // 顯示名稱仍然保留在 name
        expect('password' in row).toBe(false); // AC-61 / AC-68 的順帶保護
    });

    // AC-67:舊列缺 username 時以 id(代碼)遞補,不得用顯示名稱
    it('舊名冊列缺 username 時,掛載設定頁後以代碼遞補', () => {
        localStorage.setItem('appUsers', JSON.stringify([
            { id: 'OP2', name: '李小華' },
        ]));

        renderGeneralTab();

        const row = storedRoster().find(u => u.id === 'OP2');
        expect(row.username).toBe('OP2');
        expect(row.username).not.toBe('李小華');
    });
});
