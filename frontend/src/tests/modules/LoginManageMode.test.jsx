import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * S16 回歸釘樁:登入畫面不得出現維護用的欄位。
 *
 * 背景:登入一次要做四件事 —— 選「當前班別」下拉、點名冊列(順帶填三個編輯欄)、
 * 打密碼、按選取。名冊列本身就帶班別,resolveShiftCode() 也是名冊列優先、
 * 下拉只是退路,所以下拉與編輯欄在登入當下純屬重複點選。
 *
 * 本檔釘住三件事:
 *  1. 登入模式只剩帳號 / 密碼 + 名冊快捷清單,沒有任何維護欄位
 *  2. 「管理者」進得去、「返回登入」回得來,兩邊欄位互不外洩
 *  3. 不點班別下拉也能登入,且班別仍取名冊列的值(收掉下拉沒有弄丟班別)
 */

const loginApi = vi.fn();
vi.mock('../../services/api', () => ({
    login: (...args) => loginApi(...args),
}));

const { AuthProvider, useAuth } = await import('../../modules/auth/AuthContext');
const LoginModal = (await import('../../modules/auth/LoginModal')).default;

/** 把登入後輪廓的班別攤到畫面上供斷言。 */
const Probe = () => {
    const { user } = useAuth();
    return <span data-testid="p-shift">{user?.shift ?? ''}</span>;
};

const renderLogin = () => render(
    <LanguageProvider>
        <MemoryRouter>
            <AuthProvider>
                <Probe />
                <LoginModal isOpen onClose={() => { }} />
            </AuthProvider>
        </MemoryRouter>
    </LanguageProvider>
);

/** 只挑 LABEL,避開同字的表頭(th)。 */
const labels = (text) => screen.queryAllByText(text).filter(el => el.tagName === 'LABEL');

const enterManage = () => fireEvent.click(screen.getByText('管理者 (Admin)'));
const backToLogin = () => fireEvent.click(screen.getByText('返回登入 (Back)'));

describe('S16 登入畫面只剩帳號 / 密碼 + 名冊', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('appUsers', JSON.stringify([
            { id: 'OP1', name: '王小明', username: 'op1', shift: 'A', role: 'OPERATOR' },
        ]));
        loginApi.mockReset();
        loginApi.mockResolvedValue({
            token: 'jwt-token-value',
            username: 'op1',
            roles: ['OPERATOR'],
            displayName: '王小明',
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        });
        vi.spyOn(window, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('登入模式沒有班別下拉、沒有名冊編輯欄', () => {
        renderLogin();

        expect(labels('當前班別 (Current Shift)')).toHaveLength(0);
        expect(labels('代碼')).toHaveLength(0);
        expect(labels('操作員')).toHaveLength(0);
        expect(labels('帳號 (Username)')).toHaveLength(1);
        expect(labels('密碼 (Password)')).toHaveLength(1);
    });

    it('登入模式沒有新增 / 刪除鈕,也沒有班別時段的控制列', () => {
        renderLogin();

        expect(screen.queryByText('新增')).toBeNull();
        expect(screen.queryByText('刪除')).toBeNull();
        expect(screen.queryByText('新增時段')).toBeNull();
        expect(screen.queryByText('自訂時段')).toBeNull();
    });

    it('名冊仍在登入畫面上,點一列照樣填入帳號', () => {
        renderLogin();

        fireEvent.click(screen.getByText('王小明'));
        expect(screen.getByLabelText('帳號 (Username)').value).toBe('op1');
    });

    it('按「管理者」才出現維護欄位,且登入憑證欄同時收起', () => {
        renderLogin();
        enterManage();

        expect(labels('當前班別 (Current Shift)')).toHaveLength(1);
        expect(labels('代碼')).toHaveLength(1);
        expect(screen.getByText('新增')).toBeTruthy();
        expect(screen.getByText('新增時段')).toBeTruthy();
        // 維護模式沒有要送出的憑證,「選取」與帳密欄一併收起
        expect(labels('帳號 (Username)')).toHaveLength(0);
        expect(screen.queryByText('選取 (Select)')).toBeNull();
    });

    it('「返回登入」回得來,帳號 / 密碼欄與選取鈕都在', () => {
        renderLogin();
        enterManage();
        backToLogin();

        expect(labels('帳號 (Username)')).toHaveLength(1);
        expect(screen.getByText('選取 (Select)')).toBeTruthy();
        expect(labels('代碼')).toHaveLength(0);
    });

    it('不碰班別下拉也能登入,班別仍取名冊列的 A —— 收掉下拉沒有弄丟班別', async () => {
        renderLogin();

        fireEvent.click(screen.getByText('王小明'));
        fireEvent.change(screen.getByLabelText('密碼 (Password)'), { target: { value: 'Str0ngPassword!123' } });
        fireEvent.click(screen.getByText('選取 (Select)'));

        await waitFor(() => expect(screen.getByTestId('p-shift').textContent).toBe('A'));
    });
});
