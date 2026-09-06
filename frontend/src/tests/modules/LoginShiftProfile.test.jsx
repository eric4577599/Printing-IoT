import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * S5 回歸釘樁:登入後輪廓必須同時具備 MainLayout 狀態列依賴的 name / role / shift。
 *
 * 背景:改版前 loginDirect 會把名冊列(含 shift: 'A'/'B'/'C')整包塞進 user,
 * 狀態列 `Operator: {user.name} (Shift: {user.shift}) ({user.role})` 因此有值;
 * 改版後只寫 sessionShift,`user.shift` 對所有使用者永久為空 —— 三班制現場看得到的回歸。
 * 本檔走「真實 LoginModal + AuthProvider」的完整登入路徑,避免只測 context 內部而漏掉接線。
 */

const loginApi = vi.fn();
vi.mock('../../services/api', () => ({
    login: (...args) => loginApi(...args),
}));

const { AuthProvider, useAuth } = await import('../../modules/auth/AuthContext');
const LoginModal = (await import('../../modules/auth/LoginModal')).default;

/** 把 MainLayout 狀態列會讀到的三個欄位攤到畫面上,供斷言使用。 */
const Probe = () => {
    const { user } = useAuth();
    return (
        <div>
            <span data-testid="p-name">{user?.name ?? ''}</span>
            <span data-testid="p-role">{user?.role ?? ''}</span>
            <span data-testid="p-shift">{user?.shift ?? ''}</span>
        </div>
    );
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

/** 以 tw 語系的實際字串取得密碼欄與「選取」鈕,並送出一次登入。 */
const submitLogin = (password) => {
    fireEvent.change(screen.getByLabelText('密碼 (Password)'), { target: { value: password } });
    fireEvent.click(screen.getByText('選取 (Select)'));
};

describe('登入後輪廓的 name / role / shift(S5 狀態列回歸)', () => {
    beforeEach(() => {
        localStorage.clear();
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

    it('點選名冊列登入後,name / role / shift 皆非空,且 shift 為該列的班別代碼', async () => {
        localStorage.setItem('appUsers', JSON.stringify([
            { id: 'OP1', name: '王小明', username: 'op1', shift: 'A', role: 'OPERATOR' },
        ]));

        renderLogin();

        // 點名冊列只會填入帳號,密碼仍必須手動輸入
        fireEvent.click(screen.getByText('王小明'));
        submitLogin('Str0ngPassword!123');

        await waitFor(() => expect(screen.getByTestId('p-name').textContent).toBe('王小明'));
        expect(screen.getByTestId('p-role').textContent).toBe('OPERATOR');
        expect(screen.getByTestId('p-shift').textContent).toBe('A');

        // 班別必須一併持存,重新整理後狀態列才不會又變空
        const stored = JSON.parse(localStorage.getItem('authUser'));
        expect(stored.shift).toBe('A');
        expect(stored.sessionShift).toBe('A');
        // 白名單仍然生效:密碼不得進入儲存
        expect(localStorage.getItem('authUser')).not.toContain('Str0ngPassword');
    });

    it('手動輸入帳號(名冊未選)登入後,shift 退回目前班別代碼而非空字串', async () => {
        renderLogin();

        fireEvent.change(screen.getByLabelText('帳號 (Username)'), { target: { value: 'op1' } });
        submitLogin('Str0ngPassword!123');

        await waitFor(() => expect(screen.getByTestId('p-name').textContent).toBe('王小明'));
        expect(screen.getByTestId('p-role').textContent).toBe('OPERATOR');
        // 預設班別為 DAY / NIGHT(依登入當下時段自動判定),重點是不得為空
        expect(['DAY', 'NIGHT']).toContain(screen.getByTestId('p-shift').textContent);
    });
});
