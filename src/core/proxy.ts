import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ToolIndexEntry } from '../types/index.js';
import { registry } from './registry.js';
import { db } from '../config/db.js';

interface Connection {
  client: Client;
  transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;
}

interface RequestContext {
  projectId: string | null;
  projectName: string | null;
  sessionId: string | null;
}

const DEFAULT_TIMEOUT = 30000;
const CLEANUP_TIMEOUT = 5 * 60 * 1000;

export class ConnectionPool {
  private connections: Map<string, Connection> = new Map();
  private lastUsed: Map<string, number> = new Map();
  private toolIndex: Map<string, ToolIndexEntry> = new Map();
  private timeout = DEFAULT_TIMEOUT;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private requestContext: RequestContext = {
    projectId: null,
    projectName: null,
    sessionId: null,
  };

  setToolIndex(index: Map<string, ToolIndexEntry>): void {
    this.toolIndex = index;
  }

  setRequestContext(context: RequestContext): void {
    this.requestContext = context;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    const mapping = this.toolIndex.get(name);
    if (!mapping) {
      throw new Error(`Tool not found: ${name}`);
    }

    const connection = await this.getConnection(mapping.serverId);
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        connection.client.callTool({
          name: mapping.originalName,
          arguments: args
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tool call timeout')), this.timeout)
        )
      ]);

      this.logRequest(mapping.serverId, name, Date.now() - startTime, true);
      return result as unknown as { content: Array<{ type: 'text'; text: string }>; isError?: boolean };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.logRequest(mapping.serverId, name, duration, false, message);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true
      };
    }
  }

  private async getConnection(serverId: string): Promise<Connection> {
    let connection = this.connections.get(serverId);

    if (connection) {
      this.lastUsed.set(serverId, Date.now());
      return connection;
    }

    const server = registry.getServer(serverId);
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    let transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;

    if (server.transport === 'stdio') {
      if (!server.command) {
        throw new Error(`No command specified for server: ${server.name}`);
      }
      const args = server.args || [];
      const env: Record<string, string> = { ...process.env as Record<string, string>, ...server.env };
      transport = new StdioClientTransport({ command: server.command, args, env });
    } else if (server.transport === 'sse') {
      if (!server.url) {
        throw new Error(`No URL specified for SSE server: ${server.name}`);
      }
      transport = new SSEClientTransport(new URL(server.url));
    } else if (server.transport === 'streamable-http') {
      if (!server.url) {
        throw new Error(`No URL specified for streamable-http server: ${server.name}`);
      }
      transport = new StreamableHTTPClientTransport(new URL(server.url));
    } else {
      throw new Error(`Unsupported transport: ${(server as { transport: string }).transport}`);
    }

    const client = new Client({
      name: `konduct-downstream-${server.name}`,
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);

    connection = { client, transport };
    this.connections.set(serverId, connection);
    this.lastUsed.set(serverId, Date.now());

    return connection;
  }

  private logRequest(
    serverId: string,
    toolName: string,
    durationMs: number,
    success: boolean,
    errorMessage?: string
  ): void {
    const timestamp = new Date().toISOString();
    db.prepare(`
      INSERT INTO request_logs (timestamp, server_id, project_id, project_name, router_session_id, tool_name, duration_ms, success, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      timestamp,
      serverId,
      this.requestContext.projectId,
      this.requestContext.projectName,
      this.requestContext.sessionId,
      toolName,
      durationMs,
      success ? 1 : 0,
      errorMessage || null
    );
  }

  startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [serverId, lastUsed] of this.lastUsed) {
        if (now - lastUsed > CLEANUP_TIMEOUT) {
          this.disconnect(serverId);
        }
      }
    }, CLEANUP_TIMEOUT);
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (connection) {
      try {
        await connection.client.close();
      } catch {
      }
      this.connections.delete(serverId);
      this.lastUsed.delete(serverId);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const serverId of this.connections.keys()) {
      await this.disconnect(serverId);
    }
  }
}

export const connectionPool = new ConnectionPool();
