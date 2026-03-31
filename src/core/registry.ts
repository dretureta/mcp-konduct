import { randomUUID } from 'crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { db } from '../config/db.js';
import type { Project, ServerConfig, ToolConfig } from '../types/index.js';

interface DiscoveredTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: object;
  outputSchema?: object;
}

export class ServerRegistry {
  addServer(config: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = randomUUID();

    const existing = db.prepare('SELECT id FROM servers WHERE name = ?').get(config.name);
    if (existing) {
      throw new Error(`Server with name '${config.name}' already exists`);
    }

    db.prepare(`
      INSERT INTO servers (id, name, transport, command, args, env, url, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      config.name,
      config.transport,
      config.command ?? null,
      config.args ? JSON.stringify(config.args) : null,
      config.env ? JSON.stringify(config.env) : null,
      config.url ?? null,
      config.enabled ? 1 : 0
    );

    return id;
  }

  removeServer(id: string): boolean {
    const result = db.prepare('DELETE FROM servers WHERE id = ?').run(id);
    return result.changes > 0;
  }

  listServers(projectId?: string): ServerConfig[] {
    let rows;
    if (projectId) {
      rows = db.prepare(`
        SELECT s.* FROM servers s
        JOIN project_servers ps ON s.id = ps.server_id
        WHERE ps.project_id = ?
        ORDER BY s.name
      `).all(projectId) as Record<string, unknown>[];
    } else {
      rows = db.prepare('SELECT * FROM servers ORDER BY name').all() as Record<string, unknown>[];
    }

    return rows.map(this.mapServerRow);
  }

  getServer(id: string): ServerConfig | null {
    const row = db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.mapServerRow(row) : null;
  }

  updateServer(id: string, partial: Partial<ServerConfig>): void {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (partial.name !== undefined) {
      updates.push('name = ?');
      values.push(partial.name);
    }
    if (partial.transport !== undefined) {
      updates.push('transport = ?');
      values.push(partial.transport);
    }
    if (partial.command !== undefined) {
      updates.push('command = ?');
      values.push(partial.command ?? null);
    }
    if (partial.args !== undefined) {
      updates.push('args = ?');
      // Empty arrays persist as NULL, not '[]'
      values.push(Array.isArray(partial.args) && partial.args.length === 0 ? null : JSON.stringify(partial.args) ?? null);
    }
    if (partial.env !== undefined) {
      updates.push('env = ?');
      // Empty objects persist as NULL, not '{}'
      const envValue = partial.env;
      const isEmptyEnv = envValue !== null && typeof envValue === 'object' && Object.keys(envValue).length === 0;
      values.push(isEmptyEnv ? null : JSON.stringify(envValue) ?? null);
    }
    if (partial.url !== undefined) {
      updates.push('url = ?');
      values.push(partial.url ?? null);
    }
    if (partial.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(partial.enabled ? 1 : 0);
    }

    if (updates.length === 0) return;

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE servers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  enableServer(id: string): void {
    db.prepare("UPDATE servers SET enabled = 1, updated_at = datetime('now') WHERE id = ?").run(id);
  }

  disableServer(id: string): void {
    db.prepare("UPDATE servers SET enabled = 0, updated_at = datetime('now') WHERE id = ?").run(id);
  }

  getServerTools(serverId: string): ToolConfig[] {
    const rows = db.prepare('SELECT * FROM tools WHERE server_id = ?').all(serverId) as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      serverId: row.server_id as string,
      toolName: row.tool_name as string,
      title: row.title as string | undefined,
      description: row.description as string | undefined,
      inputSchema: row.input_schema ? JSON.parse(row.input_schema as string) : undefined,
      outputSchema: row.output_schema ? JSON.parse(row.output_schema as string) : undefined,
      enabled: (row.enabled as number) === 1,
      discoveredAt: row.discovered_at as string
    }));
  }

  listAllTools(): ToolConfig[] {
    const rows = db.prepare('SELECT * FROM tools ORDER BY server_id, tool_name').all() as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      serverId: row.server_id as string,
      toolName: row.tool_name as string,
      title: row.title as string | undefined,
      description: row.description as string | undefined,
      inputSchema: row.input_schema ? JSON.parse(row.input_schema as string) : undefined,
      outputSchema: row.output_schema ? JSON.parse(row.output_schema as string) : undefined,
      enabled: (row.enabled as number) === 1,
      discoveredAt: row.discovered_at as string
    }));
  }

  private ensureToolMetadataColumns(): void {
    const columns = db.prepare("PRAGMA table_info(tools)").all() as Array<Record<string, unknown>>;
    const columnNames = new Set(columns.map((column) => String(column.name)));
    const requiredColumns: Array<{ name: string; sql: string }> = [
      { name: 'title', sql: 'ALTER TABLE tools ADD COLUMN title TEXT' },
      { name: 'description', sql: 'ALTER TABLE tools ADD COLUMN description TEXT' },
      { name: 'input_schema', sql: 'ALTER TABLE tools ADD COLUMN input_schema TEXT' },
      { name: 'output_schema', sql: 'ALTER TABLE tools ADD COLUMN output_schema TEXT' },
      { name: 'uuid', sql: 'ALTER TABLE tools ADD COLUMN uuid TEXT' },
    ];

    for (const column of requiredColumns) {
      if (!columnNames.has(column.name)) {
        db.exec(column.sql);
      }
    }
  }

  // Tool IDs are now UUIDs for collision-free uniqueness.
  private upsertTool(serverId: string, tool: DiscoveredTool): void {
    const id = `${serverId}__${tool.name}`;
    const existing = db.prepare('SELECT id, uuid FROM tools WHERE id = ?').get(id) as Record<string, unknown> | undefined;

    if (!existing) {
      const uuid = randomUUID();
      db.prepare(`
        INSERT INTO tools (id, uuid, server_id, tool_name, title, description, input_schema, output_schema, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        id,
        uuid,
        serverId,
        tool.name,
        tool.title ?? null,
        tool.description ?? null,
        tool.inputSchema ? JSON.stringify(tool.inputSchema) : null,
        tool.outputSchema ? JSON.stringify(tool.outputSchema) : null
      );
      return;
    }

    // Keep existing UUID or generate new one if missing (backward compat)
    const newUuid = (existing.uuid as string) ?? randomUUID();
    db.prepare(`
      UPDATE tools
      SET title = ?, description = ?, input_schema = ?, output_schema = ?, uuid = ?, discovered_at = datetime('now')
      WHERE id = ?
    `).run(
      tool.title ?? null,
      tool.description ?? null,
      tool.inputSchema ? JSON.stringify(tool.inputSchema) : null,
      tool.outputSchema ? JSON.stringify(tool.outputSchema) : null,
      newUuid,
      id
    );
  }

  addTool(serverId: string, toolName: string): void {
    const id = randomUUID();
    db.prepare(`
      INSERT OR IGNORE INTO tools (id, uuid, server_id, tool_name, enabled)
      VALUES (?, ?, ?, ?, 1)
    `).run(id, id, serverId, toolName);
  }

  removeTool(id: string): boolean {
    const result = db.prepare('DELETE FROM tools WHERE id = ?').run(id);
    return result.changes > 0;
  }

  enableTool(id: string): void {
    db.prepare('UPDATE tools SET enabled = 1 WHERE id = ?').run(id);
  }

  disableTool(id: string): void {
    db.prepare('UPDATE tools SET enabled = 0 WHERE id = ?').run(id);
  }

  cleanTools(serverId: string, activeToolNames: string[]): void {
    if (activeToolNames.length === 0) {
      db.prepare('DELETE FROM tools WHERE server_id = ?').run(serverId);
      return;
    }
    const placeholders = activeToolNames.map(() => '?').join(',');
    db.prepare(`DELETE FROM tools WHERE server_id = ? AND tool_name NOT IN (${placeholders})`).run(serverId, ...activeToolNames);
  }

  async discoverTools(serverId: string): Promise<string[]> {
    const server = this.getServer(serverId);
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
      name: `konduct-discovery-${server.name}`,
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    try {
      await client.connect(transport);
      const toolsResponse = await client.listTools() as {
        tools: Array<{
          name: string;
          title?: string;
          description?: string;
          inputSchema?: object;
          outputSchema?: object;
        }>;
      };
      
      this.ensureToolMetadataColumns();

      const toolNames = toolsResponse.tools.map((t) => t.name);
      
      for (const tool of toolsResponse.tools) {
        this.upsertTool(serverId, {
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema,
        });
      }

      this.cleanTools(serverId, toolNames);

      await client.close();
      return toolNames;
    } catch (err) {
      await client.close().catch(() => {});
      throw err;
    }
  }

  private mapServerRow(row: Record<string, unknown>): ServerConfig {
    return {
      id: row.id as string,
      name: row.name as string,
      transport: row.transport as ServerConfig['transport'],
      command: row.command as string | undefined,
      args: row.args ? JSON.parse(row.args as string) : undefined,
      env: row.env ? JSON.parse(row.env as string) : undefined,
      url: row.url as string | undefined,
      enabled: (row.enabled as number) === 1,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    };
  }

  createProject(name: string, description?: string): string {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO projects (id, name, description)
      VALUES (?, ?, ?)
    `).run(id, name, description || null);
    return id;
  }

  deleteProject(id: string): boolean {
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  listProjects(): Array<{ id: string; name: string; description?: string; createdAt?: string }> {
    const rows = db.prepare('SELECT * FROM projects ORDER BY name').all() as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      createdAt: row.created_at as string
    }));
  }

  getProject(id: string): Project | null {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      createdAt: row.created_at as string | undefined,
    };
  }

  getProjectByName(name: string): Project | null {
    const row = db.prepare('SELECT * FROM projects WHERE name = ?').get(name) as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      createdAt: row.created_at as string | undefined,
    };
  }

  getProjectServers(projectName: string): ServerConfig[] {
    const project = this.getProjectByName(projectName);
    if (!project) {
      throw new Error(`Project not found: ${projectName}`);
    }

    const rows = db.prepare(`
      SELECT s.*
      FROM servers s
      JOIN project_servers ps ON s.id = ps.server_id
      WHERE ps.project_id = ?
      ORDER BY s.name
    `).all(project.id) as Record<string, unknown>[];

    return rows.map((row) => this.mapServerRow(row));
  }

  getProjectTools(projectName: string): ToolConfig[] {
    const project = this.getProjectByName(projectName);
    if (!project) {
      throw new Error(`Project not found: ${projectName}`);
    }

    const rows = db.prepare(`
      SELECT t.*
      FROM tools t
      JOIN project_servers ps ON t.server_id = ps.server_id
      WHERE ps.project_id = ?
      ORDER BY t.server_id, t.tool_name
    `).all(project.id) as Record<string, unknown>[];

    return rows.map(row => ({
      id: row.id as string,
      serverId: row.server_id as string,
      toolName: row.tool_name as string,
      title: row.title as string | undefined,
      description: row.description as string | undefined,
      inputSchema: row.input_schema ? JSON.parse(row.input_schema as string) : undefined,
      outputSchema: row.output_schema ? JSON.parse(row.output_schema as string) : undefined,
      enabled: (row.enabled as number) === 1,
      discoveredAt: row.discovered_at as string
    }));
  }

  addServerToProject(projectId: string, serverId: string): void {
    db.prepare(`
      INSERT OR IGNORE INTO project_servers (project_id, server_id)
      VALUES (?, ?)
    `).run(projectId, serverId);
  }

  removeServerFromProject(projectId: string, serverId: string): boolean {
    const result = db.prepare('DELETE FROM project_servers WHERE project_id = ? AND server_id = ?').run(projectId, serverId);
    return result.changes > 0;
  }
}

export const registry = new ServerRegistry();
