import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { Server, Tool, DashboardStats, CreateServerRequest, UpdateServerRequest, Project, LogEntry } from '../types';
import { serverApi, statsApi, toolApi, projectApi, logApi } from '../utils/api';

interface AppContextType {
  servers: Server[];
  tools: Tool[];
  projects: Project[];
  logs: LogEntry[];
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
  createProject: (name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  fetchLogs: (params?: { limit?: number; server?: string; error?: boolean }) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark, toggle } = useDarkMode();
  const [servers, setServers] = useState<Server[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const addServer = async (data: CreateServerRequest) => {
    try {
      await serverApi.createServer(data);
      await refreshData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add server';
      setError(msg);
      throw err;
    }
  };

  const updateServer = async (id: string, data: UpdateServerRequest) => {
    try {
      await serverApi.updateServer(id, data);
      await refreshData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update server';
      setError(msg);
      throw err;
    }
  };

  const toggleServer = async (id: string) => {
    try {
      await serverApi.toggleServer(id);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle server');
    }
  };

  const deleteServer = async (id: string) => {
    try {
      await serverApi.deleteServer(id);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete server');
    }
  };

  const discoverTools = async (id: string) => {
    try {
      await serverApi.discoverTools(id);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discover tools');
    }
  };

  const toggleTool = async (id: string) => {
    try {
      await toolApi.toggleTool(id);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle tool');
    }
  };

  const createProject = async (name: string) => {
    try {
      await projectApi.createProject(name);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await projectApi.deleteProject(id);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
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
        deleteProject,
        fetchLogs,
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
