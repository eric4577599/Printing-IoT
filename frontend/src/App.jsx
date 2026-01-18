import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import DebugDashboard from './pages/DebugDashboard'; // Import DebugDashboard
import MaintenancePage from './modules/maintenance/MaintenancePage';
import MachineMaintenance from './pages/MachineMaintenance';
import SettingsPage from './pages/SettingsPage';
import AnalysisPage from './pages/AnalysisPage';
import { LanguageProvider } from './modules/language/LanguageContext';
import ReportsPage from './modules/reports/ReportsPage';
import { AuthProvider } from './modules/auth/AuthContext';
import './App.css';
import { useEffect } from 'react'; // Import useEffect

const App = () => {
  useEffect(() => {
    console.log('🚀 Frontend Version: 2026-01-17-Fix-Connectivity-v2 (WSS+RelAPI)');
  }, []);
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Debug Route - Move to top to ensure priority */}
            <Route path="/debug" element={<DebugDashboard />} />

            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="analysis" element={<AnalysisPage />} />
              <Route path="maintenance" element={<MachineMaintenance />} />
              <Route path="settings" element={<SettingsPage />} />
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
