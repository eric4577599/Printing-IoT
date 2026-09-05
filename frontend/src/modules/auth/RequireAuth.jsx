import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLanguage } from '../language/LanguageContext';
import LoginModal from './LoginModal';

/**
 * RequireAuth — 路由層級的登入 / 角色守門(S5)。
 *
 * 輸入:
 *   roles    —— 允許的角色代碼陣列(選填);未給時只要求「已登入」。
 *   children —— 受保護的內容。
 * 輸出:
 *   未登入 → 登入畫面(不 render children);
 *   角色不符 → 403 提示區塊 +「回首頁」連結(不 render children);
 *   通過 → children。
 * 邏輯:角色比對交給 AuthContext 的 hasRole(大寫比對,不做層級推導)。
 *
 * S7:403 區塊的三句文案改走 t()。狀態碼「403」本身刻意不進語系檔 ——
 * 它是 HTTP 標準碼不是文案,翻譯它只會讓現場回報問題時說不出同一個號碼。
 */
const RequireAuth = ({ roles, children }) => {
    const { user, hasRole } = useAuth();
    const { t } = useLanguage();

    if (!user) {
        return <LoginModal isOpen onClose={() => { }} />;
    }

    if (Array.isArray(roles) && roles.length > 0 && !hasRole(...roles)) {
        return (
            <div style={{ padding: 24 }}>
                <h2 style={{ margin: '0 0 8px' }}>403</h2>
                <p style={{ margin: '0 0 4px' }}>{t('authGuard.forbidden')}</p>
                <p style={{ margin: '0 0 12px', opacity: 0.75 }}>{t('authGuard.forbiddenHint')}</p>
                <Link to="/">{t('authGuard.backHome')}</Link>
            </div>
        );
    }

    return children;
};

export default RequireAuth;
