export type TransportType = 'stdio' | 'sse' | 'streamable-http';

export interface ServerConfig {
  id: string;
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ToolConfig {
  id: string;
  serverId: string;
  toolName: string;
  enabled: boolean;
  discoveredAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface RequestLog {
  id?: number;
  timestamp?: string;
  serverId?: string;
  toolName?: string;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
}

export interface ToolDefinition {
  name: string;
  originalName: string;
  serverId: string;
  description?: string;
  inputSchema: object;
  outputSchema?: object;
}

export interface ToolIndexEntry {
  serverId: string;
  originalName: string;
}

export type CliOptions = {
  json?: boolean;
  verbose?: boolean;
};
