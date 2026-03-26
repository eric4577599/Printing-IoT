import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const USERS = [
    { id: 'admin', name: 'Administrator', role: 'ADMIN', password: 'eric4577599' },
    { id: 'super', name: 'Supervisor', role: 'SUPERVISOR', password: 'super' },
    { id: 'op', name: 'Operator', role: 'OPERATOR', password: 'op' },
    { id: 'eng', name: 'Engineer', role: 'ENGINEER', password: 'eng' }
];

export const AuthProvider = ({ children }) => {
    // 開發模式下自動使用管理者登錄
    const isDev = import.meta.env.DEV;
    const [user, setUser] = useState(() => {
        if (isDev) {
            // 開發模式：自動以管理者身份登錄
            const adminUser = USERS.find(u => u.id === 'admin');
            console.log('[DEV MODE] Auto-login as Administrator');
            return adminUser;
        }
        // 正式模式：每次開啟應用時都需要重新登錄
        return null;
    });

    const loginDirect = (userData) => {
        if (userData) {
            setUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
            return true;
        }
        return false;
    };

    const login = (username, password) => {
        // Simple mock authentication
        // In real app, check against DB or API
        // Here check against USERS const + LocalStorage stored users (if we implement user mgmt)

        let validUser = USERS.find(u => u.id === username && u.password === password);

        // Also check dynamic users from localStorage if any
        if (!validUser) {
            const dynamicUsers = JSON.parse(localStorage.getItem('appUsers') || '[]');
            validUser = dynamicUsers.find(u => u.id === username && u.password === password);
        }

        if (validUser) {
            return loginDirect(validUser);
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('currentUser');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loginDirect }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
