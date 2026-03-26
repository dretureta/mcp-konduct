export type TransportType = 'stdio' | 'sse' | 'streamable-http';

export interface Server {
  id: string;
  name: string;
  transport: TransportType;
  enabled: boolean;
  command?: string;
  args?: string[];
  url?: string;
  status: 'online' | 'offline' | 'error';
  lastSeen?: string;
}

export interface CreateServerRequest {
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  url?: string;
}

export interface UpdateServerRequest extends Partial<CreateServerRequest> {
  enabled?: boolean;
}

export interface Tool {
  id: string;
  serverId: string;
  toolName: string;
  enabled: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  serverCount?: number;
  createdAt?: string;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  server_id: string;
  tool_name: string;
  duration_ms: number;
  success: boolean | number;
  error_message?: string;
}

export interface DashboardStats {
  servers: number;
  enabledServers: number;
  tools: number;
  enabledTools: number;
  dbPath: string;
}
