import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
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
 */
const RequireAuth = ({ roles, children }) => {
    const { user, hasRole } = useAuth();

    if (!user) {
        return <LoginModal isOpen onClose={() => { }} />;
    }

    if (Array.isArray(roles) && roles.length > 0 && !hasRole(...roles)) {
        return (
            <div style={{ padding: 24 }}>
                <h2 style={{ margin: '0 0 8px' }}>403</h2>
                <p style={{ margin: '0 0 12px' }}>權限不足 (Forbidden)</p>
                <Link to="/">回首頁</Link>
            </div>
        );
    }

    return children;
};

export default RequireAuth;
