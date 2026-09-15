import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * S6 回歸釘樁:名冊列的 username 必須是**後端帳號(代碼)**,不是顯示名稱。
 *
 * 背景:S5 的 handleAddUser 把顯示名稱寫進 username(`username: newUserName`),
 * 點名冊列會把「王小明」填進登入帳號欄,送出後端必然 401 ——
 * 而畫面只說「帳號或密碼錯誤」,現場停線且無人猜得到原因。
 * 本檔走真實 LoginModal,直接檢查寫入 localStorage.appUsers 的資料形狀。
 */

const loginApi = vi.fn();
vi.mock('../../services/api', () => ({
    login: (...args) => loginApi(...args),
}));

const { AuthProvider } = await import('../../modules/auth/AuthContext');
const LoginModal = (await import('../../modules/auth/LoginModal')).default;

const renderLogin = () => render(
    <LanguageProvider>
        <MemoryRouter>
            <AuthProvider>
                <LoginModal isOpen onClose={() => { }} />
            </AuthProvider>
        </MemoryRouter>
    </LanguageProvider>
);

/**
 * 取得名冊列上的就地編輯欄。
 * 輸入:tw 語系的欄位標籤;輸出:該欄的 input;
 * 邏輯:S17 起編輯欄長在表格列上(草稿列或選取中的列),以 aria-label 取用。
 *       同時間只會有一組編輯欄,因此 getByLabelText 必然唯一。
 */
const cellInput = (labelText) => screen.getByLabelText(labelText);

/** S17:按名冊表底部的「+」長出一列空白可編輯列。 */
const startDraft = () => fireEvent.click(screen.getByLabelText('新增一列'));

/** 讀回目前寫入 localStorage 的名冊。 */
const storedRoster = () => JSON.parse(localStorage.getItem('appUsers') ?? '[]');

describe('登入名冊的 username 來源(S6 缺口 G-1 的順帶修正)', () => {
    beforeEach(() => {
        localStorage.clear();
        loginApi.mockReset();
        vi.spyOn(window, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    // AC-59:新增名冊列時,username 取代碼而非顯示名稱
    it('新增名冊列後,該列的 username 是代碼 OP1 而不是顯示名稱', () => {
        renderLogin();

        startDraft();
        fireEvent.change(cellInput('代碼'), { target: { value: 'OP1' } });
        fireEvent.change(cellInput('操作員'), { target: { value: '王小明' } });
        fireEvent.click(screen.getByText('新增'));

        const row = storedRoster().find(u => u.id === 'OP1');
        expect(row).toBeTruthy();
        expect(row.username).toBe('OP1');
        expect(row.username).not.toBe('王小明');
        expect(row.name).toBe('王小明'); // 顯示名稱仍然保留在 name
    });

    // AC-60:舊列缺 username 時以 id(代碼)遞補,不得用顯示名稱
    it('舊名冊列缺 username 時,載入後以代碼遞補', () => {
        localStorage.setItem('appUsers', JSON.stringify([
            { id: 'OP2', name: '李小華' },
        ]));

        renderLogin();

        const row = storedRoster().find(u => u.id === 'OP2');
        expect(row.username).toBe('OP2');
        expect(row.username).not.toBe('李小華');
    });

    // AC-61:名冊列永遠不得含 password 欄位(S5 E14 的回歸保護)
    it('名冊列不含 password 欄位,舊資料的 password 也會被剝除', () => {
        localStorage.setItem('appUsers', JSON.stringify([
            { id: 'OP3', name: '陳小美', password: '1234' },
        ]));

        renderLogin();

        expect(storedRoster().every(u => !('password' in u))).toBe(true);
        expect(localStorage.getItem('appUsers')).not.toContain('1234');

        // 新增的列同樣不得帶入 password
        startDraft();
        fireEvent.change(cellInput('代碼'), { target: { value: 'OP4' } });
        fireEvent.change(cellInput('操作員'), { target: { value: '林小龍' } });
        fireEvent.click(screen.getByText('新增'));

        expect(storedRoster().every(u => !('password' in u))).toBe(true);
    });
});
