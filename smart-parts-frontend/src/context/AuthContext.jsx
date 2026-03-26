import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Check URL for Token (SSO from IoT System)
        const params = new URLSearchParams(window.location.search);
        const ssoToken = params.get('token');

        if (ssoToken) {
            console.log('SSO: Token received from URL');
            login(ssoToken);
            // Remove token from URL to prevent leakage/re-use issues
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (token) {
            // 2. Validate existing token (Simplified for now)
            // In real implementation, call backend /api/auth/me to validate
            try {
                // Fix Base64Url to Base64 (Replace - with +, _ with /)
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                    atob(base64)
                        .split('')
                        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                        .join('')
                );
                const payload = JSON.parse(jsonPayload);

                const isExpired = payload.exp * 1000 < Date.now();

                if (isExpired) {
                    console.warn('Auth: Token expired');
                    logout();
                } else {
                    setUser({
                        id: payload.nameid || payload.sub,
                        name: payload.unique_name || 'User',
                        role: payload.role
                    });
                }
            } catch (e) {
                console.error('Auth: Invalid token format', e);
                // Don't logout immediately on error to prevent infinite loops if token is just malformed but present
                if (!user) logout();
            }
        }

        setIsLoading(false);
    }, [token]);

    const login = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        // Decode token to set user immediately if needed
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
