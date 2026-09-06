import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';

/**
 * S5 AuthContext 測試(AC-38 ~ AC-42)。
 *
 * 重點:登入成功後 localStorage 只留權杖與白名單輪廓(絕不含密碼)、
 * 模組不再匯出 USERS / loginDirect、掛載還原與過期清除、以及全域 401 事件的同步。
 */

const loginApi = vi.fn();
vi.mock('../../services/api', () => ({
    login: (...args) => loginApi(...args),
}));

const AuthModule = await import('../../modules/auth/AuthContext');
const { AuthProvider, useAuth } = AuthModule;

/** 把 context 內容攤到畫面上,供斷言使用。 */
const Probe = () => {
    const { user, login, isAuthenticated } = useAuth();
    return (
        <div>
            <span data-testid="user">{user ? user.username : 'NONE'}</span>
            <span data-testid="authed">{String(isAuthenticated)}</span>
            <button onClick={() => login('op1', 'Str0ngPassword!123')}>do-login</button>
        </div>
    );
};

const renderProvider = () => render(<AuthProvider><Probe /></AuthProvider>);

/** 收集目前 localStorage 全部值的字串,用於「不得含密碼」的整體掃描。 */
const dumpStorage = () => {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        out.push(`${key}=${localStorage.getItem(key)}`);
    }
    return out.join('\n');
};

describe('AuthContext(S5,AC-38 ~ AC-42)', () => {
    beforeEach(() => {
        localStorage.clear();
        loginApi.mockReset();
    });

    afterEach(() => {
        localStorage.clear();
    });

    // AC-38
    it('login() 成功後只存權杖與白名單輪廓,localStorage 內不存在 password 鍵或密碼字串', async () => {
        const password = 'Str0ngPassword!123';
        loginApi.mockResolvedValue({
            token: 'jwt-token-value',
            username: 'op1',
            roles: ['OPERATOR'],
            displayName: '一號作業員',
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        });

        renderProvider();
        await act(async () => {
            screen.getByText('do-login').click();
        });

        await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('op1'));

        expect(localStorage.getItem('authToken')).toBe('jwt-token-value');

        const dump = dumpStorage();
        expect(dump).not.toContain('password');
        expect(dump).not.toContain(password);
    });

    // AC-39
    it('模組匯出中不存在 USERS,亦不存在 loginDirect', () => {
        expect(AuthModule.USERS).toBeUndefined();
        expect(AuthModule.loginDirect).toBeUndefined();
        expect(Object.keys(AuthModule)).not.toContain('USERS');
        expect(Object.keys(AuthModule)).not.toContain('loginDirect');
    });

    // AC-40
    it('無儲存權杖時掛載 → user 為 null,且未打任何登入請求(開發自動登入預設關閉)', async () => {
        renderProvider();

        expect(screen.getByTestId('user').textContent).toBe('NONE');
        expect(screen.getByTestId('authed').textContent).toBe('false');
        expect(loginApi).not.toHaveBeenCalled();
    });

    // AC-41
    it('儲存輪廓的 expiresAt 已過期 → 掛載後 user 為 null 且儲存被清空', () => {
        localStorage.setItem('authToken', 'stale-token');
        localStorage.setItem('authUser', JSON.stringify({
            username: 'op1',
            roles: ['OPERATOR'],
            expiresAt: new Date(Date.now() - 60_000).toISOString(),
        }));

        renderProvider();

        expect(screen.getByTestId('user').textContent).toBe('NONE');
        expect(localStorage.getItem('authToken')).toBeNull();
        expect(localStorage.getItem('authUser')).toBeNull();
    });

    // AC-42
    it('收到 auth:unauthorized 事件 → user 轉為 null', async () => {
        localStorage.setItem('authToken', 'valid-token');
        localStorage.setItem('authUser', JSON.stringify({
            username: 'op1',
            roles: ['OPERATOR'],
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        }));

        renderProvider();
        expect(screen.getByTestId('user').textContent).toBe('op1');

        await act(async () => {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        });

        expect(screen.getByTestId('user').textContent).toBe('NONE');
    });

    // 補充:舊版遺留的 currentUser(含明文密碼)在掛載時就會被清掉(E13)
    it('掛載時清除舊鍵 currentUser', () => {
        localStorage.setItem('currentUser', JSON.stringify({ id: 'admin', password: 'legacy-plain' }));

        renderProvider();

        expect(localStorage.getItem('currentUser')).toBeNull();
    });

    // 補充:密碼錯誤(401)回 reason 'invalid';後端不可達回 'network'
    it('login() 失敗時回傳可辨識的 reason', async () => {
        let result;
        const Capture = () => {
            const { login } = useAuth();
            return <button onClick={async () => { result = await login('u', 'p'); }}>go</button>;
        };

        loginApi.mockRejectedValueOnce({ response: { status: 401 } });
        render(<AuthProvider><Capture /></AuthProvider>);
        await act(async () => { screen.getByText('go').click(); });
        expect(result).toEqual({ ok: false, reason: 'invalid' });

        loginApi.mockRejectedValueOnce({ message: 'Network Error' });
        await act(async () => { screen.getByText('go').click(); });
        expect(result).toEqual({ ok: false, reason: 'network' });
    });
});
