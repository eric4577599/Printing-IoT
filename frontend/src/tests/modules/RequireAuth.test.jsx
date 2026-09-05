import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * S5 RequireAuth 測試(AC-43)。
 *
 * 三種狀態:未登入顯示登入畫面、角色不足顯示 403、角色符合才渲染子元件。
 * api 模組以 mock 取代,避免 AuthContext 在測試中真的送出 HTTP 請求。
 */

vi.mock('../../services/api', () => ({
    login: vi.fn(),
}));

const { AuthProvider } = await import('../../modules/auth/AuthContext');
const RequireAuth = (await import('../../modules/auth/RequireAuth')).default;

/** 在 localStorage 種一份未過期的登入輪廓。 */
const seedAuth = (role) => {
    localStorage.setItem('authToken', 'seeded-token');
    localStorage.setItem('authUser', JSON.stringify({
        username: 'tester',
        displayName: '測試員',
        roles: [role],
        role,
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    }));
};

const renderGuarded = (roles) => render(
    <LanguageProvider>
        <MemoryRouter>
            <AuthProvider>
                <RequireAuth roles={roles}>
                    <div>SECRET_CONTENT</div>
                </RequireAuth>
            </AuthProvider>
        </MemoryRouter>
    </LanguageProvider>
);

describe('RequireAuth(S5,AC-43)', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('未登入 → 子元件不出現、登入畫面出現', () => {
        renderGuarded(['ADMIN', 'ENGINEER']);

        expect(screen.queryByText('SECRET_CONTENT')).toBeNull();
        // LoginModal 的管理者按鈕文字,用來確認登入畫面確實被渲染
        expect(screen.getByText('管理者 (Admin)')).toBeTruthy();
    });

    it('已登入但角色不足 → 子元件不出現、出現 403', () => {
        seedAuth('OPERATOR');
        renderGuarded(['ADMIN', 'ENGINEER']);

        expect(screen.queryByText('SECRET_CONTENT')).toBeNull();
        expect(screen.getByText('403')).toBeTruthy();
    });

    it('已登入且角色符合 → 子元件出現', () => {
        seedAuth('ENGINEER');
        renderGuarded(['ADMIN', 'ENGINEER']);

        expect(screen.getByText('SECRET_CONTENT')).toBeTruthy();
        expect(screen.queryByText('403')).toBeNull();
    });

    it('未指定 roles → 只要已登入即渲染子元件', () => {
        seedAuth('OPERATOR');
        renderGuarded(undefined);

        expect(screen.getByText('SECRET_CONTENT')).toBeTruthy();
    });
});
