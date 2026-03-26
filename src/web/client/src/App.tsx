import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { SidebarProvider } from './components/layout/Sidebar';
import { AddServerModal } from './components/servers/AddServerModal';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Servers } from './pages/Servers';
import { Tools } from './pages/Tools';
import { Projects } from './pages/Projects';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';
import './styles/globals.css';

const App: React.FC = () => {
  return (
    <AppProvider>
      <SidebarProvider>
        <AddServerModal />
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
    </AppProvider>
  );
};

export default App;
