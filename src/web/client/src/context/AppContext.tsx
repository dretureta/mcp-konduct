import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { useI18n } from '../i18n';
import { Server, Tool, DashboardStats, CreateServerRequest, UpdateServerRequest, Project, LogEntry } from '../types';
import { serverApi, statsApi, toolApi, projectApi, logApi } from '../utils/api';
import { ToastMessage, ToastType } from '../components/common/Toast';

interface AppContextType {
  servers: Server[];
  tools: Tool[];
  projects: Project[];
  logs: LogEntry[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredServers: Server[];
  filteredTools: Tool[];
  stats: DashboardStats | null;
  isDark: boolean;
  toggleDarkMode: () => void;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addServer: (data: CreateServerRequest) => Promise<void>;
  updateServer: (id: string, data: UpdateServerRequest) => Promise<void>;
  toggleServer: (id: string) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  discoverTools: (id: string) => Promise<void>;
  toggleTool: (id: string) => Promise<void>;
  createProject: (name: string, description?: string) => Promise<void>;
  updateProject: (id: string, name: string, description?: string | null) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  fetchLogs: (params?: { limit?: number; server?: string; error?: boolean }) => Promise<void>;
  discoveringServerId: string | null;
  toasts: ToastMessage[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Toast message keys for different operations
const TOAST_KEYS = {
  serverAdded: 'toast.serverAdded',
  serverUpdated: 'toast.serverUpdated',
  serverDeleted: 'toast.serverDeleted',
  serverEnabled: 'toast.serverEnabled',
  serverDisabled: 'toast.serverDisabled',
  serverStarted: 'toast.serverStarted',
  serverStopped: 'toast.serverStopped',
  toolEnabled: 'toast.toolEnabled',
  toolDisabled: 'toast.toolDisabled',
  projectCreated: 'toast.projectCreated',
  projectUpdated: 'toast.projectUpdated',
  projectDeleted: 'toast.projectDeleted',
  error: 'toast.error',
  failedToAddServer: 'toast.failedToAddServer',
  failedToUpdateServer: 'toast.failedToUpdateServer',
  failedToToggleServer: 'toast.failedToToggleServer',
  failedToDeleteServer: 'toast.failedToDeleteServer',
  failedToDiscoverTools: 'toast.failedToDiscoverTools',
  failedToToggleTool: 'toast.failedToToggleTool',
  failedToCreateProject: 'toast.failedToCreateProject',
  failedToUpdateProject: 'toast.failedToUpdateProject',
  failedToDeleteProject: 'toast.failedToDeleteProject',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark, toggle } = useDarkMode();
  const [servers, setServers] = useState<Server[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveringServerId, setDiscoveringServerId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // i18n translation function
  const { t: translate } = useI18n();

  const filteredServers = servers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.transport.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTools = tools.filter(t => 
    t.toolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.serverId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [serversRes, toolsRes, projectsRes, statsRes] = await Promise.all([
        serverApi.getServers(),
        toolApi.getTools(),
        projectApi.getProjects(),
        statsApi.getStats()
      ]);
      
      const serversWithStatus = (serversRes.data || []).map(s => ({
        ...s,
        status: s.enabled ? 'online' : 'offline' as 'online' | 'offline'
      }));
      
      setServers(serversWithStatus);
      setTools(toolsRes.data || []);
      setProjects(projectsRes.data || []);
      setStats(statsRes.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (params?: { limit?: number; server?: string; error?: boolean }) => {
    try {
      const res = await logApi.getLogs(params);
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addServer = async (data: CreateServerRequest) => {
    try {
      await serverApi.createServer(data);
      await refreshData();
      addToast('success', translate(TOAST_KEYS.serverAdded));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add server';
      setError(msg);
      addToast('error', translate(TOAST_KEYS.failedToAddServer));
      throw err;
    }
  };

  const updateServer = async (id: string, data: UpdateServerRequest) => {
    try {
      await serverApi.updateServer(id, data);
      await refreshData();
      addToast('success', translate(TOAST_KEYS.serverUpdated));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update server';
      setError(msg);
      addToast('error', translate(TOAST_KEYS.failedToUpdateServer));
      throw err;
    }
  };

  const toggleServer = async (id: string) => {
    try {
      await serverApi.toggleServer(id);
      await refreshData();
      // Determine if server is now enabled or disabled after toggle
      const server = servers.find(s => s.id === id);
      if (server) {
        addToast('success', translate(server.enabled ? TOAST_KEYS.serverDisabled : TOAST_KEYS.serverEnabled));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle server';
      setError(msg);
      addToast('error', translate(TOAST_KEYS.failedToToggleServer));
    }
  };

  const deleteServer = async (id: string) => {
    try {
      await serverApi.deleteServer(id);
      await refreshData();
      addToast('success', translate(TOAST_KEYS.serverDeleted));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete server';
      setError(msg);
      addToast('error', translate(TOAST_KEYS.failedToDeleteServer));
    }
  };

  const discoverTools = async (id: string) => {
    try {
      setDiscoveringServerId(id);
      await serverApi.discoverTools(id);
      await refreshData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to discover tools';
      setError(msg);
      addToast('error', translate(TOAST_KEYS.failedToDiscoverTools));
    } finally {
      setDiscoveringServerId(null);
    }
  };

  const toggleTool = async (id: string) => {
    try {
      await toolApi.toggleTool(id);
      await refreshData();
      // Determine if tool is now enabled or disabled after toggle
      const tool = tools.find(t => t.id === id);
      if (tool) {
        addToast('success', translate(tool.enabled ? TOAST_KEYS.toolDisabled : TOAST_KEYS.toolEnabled));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle tool';
      setError(msg);
      addToast('error', translate(TOAST_KEYS.failedToToggleTool));
    }
  };

  const createProject = async (name: string, description?: string) => {
    try {
      await projectApi.createProject(name, description);
      await refreshData();
      addToast('success', translate(TOAST_KEYS.projectCreated));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      setError(msg);
      addToast('error', translate(TOAST_KEYS.failedToCreateProject));
      throw err;
    }
  };

  const updateProject = async (id: string, name: string, description?: string | null) => {
    try {
      await projectApi.updateProject(id, { name, description });
      await refreshData();
      addToast('success', translate(TOAST_KEYS.projectUpdated));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update project';
      setError(msg);
      addToast('error', translate(TOAST_KEYS.failedToUpdateProject));
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await projectApi.deleteProject(id);
      await refreshData();
      addToast('success', translate(TOAST_KEYS.projectDeleted));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete project';
      setError(msg);
      addToast('error', translate(TOAST_KEYS.failedToDeleteProject));
    }
  };

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <AppContext.Provider
      value={{
        servers,
        tools,
        projects,
        logs,
        stats,
        isDark,
        toggleDarkMode: toggle,
        isLoading,
        error,
        refreshData,
        addServer,
        updateServer,
        toggleServer,
        deleteServer,
        discoverTools,
        toggleTool,
        createProject,
        updateProject,
        deleteProject,
        fetchLogs,
        searchQuery,
        setSearchQuery,
        filteredServers,
        filteredTools,
        discoveringServerId,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};