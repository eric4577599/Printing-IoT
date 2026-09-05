import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * S7 權杖刷新攔截器測試(AC-S7-50 ~ AC-S7-56)。
 *
 * 驗證 E2 的解法:存取權杖到期後,401 先換發再重送原請求,而不是直接把人踢出去。
 * 與 apiAuth.test.js 同樣以假 axios instance 收集攔截器,再直接叫用。
 */

const requestHandlers = [];
const responseHandlers = [];

const mockInstance = {
    get: vi.fn(() => Promise.resolve({ data: null })),
    post: vi.fn(() => Promise.resolve({ data: null })),
    put: vi.fn(() => Promise.resolve({ data: null })),
    delete: vi.fn(() => Promise.resolve({ data: null })),
    request: vi.fn(() => Promise.resolve({ data: 'retried' })),
    interceptors: {
        request: { use: (onFulfilled) => requestHandlers.push(onFulfilled) },
        response: { use: (onFulfilled, onRejected) => responseHandlers.push({ onFulfilled, onRejected }) },
    },
};

vi.mock('axios', () => ({
    default: { create: () => mockInstance },
}));

const { logoutSession } = await import('../../services/api');
const { TOKEN_KEY, REFRESH_TOKEN_KEY, PROFILE_KEY } = await import('../../services/authStorage');

/** 套用回應錯誤攔截器(S7 起為 async)。 */
const applyResponseError = (error) => responseHandlers[0].onRejected(error);

/** 造一個 401 錯誤物件。 */
const unauthorized = (url) => ({ response: { status: 401 }, config: { url } });

/** 種一份含刷新憑證的登入狀態。 */
const seedSession = () => {
    localStorage.setItem(TOKEN_KEY, 'old-access-token');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'old-refresh-token');
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
        username: 'OP1',
        roles: ['OPERATOR'],
        expiresAt: '2026-09-06T00:00:00.000Z',
    }));
};

/** 讓下一次 refresh 呼叫成功回傳新的一組權杖。 */
const mockRefreshSuccess = () => {
    mockInstance.post.mockResolvedValueOnce({
        data: {
            token: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresAt: '2026-09-06T12:00:00.000Z',
        },
    });
};

describe('S7 權杖刷新攔截器', () => {
    beforeEach(() => {
        localStorage.clear();
        mockInstance.post.mockReset().mockResolvedValue({ data: null });
        mockInstance.request.mockReset().mockResolvedValue({ data: 'retried' });
    });

    // AC-S7-50:有刷新憑證時,401 會換發並重送原請求(而不是登出)
    it('401 → 換發成功後重送原請求,且不派發登出事件', async () => {
        seedSession();
        mockRefreshSuccess();

        const listener = vi.fn();
        window.addEventListener('auth:unauthorized', listener);

        const result = await applyResponseError(unauthorized('/orders'));

        expect(mockInstance.post).toHaveBeenCalledWith('/v1/auth/refresh', { refreshToken: 'old-refresh-token' });
        expect(mockInstance.request).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ data: 'retried' });
        expect(listener).not.toHaveBeenCalled();

        window.removeEventListener('auth:unauthorized', listener);
    });

    // AC-S7-51:換發成功後,存取權杖 / 刷新憑證 / 輪廓到期時間三者都要更新
    it('換發成功後三個儲存值一起更新', async () => {
        seedSession();
        mockRefreshSuccess();

        await applyResponseError(unauthorized('/orders'));

        expect(localStorage.getItem(TOKEN_KEY)).toBe('new-access-token');
        // 憑證必須跟著輪替:留著舊的會在下次刷新踩到後端的重用偵測
        expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('new-refresh-token');
        expect(JSON.parse(localStorage.getItem(PROFILE_KEY)).expiresAt).toBe('2026-09-06T12:00:00.000Z');
    });

    // AC-S7-52:沒有刷新憑證(舊階段)→ 維持 S5 行為,直接登出
    it('沒有刷新憑證時不嘗試換發,直接登出', async () => {
        localStorage.setItem(TOKEN_KEY, 'old-access-token');

        const listener = vi.fn();
        window.addEventListener('auth:unauthorized', listener);

        await expect(applyResponseError(unauthorized('/orders'))).rejects.toBeDefined();

        expect(mockInstance.post).not.toHaveBeenCalled();
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
        expect(listener).toHaveBeenCalledTimes(1);

        window.removeEventListener('auth:unauthorized', listener);
    });

    // AC-S7-53:換發失敗 → 清空儲存並派發一次登出事件
    it('換發失敗時登出,且事件只派發一次', async () => {
        seedSession();
        mockInstance.post.mockRejectedValueOnce({ response: { status: 401 } });

        const listener = vi.fn();
        window.addEventListener('auth:unauthorized', listener);

        await expect(applyResponseError(unauthorized('/orders'))).rejects.toBeDefined();

        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
        expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
        expect(listener).toHaveBeenCalledTimes(1);

        window.removeEventListener('auth:unauthorized', listener);
    });

    // AC-S7-54:多個請求同時撞到 401 → 只換發一次
    // 各自換發會讓第二個之後拿到已輪替的舊憑證,踩到後端重用偵測而把整串作廢。
    it('同時多個 401 只觸發一次換發', async () => {
        seedSession();
        mockInstance.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
            data: { token: 'new-access-token', refreshToken: 'new-refresh-token', expiresAt: '2026-09-06T12:00:00.000Z' },
        }), 10)));

        await Promise.all([
            applyResponseError(unauthorized('/orders')),
            applyResponseError(unauthorized('/products')),
            applyResponseError(unauthorized('/reasons')),
        ]);

        const refreshCalls = mockInstance.post.mock.calls.filter(c => c[0] === '/v1/auth/refresh');
        expect(refreshCalls).toHaveLength(1);
        expect(mockInstance.request).toHaveBeenCalledTimes(3); // 三個原請求都要被重送
    });

    // AC-S7-55:重送後仍 401 → 不再換發、不無限迴圈,登出一次
    it('重送後仍 401 不再換發,登出一次', async () => {
        seedSession();
        mockRefreshSuccess();

        const listener = vi.fn();
        window.addEventListener('auth:unauthorized', listener);

        const error = unauthorized('/orders');
        await applyResponseError(error); // 第一次:換發並重送

        mockInstance.post.mockClear();
        await expect(applyResponseError(error)).rejects.toBeDefined(); // 同一個 config 再 401

        expect(mockInstance.post).not.toHaveBeenCalled();
        expect(listener).toHaveBeenCalledTimes(1);

        window.removeEventListener('auth:unauthorized', listener);
    });

    // AC-S7-56:刷新 / 登出端點自己回 401 時不得遞迴自打
    it.each(['/v1/auth/refresh', '/v1/auth/logout'])('%s 回 401 時不觸發另一次換發', async (url) => {
        seedSession();

        await expect(applyResponseError(unauthorized(url))).rejects.toBeDefined();

        expect(mockInstance.post).not.toHaveBeenCalled();
        expect(mockInstance.request).not.toHaveBeenCalled();
    });

    // AC-S7-57:登出打 /v1/auth/logout;後端不可達時不得往上炸(斷網也要登得出去)
    it('logoutSession() 打登出端點,失敗時吞掉錯誤', async () => {
        await logoutSession('some-refresh-token');
        expect(mockInstance.post).toHaveBeenCalledWith('/v1/auth/logout', { refreshToken: 'some-refresh-token' });

        mockInstance.post.mockRejectedValueOnce(new Error('Network Error'));
        await expect(logoutSession('some-refresh-token')).resolves.toBeUndefined();
    });
});
