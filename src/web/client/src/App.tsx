import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { SidebarProvider } from './components/layout/Sidebar';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Servers } from './pages/Servers';
import { Tools } from './pages/Tools';
import { Projects } from './pages/Projects';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';
import { ToastContainer } from './components/common/Toast';
import './styles/globals.css';

const AppShell: React.FC = () => {
  const { toasts, removeToast } = useAppContext();
  return (
    <>
      <SidebarProvider>
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="servers" element={<Servers />} />
              <Route path="tools" element={<Tools />} />
              <Route path="projects" element={<Projects />} />
              <Route path="logs" element={<Logs />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </SidebarProvider>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
};

export default App;
