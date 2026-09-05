import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { login as loginApi } from '../../services/api';
import { saveAuth, getToken, getProfile, clearAuth, isExpired } from '../../services/authStorage';

/**
 * AuthContext — 真實登入狀態(S5 全面改寫)。
 *
 * 與舊版的差異:
 * - 不再有任何硬編碼帳密(舊 USERS 常數已刪除),也不再有 loginDirect 這條「選人即登入」的旁路。
 * - 登入一律呼叫後端 /api/v1/auth/login,權杖與輪廓交由 authStorage 持存,密碼永不落地。
 * - 開發自動登入預設關閉,且只在三個環境變數皆備時才走「真實登入端點」。
 */

const AuthContext = createContext(null);

/**
 * 由後端 LoginResponse 組出前端輪廓。
 * 輸入:LoginResponse({ username, roles, displayName, expiresAt });
 * 輸出:輪廓物件(含 role / name 兩個相容欄位);
 * 邏輯:role 取第一個角色(大寫),name 為 displayName ?? username,
 *       讓 MainLayout 既有的 user.name / user.role 不必大改。
 */
const toProfile = (data) => {
    const roles = Array.isArray(data?.roles) ? data.roles.map(r => String(r).toUpperCase()) : [];
    return {
        username: data?.username ?? '',
        displayName: data?.displayName ?? data?.username ?? '',
        roles,
        role: roles[0] ?? '',
        expiresAt: data?.expiresAt ?? null,
    };
};

/**
 * 把持存的輪廓補上衍生欄位 name。
 * 輸入:輪廓物件或 null;輸出:含 name 的輪廓或 null;
 * 邏輯:name 不進 localStorage(白名單之外),每次讀出時再算。
 */
const withDerived = (profile) => {
    if (!profile) return null;
    return { ...profile, name: profile.displayName || profile.username || '' };
};

export const AuthProvider = ({ children }) => {
    // 掛載時從儲存還原;權杖或輪廓缺一、或已過期,一律視為未登入並清空儲存
    const [user, setUser] = useState(() => {
        const profile = getProfile();
        const token = getToken();
        if (!profile || !token) {
            clearAuth();
            return null;
        }
        if (isExpired(profile)) {
            clearAuth();
            return null;
        }
        return withDerived(profile);
    });

    // 供開發自動登入用:避免 StrictMode 重複掛載時打兩次登入
    const autoLoginTried = useRef(false);

    /**
     * 登入。
     * 輸入:帳號、密碼;
     * 輸出:{ ok, reason? } —— reason 為 'invalid'(401)/ 'network'(無回應)/ 'server'(其他);
     * 邏輯:呼叫後端登入端點,成功則持存權杖與白名單輪廓(密碼絕不寫入儲存)。
     */
    const login = useCallback(async (username, password) => {
        try {
            const data = await loginApi(username, password);
            if (!data?.token) return { ok: false, reason: 'server' };
            const profile = toProfile(data);
            saveAuth(data.token, profile);
            setUser(withDerived(profile));
            return { ok: true };
        } catch (error) {
            if (!error?.response) return { ok: false, reason: 'network' };
            if (error.response.status === 401) return { ok: false, reason: 'invalid' };
            return { ok: false, reason: 'server' };
        }
    }, []);

    /**
     * 登出。
     * 輸入:無;輸出:無;邏輯:清空認證儲存(含舊版遺留的 currentUser)並把 user 歸零。
     */
    const logout = useCallback(() => {
        clearAuth();
        setUser(null);
    }, []);

    /**
     * 設定本次連線的班別。
     * 輸入:班別代碼(例:A / B / DAY / NIGHT);輸出:無;
     * 邏輯:班別仍是前端 session 概念(不進權杖),更新輪廓後一併持存。
     *       shift 與 sessionShift 兩個欄位同步寫入同一值 —— MainLayout 狀態列讀的是 user.shift,
     *       只寫 sessionShift 會讓三班制現場看不到班別(S5 回歸修正)。
     */
    const setSessionShift = useCallback((shift) => {
        setUser(prev => {
            if (!prev) return prev;
            const next = { ...prev, shift, sessionShift: shift };
            const token = getToken();
            if (token) saveAuth(token, next);
            return next;
        });
    }, []);

    /**
     * 角色判斷。
     * 輸入:一到多個角色代碼;輸出:布林;
     * 邏輯:一律大寫比對;ADMIN 不自動涵蓋其他角色(以權限矩陣為準,不做層級推導)。
     */
    const hasRole = useCallback((...roles) => {
        if (!user) return false;
        const owned = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
        const ownedUpper = owned.map(r => String(r).toUpperCase());
        return roles.some(r => ownedUpper.includes(String(r).toUpperCase()));
    }, [user]);

    // 攔截器偵測到權杖失效時會派發此事件(儲存已由攔截器清掉),這裡只需同步畫面狀態
    useEffect(() => {
        const onUnauthorized = () => setUser(null);
        window.addEventListener('auth:unauthorized', onUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
    }, []);

    // 開發自動登入:預設關閉。三個環境變數任一缺少即不啟用,且程式碼內不得有任何帳密字面值。
    useEffect(() => {
        if (autoLoginTried.current || user) return;
        const env = import.meta.env;
        if (!env?.DEV || env.VITE_DEV_AUTOLOGIN !== 'true') return;
        const devUser = env.VITE_DEV_USERNAME;
        const devPass = env.VITE_DEV_PASSWORD;
        if (!devUser || !devPass) return;
        autoLoginTried.current = true;
        // 以 timer 延後一個 tick 再登入:effect 本體內同步觸發 setState 會造成串聯渲染
        const timer = setTimeout(() => { login(devUser, devPass); }, 0);
        return () => clearTimeout(timer);
    }, [user, login]);

    return (
        <AuthContext.Provider
            value={{ user, login, logout, setSessionShift, hasRole, isAuthenticated: user !== null }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
