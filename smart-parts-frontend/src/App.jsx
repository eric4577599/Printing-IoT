import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'

// Simple Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) return <div>Loading Auth...</div>;
  if (!token) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
      <p>Please login via the Main IoT System.</p>
      <a href="http://localhost:5600" className="text-blue-500 underline">Go to Main System</a>
    </div>
  );

  return children;
};

// Main Layout 
import PartsManagementPage from './pages/Parts/PartsManagementPage';

const MainLayout = () => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-blue-600">Smart Parts & Maintenance</h1>
        <div className="flex gap-4 items-center">
          <span className="text-gray-700 font-medium">{user?.name || 'Guest'}</span>
          <button onClick={logout} className="text-red-500 hover:text-red-700 text-sm font-semibold">Logout</button>
        </div>
      </nav>
      <main className="p-8 max-w-7xl mx-auto">
        {/* Simple Router Implementation for now */}
        <PartsManagementPage />
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    </AuthProvider>
  )
}

export default App
