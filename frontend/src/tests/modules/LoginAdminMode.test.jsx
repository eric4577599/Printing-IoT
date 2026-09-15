import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * S17 釘樁:管理者模式才有密碼欄、作業員一鍵登入(spec20260915-1 AC-08 ~ AC-15)。
 *
 * 現場換班登入原本要做四件事(選班別、點名冊、打密碼、按選取),
 * 其中只有密碼是真正的驗證,而觸控機台沒有實體鍵盤,12 碼英數根本打不動。
 * 改法是密碼的**來源**依模式分流,驗證路徑仍然只有 POST /api/v1/auth/login 一條。
 */

const loginApi = vi.fn();
vi.mock('../../services/api', () => ({
    login: (...args) => loginApi(...args),
}));

const { AuthProvider } = await import('../../modules/auth/AuthContext');
const LoginModalModule = await import('../../modules/auth/LoginModal');
const LoginModal = LoginModalModule.default;
const { DEFAULT_OPERATOR_PASSWORD } = LoginModalModule;

const renderLogin = () => render(
    <LanguageProvider>
        <MemoryRouter>
            <AuthProvider>
                <LoginModal isOpen onClose={() => { }} />
            </AuthProvider>
        </MemoryRouter>
    </LanguageProvider>
);

const passwordField = () => screen.queryByLabelText('密碼 (Password)');
const usernameField = () => screen.getByLabelText('帳號 (Username)');
const enterAdminMode = () => fireEvent.click(screen.getByText('管理者 (Admin)'));
const backToOperator = () => fireEvent.click(screen.getByText('返回 (Back)'));
const select = () => fireEvent.click(screen.getByText('選取 (Select)'));

const ROSTER = [{ id: 'OP1', name: '王小明', username: 'OP1', shift: 'A', role: 'OPERATOR' }];

/** 一次成功登入的後端回應。 */
const okLogin = {
    token: 'jwt-token-value',
    username: 'OP1',
    roles: ['OPERATOR'],
    displayName: '王小明',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
};

describe('S17 密碼欄只在管理者模式出現', () => {
    beforeEach(() => {
        localStorage.clear();
        loginApi.mockReset();
        loginApi.mockResolvedValue(okLogin);
        vi.spyOn(window, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    // AC-08
    it('初始畫面查無密碼欄', () => {
        renderLogin();
        expect(passwordField()).toBeNull();
        expect(usernameField()).toBeTruthy(); // 帳號欄照常在
    });

    // AC-09
    it('按「管理者」密碼欄才出現,按「返回」又收起來', () => {
        renderLogin();

        enterAdminMode();
        expect(passwordField()).toBeTruthy();
        expect(passwordField().value).toBe('');

        backToOperator();
        expect(passwordField()).toBeNull();
    });

    it('離開管理者模式會清掉已輸入的密碼,不留殘值', () => {
        renderLogin();

        enterAdminMode();
        fireEvent.change(passwordField(), { target: { value: 'Str0ngPassword!123' } });
        backToOperator();
        enterAdminMode();

        expect(passwordField().value).toBe('');
    });

    // AC-10
    it('作業模式:點名冊列再按「選取」即登入,密碼帶約定值', async () => {
        localStorage.setItem('appUsers', JSON.stringify(ROSTER));
        renderLogin();

        fireEvent.click(screen.getByText('王小明'));
        select();

        await waitFor(() => expect(loginApi).toHaveBeenCalledTimes(1));
        expect(loginApi).toHaveBeenCalledWith('OP1', DEFAULT_OPERATOR_PASSWORD);
        expect(DEFAULT_OPERATOR_PASSWORD).toBe('0000');
    });

    // AC-11
    it('管理者模式:送出的是輸入值,不是約定值', async () => {
        renderLogin();

        enterAdminMode();
        fireEvent.change(usernameField(), { target: { value: 'admin' } });
        fireEvent.change(passwordField(), { target: { value: 'Str0ngPassword!123' } });
        select();

        await waitFor(() => expect(loginApi).toHaveBeenCalledTimes(1));
        expect(loginApi).toHaveBeenCalledWith('admin', 'Str0ngPassword!123');
    });

    it('管理者模式密碼空白時不打後端,畫面直接說明', async () => {
        renderLogin();

        enterAdminMode();
        fireEvent.change(usernameField(), { target: { value: 'admin' } });
        select();

        expect(loginApi).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toMatch(/帳號或密碼錯誤/);
    });

    it('作業模式帳號空白時不打後端 —— 名冊沒點就按選取是常見誤觸', () => {
        renderLogin();
        select();
        expect(loginApi).not.toHaveBeenCalled();
    });
});

describe('S17 登入失敗改用畫面訊息', () => {
    beforeEach(() => {
        localStorage.clear();
        loginApi.mockReset();
        vi.spyOn(window, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    /** 造一個帶 HTTP 狀態碼的錯誤,形狀與 axios 相同。 */
    const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

    it('401 顯示帳號或密碼錯誤,且不呼叫 alert(alert 會卡住整個分頁)', async () => {
        localStorage.setItem('appUsers', JSON.stringify(ROSTER));
        loginApi.mockRejectedValue(httpError(401));
        renderLogin();

        fireEvent.click(screen.getByText('王小明'));
        select();

        await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/帳號或密碼錯誤/));
        expect(window.alert).not.toHaveBeenCalled();
    });

    // 登入額度是整廠共用一個桶(report20260907-1),一鍵登入讓誤觸變容易 ——
    // 429 若照 401 顯示,現場會一直重打「正確的」密碼。
    it('429 要與帳號密碼錯誤分開說', async () => {
        localStorage.setItem('appUsers', JSON.stringify(ROSTER));
        loginApi.mockRejectedValue(httpError(429));
        renderLogin();

        fireEvent.click(screen.getByText('王小明'));
        select();

        await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/過於頻繁/));
    });

    it('重新輸入帳號會收掉錯誤訊息', async () => {
        loginApi.mockRejectedValue(httpError(401));
        renderLogin();

        fireEvent.change(usernameField(), { target: { value: 'OP1' } });
        select();
        await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());

        fireEvent.change(usernameField(), { target: { value: 'OP2' } });
        expect(screen.queryByRole('alert')).toBeNull();
    });
});

describe('S17 五語系字串齊備(AC-15)', () => {
    it('每個語系都有 btn.back / btn.addRow / alert.tooManyAttempts', async () => {
        const { translations } = await import('../../modules/language/LanguageContext');
        const languages = Object.keys(translations);
        expect(languages.length).toBeGreaterThanOrEqual(5);

        for (const lang of languages) {
            const login = translations[lang].login;
            for (const [group, key] of [['btn', 'back'], ['btn', 'addRow'], ['alert', 'tooManyAttempts']]) {
                const value = login?.[group]?.[key];
                expect(typeof value, `${lang}.login.${group}.${key} 缺少或非字串`).toBe('string');
                expect(value.trim().length, `${lang}.login.${group}.${key} 是空字串`).toBeGreaterThan(0);
            }
        }
    });
});
