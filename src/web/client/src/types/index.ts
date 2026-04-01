export type TransportType = 'stdio' | 'sse' | 'streamable-http';

export interface Server {
  id: string;
  name: string;
  transport: TransportType;
  enabled: boolean;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  status?: 'online' | 'offline' | 'error';
  lastSeen?: string;
}

export interface CreateServerRequest {
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface UpdateServerRequest extends Partial<CreateServerRequest> {
  enabled?: boolean;
}

export interface Tool {
  id: string;
  serverId: string;
  toolName: string;
  title?: string;
  description?: string;
  inputSchema?: object;
  outputSchema?: object;
  enabled: boolean;
  discoveredAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  serverCount?: number;
  createdAt?: string;
}

export interface ProjectFullResponse {
  project: Project;
  servers: Server[];
  tools: Tool[];
  summary: {
    serverCount: number;
    toolCount: number;
  };
  config: {
    command: string;
    description: string;
  };
}

export interface LogEntry {
  id: number;
  timestamp: string;
  server_id: string;
  tool_name: string;
  duration_ms: number;
  success: boolean | number;
  error_message?: string;
  project_id?: string;
  project_name?: string;
  router_session_id?: string;
}

export interface DashboardStats {
  servers: number;
  enabledServers: number;
  tools: number;
  enabledTools: number;
  dbPath: string;
}

export interface BackupProjectServer {
  projectId: string;
  serverId: string;
}

export interface BackupPayload {
  version: 'konduct-backup-v1';
  exportedAt: string;
  appVersion: string;
  data: {
    servers: Array<{
      id: string;
      name: string;
      transport: TransportType;
      command?: string | null;
      args?: string | null;
      env?: string | null;
      url?: string | null;
      enabled: number;
      created_at?: string;
      updated_at?: string;
    }>;
    tools: Array<{
      id: string;
      uuid?: string | null;
      server_id: string;
      tool_name: string;
      enabled: number;
      discovered_at?: string;
    }>;
    projects: Array<{
      id: string;
      name: string;
      description?: string | null;
      created_at?: string;
    }>;
    projectServers: BackupProjectServer[];
  };
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  removed: number;
  errors: number;
}

export interface ImportResponse {
  success: boolean;
  mode: 'merge' | 'replace';
  dryRun: boolean;
  summary: ImportSummary;
  messages: string[];
}

export interface JsonImportServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface JsonImportPayload {
  mcpServers: Record<string, JsonImportServerConfig>;
}

export interface JsonImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface JsonImportResponse {
  success: boolean;
  summary: JsonImportSummary;
  messages: string[];
}
