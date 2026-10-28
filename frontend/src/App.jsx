import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ThemeRegistry from './components/providers/ThemeRegistry.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AppShell from './components/layout/AppShell.jsx';
import HomePage from './pages/Home.jsx';
import ChatPage from './pages/Chat.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import LoginPage from './pages/Login.jsx';

export default function App() {
  return (
    <ThemeRegistry>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </ThemeRegistry>
  );
}

