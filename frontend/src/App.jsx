import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import { LanguageProvider } from './modules/language/LanguageContext';
import { AuthProvider } from './modules/auth/AuthContext';
import './App.css';

// 懶加載大型頁面（縮小首屏 Bundle 體積）
const DebugDashboard = lazy(() => import('./pages/DebugDashboard'));
const AnalysisPage = lazy(() => import('./pages/analysis/AnalysisPage'));
const ReportsPage = lazy(() => import('./modules/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DocsPortal = lazy(() => import('./pages/DocsPortal'));

// 通用 Loading Fallback
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', fontSize: '1rem', color: '#888' }}>
    載入中...
  </div>
);

const App = () => {
  useEffect(() => {
    const version = __APP_VERSION__ || '0.0.0';
    console.log(`🚀 Frontend Version: ${version}`);
  }, []);
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Debug Route */}
            <Route path="/debug" element={<Suspense fallback={<PageLoader />}><DebugDashboard /></Suspense>} />

            <Route path="/" element={<MainLayout />}>
              {/* 核心頁面：靜態載入（首屏必要） */}
              <Route index element={<Dashboard />} />
              <Route path="schedule" element={<Schedule />} />

              {/* 大型頁面：懶加載（非首屏） */}
              <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
              <Route path="analysis" element={<Suspense fallback={<PageLoader />}><AnalysisPage /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
              <Route path="docs" element={<Suspense fallback={<PageLoader />}><DocsPortal /></Suspense>} />
            </Route>

            {/* Fallback 404 */}
            <Route path="*" element={<div style={{ padding: 20 }}>404 - Page Not Found</div>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
