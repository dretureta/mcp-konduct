import axios from 'axios';
import {
  Server,
  CreateServerRequest,
  UpdateServerRequest,
  DashboardStats,
  Tool,
  Project,
  LogEntry,
  BackupPayload,
  ImportResponse,
  JsonImportPayload,
  JsonImportResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const serverApi = {
  getServers: () => api.get<Server[]>('/servers'),
  getServer: (id: string) => api.get<Server>(`/servers/${id}`),
  createServer: (data: CreateServerRequest) => api.post<Server>('/servers', data),
  updateServer: (id: string, data: UpdateServerRequest) => api.post<Server>(`/servers/${id}/update`, data),
  toggleServer: (id: string) => api.post(`/servers/${id}/toggle`),
  deleteServer: (id: string) => api.post(`/servers/${id}/delete`),
  discoverTools: (id: string) => api.post(`/servers/${id}/discover`),
  importFromJson: (payload: JsonImportPayload) => api.post<JsonImportResponse>('/servers/import-json', payload),
};

export const toolApi = {
  getTools: () => api.get<Tool[]>('/tools'),
  toggleTool: (id: string) => api.post(`/tools/${id}/toggle`),
};

export const projectApi = {
  getProjects: () => api.get<Project[]>('/projects'),
  createProject: (name: string) => api.post(`/projects?name=${encodeURIComponent(name)}`),
  deleteProject: (id: string) => api.post(`/projects/${id}/delete`),
  getProjectServers: (id: string) => api.get<Server[]>(`/projects/${id}/servers`),
  addServerToProject: (projectId: string, serverId: string) => api.post(`/projects/${projectId}/servers/${serverId}/add`),
  removeServerFromProject: (projectId: string, serverId: string) => api.post(`/projects/${projectId}/servers/${serverId}/remove`),
};

export const logApi = {
  getLogs: (params?: { limit?: number; server?: string; error?: boolean }) => 
    api.get<LogEntry[]>('/logs', { params }),
};

export const statsApi = {
  getStats: () => api.get<DashboardStats>('/stats'),
};

export const settingsApi = {
  exportConfig: () => api.get<BackupPayload>('/settings/export'),
  previewImport: (payload: BackupPayload, mode: 'merge' | 'replace') =>
    api.post<ImportResponse>(`/settings/import?mode=${mode}&dryRun=true`, payload),
  applyImport: (payload: BackupPayload, mode: 'merge' | 'replace') =>
    api.post<ImportResponse>(`/settings/import?mode=${mode}&dryRun=false`, payload),
};

export default api;
