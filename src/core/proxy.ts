import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ToolIndexEntry } from '../types/index.js';
import { registry } from './registry.js';
import { db } from '../config/db.js';

interface Connection {
  client: Client;
  transport: StdioClientTransport;
}

const DEFAULT_TIMEOUT = 30000;
const CLEANUP_TIMEOUT = 5 * 60 * 1000;

export class ConnectionPool {
  private connections: Map<string, Connection> = new Map();
  private lastUsed: Map<string, number> = new Map();
  private toolIndex: Map<string, ToolIndexEntry> = new Map();
  private timeout = DEFAULT_TIMEOUT;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  setToolIndex(index: Map<string, ToolIndexEntry>): void {
    this.toolIndex = index;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
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
      return result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.logRequest(mapping.serverId, name, duration, false, message);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
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

    if (server.transport !== 'stdio') {
      throw new Error(`Transport '${server.transport}' not supported yet`);
    }

    if (!server.command) {
      throw new Error(`No command specified for server: ${server.name}`);
    }

    const args = server.args || [];
    const env: Record<string, string> = { ...process.env as Record<string, string>, ...server.env };

    const transport = new StdioClientTransport({
      command: server.command,
      args,
      env
    });

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
      INSERT INTO request_logs (timestamp, server_id, tool_name, duration_ms, success, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(timestamp, serverId, toolName, durationMs, success ? 1 : 0, errorMessage || null);
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
