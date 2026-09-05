import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * S5 api.js 認證攔截器測試(AC-32 ~ AC-37)。
 *
 * api.js 在 import 期就呼叫 axios.create() 並註冊攔截器,因此 mock 的假 instance
 * 必須把註冊進來的攔截器函式收集起來,測試再直接叫用它們來檢查行為。
 */

const requestHandlers = [];
const responseHandlers = [];

const mockInstance = {
    get: vi.fn(() => Promise.resolve({ data: null })),
    post: vi.fn(() => Promise.resolve({ data: null })),
    put: vi.fn(() => Promise.resolve({ data: null })),
    delete: vi.fn(() => Promise.resolve({ data: null })),
    interceptors: {
        request: { use: (onFulfilled) => requestHandlers.push(onFulfilled) },
        response: { use: (onFulfilled, onRejected) => responseHandlers.push({ onFulfilled, onRejected }) },
    },
};

vi.mock('axios', () => ({
    default: { create: () => mockInstance },
}));

const { login, getDocument } = await import('../../services/api');
const { TOKEN_KEY, PROFILE_KEY } = await import('../../services/authStorage');

/** 套用請求攔截器,回傳處理後的 config。 */
const applyRequest = (config) => requestHandlers[0](config);

/** 套用回應錯誤攔截器,回傳被 reject 的 promise(呼叫端自行 catch)。 */
const applyResponseError = (error) => responseHandlers[0].onRejected(error);

describe('api.js 認證攔截器(S5,AC-32 ~ AC-37)', () => {
    beforeEach(() => {
        localStorage.clear();
        mockInstance.post.mockClear();
        mockInstance.get.mockClear();
    });

    // AC-32
    it('有權杖時,請求帶上 Authorization: Bearer <token>', () => {
        localStorage.setItem(TOKEN_KEY, 'token-abc');

        const config = applyRequest({ url: '/orders', headers: {} });

        expect(config.headers.Authorization).toBe('Bearer token-abc');
    });

    // AC-33
    it('無權杖時,headers 不含 Authorization 鍵', () => {
        const config = applyRequest({ url: '/orders', headers: {} });

        expect(Object.keys(config.headers)).not.toContain('Authorization');
    });

    // AC-34
    it('login() 打 /v1/auth/login,body 為 { username, password }', async () => {
        mockInstance.post.mockResolvedValueOnce({ data: { token: 't' } });

        await login('u', 'p');

        expect(mockInstance.post).toHaveBeenCalledWith('/v1/auth/login', { username: 'u', password: 'p' });
    });

    // AC-35
    it('非登入端點回 401 → 清除權杖並派發一次 auth:unauthorized', async () => {
        localStorage.setItem(TOKEN_KEY, 'token-abc');
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ username: 'u' }));

        const listener = vi.fn();
        window.addEventListener('auth:unauthorized', listener);

        await expect(applyResponseError({ response: { status: 401 }, config: { url: '/orders' } })).rejects.toBeDefined();

        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
        expect(listener).toHaveBeenCalledTimes(1);

        window.removeEventListener('auth:unauthorized', listener);
    });

    // AC-36
    it('登入端點回 401 → 不派發 auth:unauthorized(避免全域登出風暴)', async () => {
        localStorage.setItem(TOKEN_KEY, 'token-abc');

        const listener = vi.fn();
        window.addEventListener('auth:unauthorized', listener);

        await expect(
            applyResponseError({ response: { status: 401 }, config: { url: '/v1/auth/login' } })
        ).rejects.toBeDefined();

        expect(listener).not.toHaveBeenCalled();
        expect(localStorage.getItem(TOKEN_KEY)).toBe('token-abc');

        window.removeEventListener('auth:unauthorized', listener);
    });

    // AC-37
    it('無 error.response(網路錯誤)→ 權杖未被清除、事件未派發', async () => {
        localStorage.setItem(TOKEN_KEY, 'token-abc');

        const listener = vi.fn();
        window.addEventListener('auth:unauthorized', listener);

        await expect(
            applyResponseError({ message: 'Network Error', config: { url: '/orders' } })
        ).rejects.toBeDefined();

        expect(localStorage.getItem(TOKEN_KEY)).toBe('token-abc');
        expect(listener).not.toHaveBeenCalled();

        window.removeEventListener('auth:unauthorized', listener);
    });

    // 補充:403 身分有效但權限不足,不得清除權杖
    it('回 403 → 不清除權杖、不派發事件', async () => {
        localStorage.setItem(TOKEN_KEY, 'token-abc');

        const listener = vi.fn();
        window.addEventListener('auth:unauthorized', listener);

        await expect(
            applyResponseError({ response: { status: 403 }, config: { url: '/settings/communication' } })
        ).rejects.toBeDefined();

        expect(localStorage.getItem(TOKEN_KEY)).toBe('token-abc');
        expect(listener).not.toHaveBeenCalled();

        window.removeEventListener('auth:unauthorized', listener);
    });

    // S5 修正:/api/docs 已加 [Authorize],取文件必須走 axios instance 才會帶權杖
    it('getDocument() 走 axios instance,打 /docs/<encoded> 且指定 responseType text', async () => {
        mockInstance.get.mockResolvedValueOnce({ data: '# 標題' });

        const text = await getDocument('操作說明書.md');

        expect(mockInstance.get).toHaveBeenCalledWith(
            `/docs/${encodeURIComponent('操作說明書.md')}`,
            { responseType: 'text' }
        );
        expect(text).toBe('# 標題');
    });

    it('getDocument() 的請求經攔截器後帶有 Authorization 標頭', () => {
        localStorage.setItem(TOKEN_KEY, 'token-docs');

        // 模擬 axios 內部對 get(url, config) 組出的請求設定
        const config = applyRequest({
            url: `/docs/${encodeURIComponent('HANDOVER.md')}`,
            method: 'get',
            responseType: 'text',
            headers: {},
        });

        expect(config.headers.Authorization).toBe('Bearer token-docs');
    });
});
