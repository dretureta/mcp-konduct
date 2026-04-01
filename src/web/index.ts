import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { registry } from '../core/registry.js';
import { getDbPath } from '../config/db.js';
import { db } from '../config/db.js';
import { readFileSync, existsSync } from 'fs';

// Get directory of this file (works in ESM and after compilation)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// UUID validation helper
const isUUID = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const app = new Hono();

const BackupServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().nullable().optional(),
  args: z.string().nullable().optional(),
  env: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  enabled: z.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const BackupToolSchema = z.object({
  id: z.string(),
  server_id: z.string(),
  tool_name: z.string(),
  enabled: z.number(),
  discovered_at: z.string().optional(),
});

const BackupProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

const BackupProjectServerSchema = z.object({
  projectId: z.string(),
  serverId: z.string(),
});

const BackupPayloadSchema = z.object({
  version: z.literal('konduct-backup-v1'),
  exportedAt: z.string(),
  appVersion: z.string(),
  data: z.object({
    servers: z.array(BackupServerSchema),
    tools: z.array(BackupToolSchema),
    projects: z.array(BackupProjectSchema),
    projectServers: z.array(BackupProjectServerSchema),
  }),
});

const JsonImportServerSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  url: z.string().optional(),
});

const JsonImportPayloadSchema = z.object({
  mcpServers: z.record(z.string(), JsonImportServerSchema),
});

const ServerCreateSchema = z.object({
  name: z.string().trim().min(1),
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().nullable().optional(),
  args: z.array(z.string()).nullable().optional(),
  env: z.record(z.string(), z.string()).nullable().optional(),
  url: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.transport === 'stdio' && (!value.command || value.command.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'command is required for stdio transport',
      path: ['command'],
    });
  }

  if ((value.transport === 'sse' || value.transport === 'streamable-http') && (!value.url || value.url.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'url is required for remote transports',
      path: ['url'],
    });
  }
});

const ProjectCreateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
});

const ProjectUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
}).refine((value) => value.name !== undefined || value.description !== undefined, {
  message: 'At least one field must be provided',
});

const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

type BackupPayload = z.infer<typeof BackupPayloadSchema>;

type ImportMode = 'merge' | 'replace';

interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  removed: number;
  errors: number;
}

const emptySummary = (): ImportSummary => ({
  created: 0,
  updated: 0,
  skipped: 0,
  removed: 0,
  errors: 0,
});

const redactEnvRecord = (
  env: Record<string, string> | undefined,
  includeSecrets = false
): Record<string, string> | undefined => {
  if (!env) {
    return undefined;
  }

  if (includeSecrets) {
    return env;
  }

  return Object.fromEntries(Object.keys(env).map((key) => [key, '[REDACTED]']));
};

const serializeServer = <T extends { env?: Record<string, string> }>(
  server: T,
  includeSecrets = false
): T => {
  return {
    ...server,
    env: redactEnvRecord(server.env, includeSecrets),
  };
};

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) {
    return true;
  }

  return LOCALHOST_ORIGIN_PATTERN.test(origin);
};

const isSyntaxError = (error: unknown): boolean => {
  return error instanceof SyntaxError;
};

const parseJsonBody = async <T>(c: Context, schema: z.ZodType<T>): Promise<{ data: T } | { response: Response }> => {
  try {
    const body = await c.req.json();
    return { data: schema.parse(body) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        response: c.json({
          error: 'Invalid request body',
          details: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
        }, 400),
      };
    }

    if (isSyntaxError(error)) {
      return { response: c.json({ error: 'Invalid JSON body' }, 400) };
    }

    throw error;
  }
};

const getAppVersion = (): string => {
  const packageJsonPath = join(process.cwd(), 'package.json');
  if (!existsSync(packageJsonPath)) {
    return 'unknown';
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as Record<string, unknown>;
    return typeof packageJson.version === 'string' ? packageJson.version : 'unknown';
  } catch {
    return 'unknown';
  }
};

const redactEnvString = (env: string | null | undefined): string | null | undefined => {
  if (!env) {
    return env;
  }

  try {
    const parsed = JSON.parse(env) as Record<string, string>;
    const redacted = Object.fromEntries(
      Object.keys(parsed).map((key) => [key, '[REDACTED]'])
    );
    return JSON.stringify(redacted);
  } catch {
    return '[REDACTED]';
  }
};

const buildBackupPayload = (includeSensitive = false): BackupPayload => {
  const servers = db.prepare('SELECT * FROM servers ORDER BY name').all() as Array<z.infer<typeof BackupServerSchema>>;
  const tools = db.prepare('SELECT * FROM tools ORDER BY server_id, tool_name').all() as Array<z.infer<typeof BackupToolSchema>>;
  const projects = db.prepare('SELECT * FROM projects ORDER BY name').all() as Array<z.infer<typeof BackupProjectSchema>>;
  const projectServerRows = db.prepare('SELECT project_id, server_id FROM project_servers ORDER BY project_id, server_id').all() as Array<Record<string, unknown>>;

  const payload: BackupPayload = {
    version: 'konduct-backup-v1',
    exportedAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    data: {
      servers: servers.map((server) => ({
        ...server,
        env: includeSensitive ? server.env : redactEnvString(server.env),
      })),
      tools,
      projects,
      projectServers: projectServerRows.map((row) => ({
        projectId: row.project_id as string,
        serverId: row.server_id as string,
      })),
    },
  };

  return BackupPayloadSchema.parse(payload);
};

const analyzeImportImpact = (payload: BackupPayload, mode: ImportMode): { summary: ImportSummary; messages: string[] } => {
  const summary = emptySummary();
  const messages: string[] = [];

  if (mode === 'replace') {
    const currentServers = db.prepare('SELECT COUNT(*) as count FROM servers').get() as { count: number };
    const currentTools = db.prepare('SELECT COUNT(*) as count FROM tools').get() as { count: number };
    const currentProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
    const currentRelations = db.prepare('SELECT COUNT(*) as count FROM project_servers').get() as { count: number };

    summary.removed = currentServers.count + currentTools.count + currentProjects.count + currentRelations.count;
    summary.created =
      payload.data.servers.length +
      payload.data.tools.length +
      payload.data.projects.length +
      payload.data.projectServers.length;
    messages.push('Replace mode will overwrite current configuration data.');
    return { summary, messages };
  }

  const existingServersById = new Set(
    (db.prepare('SELECT id FROM servers').all() as Array<Record<string, unknown>>).map((row) => row.id as string)
  );
  const existingServerNames = new Set(
    (db.prepare('SELECT name FROM servers').all() as Array<Record<string, unknown>>).map((row) => row.name as string)
  );
  // Build tool lookup maps: id -> uuid and uuid -> id
  const existingToolRows = (db.prepare('SELECT id, uuid FROM tools').all() as Array<Record<string, unknown>>);
  const existingToolsById = new Set(existingToolRows.map((row) => row.id as string));
  const existingToolsByUuid = new Set(existingToolRows.filter(row => row.uuid).map((row) => row.uuid as string));
  const existingProjectsById = new Set(
    (db.prepare('SELECT id FROM projects').all() as Array<Record<string, unknown>>).map((row) => row.id as string)
  );
  const existingProjectNames = new Set(
    (db.prepare('SELECT name FROM projects').all() as Array<Record<string, unknown>>).map((row) => row.name as string)
  );

  for (const server of payload.data.servers) {
    if (existingServersById.has(server.id) || existingServerNames.has(server.name)) {
      summary.updated += 1;
    } else {
      summary.created += 1;
    }
  }

  for (const tool of payload.data.tools) {
    const isExistingId = existingToolsById.has(tool.id);
    const isExistingUuid = isUUID(tool.id) && existingToolsByUuid.has(tool.id);
    if (isExistingId || isExistingUuid) {
      summary.updated += 1;
    } else {
      summary.created += 1;
    }
  }

  for (const project of payload.data.projects) {
    if (existingProjectsById.has(project.id) || existingProjectNames.has(project.name)) {
      summary.updated += 1;
    } else {
      summary.created += 1;
    }
  }

  const importProjectIds = new Set(payload.data.projects.map((project) => project.id));
  const importServerIds = new Set(payload.data.servers.map((server) => server.id));

  for (const relation of payload.data.projectServers) {
    const projectKnown = importProjectIds.has(relation.projectId) || existingProjectsById.has(relation.projectId);
    const serverKnown = importServerIds.has(relation.serverId) || existingServersById.has(relation.serverId);

    if (!projectKnown || !serverKnown) {
      summary.errors += 1;
      messages.push(`Relation skipped: project '${relation.projectId}' or server '${relation.serverId}' not found.`);
    } else {
      summary.created += 1;
    }
  }

  return { summary, messages };
};

const applyImportMerge = (payload: BackupPayload): { summary: ImportSummary; messages: string[] } => {
  const summary = emptySummary();
  const messages: string[] = [];

  const runMerge = db.transaction(() => {
    const existingServers = db.prepare('SELECT id, name FROM servers').all() as Array<Record<string, unknown>>;
    const existingProjects = db.prepare('SELECT id, name FROM projects').all() as Array<Record<string, unknown>>;

    const serverIdByName = new Map(existingServers.map((row) => [row.name as string, row.id as string]));
    const serverExistsById = new Set(existingServers.map((row) => row.id as string));
    const projectIdByName = new Map(existingProjects.map((row) => [row.name as string, row.id as string]));
    const projectExistsById = new Set(existingProjects.map((row) => row.id as string));

    const serverIdMap = new Map<string, string>();
    const projectIdMap = new Map<string, string>();

    const updateServerStmt = db.prepare(`
    UPDATE servers
    SET name = ?, transport = ?, command = ?, args = ?, env = ?, url = ?, enabled = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
    const insertServerStmt = db.prepare(`
    INSERT INTO servers (id, name, transport, command, args, env, url, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
  `);

    for (const server of payload.data.servers) {
      let targetServerId = server.id;

      if (serverExistsById.has(server.id)) {
        summary.updated += 1;
      } else {
        const byNameId = serverIdByName.get(server.name);
        if (byNameId) {
          targetServerId = byNameId;
          summary.updated += 1;
        } else {
          summary.created += 1;
        }
      }

      if (serverExistsById.has(targetServerId)) {
        updateServerStmt.run(
          server.name,
          server.transport,
          server.command ?? null,
          server.args ?? null,
          server.env ?? null,
          server.url ?? null,
          server.enabled,
          targetServerId
        );
      } else {
        insertServerStmt.run(
          targetServerId,
          server.name,
          server.transport,
          server.command ?? null,
          server.args ?? null,
          server.env ?? null,
          server.url ?? null,
          server.enabled,
          server.created_at ?? null,
          server.updated_at ?? null
        );
        serverExistsById.add(targetServerId);
        serverIdByName.set(server.name, targetServerId);
      }

      serverIdMap.set(server.id, targetServerId);
    }

    const updateProjectStmt = db.prepare(`
    UPDATE projects
    SET name = ?, description = ?
    WHERE id = ?
  `);
    const insertProjectStmt = db.prepare(`
    INSERT INTO projects (id, name, description, created_at)
    VALUES (?, ?, ?, COALESCE(?, datetime('now')))
  `);

    for (const project of payload.data.projects) {
      let targetProjectId = project.id;

      if (projectExistsById.has(project.id)) {
        summary.updated += 1;
      } else {
        const byNameId = projectIdByName.get(project.name);
        if (byNameId) {
          targetProjectId = byNameId;
          summary.updated += 1;
        } else {
          summary.created += 1;
        }
      }

      if (projectExistsById.has(targetProjectId)) {
        updateProjectStmt.run(project.name, project.description ?? null, targetProjectId);
      } else {
        insertProjectStmt.run(targetProjectId, project.name, project.description ?? null, project.created_at ?? null);
        projectExistsById.add(targetProjectId);
        projectIdByName.set(project.name, targetProjectId);
      }

      projectIdMap.set(project.id, targetProjectId);
    }

    // Build tool lookup maps for UUID migration support
    const existingToolRows = (db.prepare('SELECT id, uuid FROM tools').all() as Array<Record<string, unknown>>);
    const existingToolsById = new Set(existingToolRows.map((row) => row.id as string));
    const existingToolsByUuid = new Set(existingToolRows.filter(row => row.uuid).map((row) => row.uuid as string));
    const updateToolStmt = db.prepare('UPDATE tools SET server_id = ?, tool_name = ?, enabled = ? WHERE id = ?');
    const insertToolStmt = db.prepare(`
    INSERT INTO tools (id, uuid, server_id, tool_name, enabled, discovered_at)
    VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
  `);

    for (const tool of payload.data.tools) {
      const resolvedServerId = serverIdMap.get(tool.server_id) ?? tool.server_id;
      // Handle UUID migration: if tool.id is already a UUID, use it; otherwise generate new one
      let resolvedToolId: string;
      let resolvedUuid: string | undefined;

      if (isUUID(tool.id) && existingToolsByUuid.has(tool.id)) {
        // tool.id is an existing UUID
        resolvedToolId = tool.id;
        resolvedUuid = tool.id;
      } else if (existingToolsById.has(tool.id)) {
        // tool.id is an existing compound ID (legacy)
        resolvedToolId = tool.id;
      } else {
        // New tool - generate UUID for both id and uuid
        resolvedUuid = randomUUID();
        // Keep compound ID format for backward compat with existing discovery logic
        resolvedToolId = `${resolvedServerId}__${tool.tool_name}`;
      }

      if (existingToolsById.has(resolvedToolId) || (resolvedUuid && existingToolsByUuid.has(resolvedUuid))) {
        updateToolStmt.run(resolvedServerId, tool.tool_name, tool.enabled, resolvedToolId);
        summary.updated += 1;
      } else {
        insertToolStmt.run(resolvedToolId, resolvedUuid ?? null, resolvedServerId, tool.tool_name, tool.enabled, tool.discovered_at ?? null);
        existingToolsById.add(resolvedToolId);
        if (resolvedUuid) existingToolsByUuid.add(resolvedUuid);
        summary.created += 1;
      }
    }

    const insertRelationStmt = db.prepare('INSERT OR IGNORE INTO project_servers (project_id, server_id) VALUES (?, ?)');

    for (const relation of payload.data.projectServers) {
      const resolvedProjectId = projectIdMap.get(relation.projectId) ?? relation.projectId;
      const resolvedServerId = serverIdMap.get(relation.serverId) ?? relation.serverId;

      if (!projectExistsById.has(resolvedProjectId) || !serverExistsById.has(resolvedServerId)) {
        summary.errors += 1;
        messages.push(`Relation skipped: project '${relation.projectId}' or server '${relation.serverId}' not found.`);
        continue;
      }

      const result = insertRelationStmt.run(resolvedProjectId, resolvedServerId);
      if (result.changes > 0) {
        summary.created += 1;
      } else {
        summary.skipped += 1;
      }
    }
  });

  runMerge();
  return { summary, messages };
};

const applyImportReplace = (payload: BackupPayload): { summary: ImportSummary; messages: string[] } => {
  const summary = emptySummary();
  const messages: string[] = [];

  const currentServers = db.prepare('SELECT COUNT(*) as count FROM servers').get() as { count: number };
  const currentTools = db.prepare('SELECT COUNT(*) as count FROM tools').get() as { count: number };
  const currentProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
  const currentRelations = db.prepare('SELECT COUNT(*) as count FROM project_servers').get() as { count: number };
  summary.removed = currentServers.count + currentTools.count + currentProjects.count + currentRelations.count;

  const serverIds = new Set(payload.data.servers.map((server) => server.id));
  const projectIds = new Set(payload.data.projects.map((project) => project.id));

  const runReplace = db.transaction(() => {
    db.prepare('DELETE FROM project_servers').run();
    db.prepare('DELETE FROM tools').run();
    db.prepare('DELETE FROM projects').run();
    db.prepare('DELETE FROM servers').run();

    const insertServerStmt = db.prepare(`
      INSERT INTO servers (id, name, transport, command, args, env, url, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
    `);
    const insertToolStmt = db.prepare(`
      INSERT INTO tools (id, server_id, tool_name, enabled, discovered_at)
      VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))
    `);
    const insertProjectStmt = db.prepare(`
      INSERT INTO projects (id, name, description, created_at)
      VALUES (?, ?, ?, COALESCE(?, datetime('now')))
    `);
    const insertRelationStmt = db.prepare('INSERT OR IGNORE INTO project_servers (project_id, server_id) VALUES (?, ?)');

    for (const server of payload.data.servers) {
      insertServerStmt.run(
        server.id,
        server.name,
        server.transport,
        server.command ?? null,
        server.args ?? null,
        server.env ?? null,
        server.url ?? null,
        server.enabled,
        server.created_at ?? null,
        server.updated_at ?? null
      );
      summary.created += 1;
    }

    for (const tool of payload.data.tools) {
      if (!serverIds.has(tool.server_id)) {
        summary.errors += 1;
        messages.push(`Tool skipped: server '${tool.server_id}' not found.`);
        continue;
      }

      insertToolStmt.run(
        tool.id,
        tool.server_id,
        tool.tool_name,
        tool.enabled,
        tool.discovered_at ?? null
      );
      summary.created += 1;
    }

    for (const project of payload.data.projects) {
      insertProjectStmt.run(project.id, project.name, project.description ?? null, project.created_at ?? null);
      summary.created += 1;
    }

    for (const relation of payload.data.projectServers) {
      if (!projectIds.has(relation.projectId) || !serverIds.has(relation.serverId)) {
        summary.errors += 1;
        messages.push(`Relation skipped: project '${relation.projectId}' or server '${relation.serverId}' not found.`);
        continue;
      }

      const result = insertRelationStmt.run(relation.projectId, relation.serverId);
      if (result.changes > 0) {
        summary.created += 1;
      } else {
        summary.skipped += 1;
      }
    }
  });

  runReplace();
  return { summary, messages };
};

const applyImportPayload = (payload: BackupPayload, mode: ImportMode): { summary: ImportSummary; messages: string[] } => {
  if (mode === 'replace') {
    return applyImportReplace(payload);
  }
  return applyImportMerge(payload);
};

app.use('*', logger());
app.use('*', cors({
  origin: (origin) => (isAllowedOrigin(origin) ? origin ?? '' : ''),
  credentials: true,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// API Endpoints
app.get('/api/servers', (c) => {
  const includeSecrets = c.req.query('secrets') === 'true';
  return c.json(registry.listServers().map((server) => serializeServer(server, includeSecrets)));
});

app.get('/api/servers/:id', (c) => {
  const includeSecrets = c.req.query('secrets') === 'true';
  const server = registry.getServer(c.req.param('id'));
  if (!server) {
    return c.json({ error: 'Server not found' }, 404);
  }

  return c.json(serializeServer(server, includeSecrets));
});

app.post('/api/servers', async (c) => {
  try {
    const result = await parseJsonBody(c, ServerCreateSchema);
    if ('response' in result) {
      return result.response;
    }

    const data = result.data;
    const id = registry.addServer({
      name: data.name,
      transport: data.transport,
      command: data.transport === 'stdio' ? data.command ?? undefined : undefined,
      args: data.transport === 'stdio' ? data.args ?? undefined : undefined,
      env: data.env ?? undefined,
      url: data.transport === 'stdio' ? undefined : data.url ?? undefined,
      enabled: data.enabled ?? true,
    });

    return c.json(serializeServer(registry.getServer(id)!));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already exists')) {
      return c.json({ error: message }, 400);
    }

    return c.json({ error: message }, 500);
  }
});

// Schema for server update request - shared validation for create/edit normalization
const ServerUpdateSchema = z.object({
  name: z.string().min(1),
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().nullable().optional(),
  args: z.array(z.string()).nullable().optional(),
  env: z.record(z.string(), z.string()).nullable().optional(),
  url: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
});

app.post('/api/servers/:id/update', async (c) => {
  const id = c.req.param('id');
  
  // Validate existing server exists
  const existing = registry.getServer(id);
  if (!existing) {
    return c.json({ error: 'Server not found' }, 404);
  }

  const raw = await c.req.json();
  const parsed = ServerUpdateSchema.parse(raw);

  // Normalize payload: clear transport-specific fields per design spec
  // stdio: keep command, args, env; clear url
  // sse/streamable-http: keep url, env; clear command, args
  const normalized: Record<string, unknown> = {
    name: parsed.name,
    transport: parsed.transport,
  };

  if (parsed.transport === 'stdio') {
    normalized.command = parsed.command ?? null;
    normalized.args = parsed.args ?? null;
    normalized.env = parsed.env ?? null;
    normalized.url = null;
  } else {
    normalized.command = null;
    normalized.args = null;
    normalized.env = parsed.env ?? null;
    normalized.url = parsed.url ?? null;
  }

  if (parsed.enabled !== undefined) {
    normalized.enabled = parsed.enabled;
  }

  try {
    registry.updateServer(id, normalized);
    return c.json(serializeServer(registry.getServer(id)!));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already exists')) {
      return c.json({ error: message }, 400);
    }

    return c.json({ error: message }, 500);
  }
});

app.post('/api/servers/:id/toggle', (c) => {
  try {
    const id = c.req.param('id');
    const server = registry.getServer(id);
    if (!server) {
      return c.json({ error: 'Server not found' }, 404);
    }

    server.enabled ? registry.disableServer(id) : registry.enableServer(id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/api/servers/:id/delete', (c) => {
  try {
    const removed = registry.removeServer(c.req.param('id'));
    if (!removed) {
      return c.json({ error: 'Server not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/api/servers/import-json', async (c) => {
  try {
    const body = await c.req.json();
    const payload = JsonImportPayloadSchema.parse(body);
    const existingServers = registry.listServers();
    const existingByName = new Map(existingServers.map((server) => [server.name, server]));

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const messages: string[] = [];

    for (const [name, serverConfig] of Object.entries(payload.mcpServers)) {
      if (!serverConfig.command && !serverConfig.url) {
        errors += 1;
        messages.push(`'${name}' skipped: requires either command or url.`);
        continue;
      }

      const hasPlaceholderEnv = Object.values(serverConfig.env ?? {}).some((value) =>
        value.includes('YOUR_API_KEY') || value.includes('YOUR_')
      );
      if (hasPlaceholderEnv) {
        messages.push(`'${name}' imported with placeholder env values. Update secrets before use.`);
      }

      const transport = serverConfig.command ? 'stdio' : 'sse';
      const existing = existingByName.get(name);

      if (existing) {
        registry.updateServer(existing.id, {
          name,
          transport,
          command: serverConfig.command,
          args: serverConfig.args,
          env: serverConfig.env,
          url: serverConfig.url,
          enabled: true,
        });
        updated += 1;
      } else {
        registry.addServer({
          name,
          transport,
          command: serverConfig.command,
          args: serverConfig.args,
          env: serverConfig.env,
          url: serverConfig.url,
          enabled: true,
        });
        created += 1;
      }
    }

    if (created === 0 && updated === 0 && errors === 0) {
      skipped += 1;
      messages.push('No servers found in import payload.');
    }

    return c.json({
      success: errors === 0,
      summary: { created, updated, skipped, errors },
      messages,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        summary: { created: 0, updated: 0, skipped: 0, errors: error.issues.length },
        messages: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      }, 400);
    }

    return c.json({
      success: false,
      summary: { created: 0, updated: 0, skipped: 0, errors: 1 },
      messages: [error instanceof Error ? error.message : String(error)],
    }, 500);
  }
});

app.post('/api/servers/:id/discover', async (c) => {
  const id = c.req.param('id');
  try {
    await registry.discoverTools(id);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Server not found')) {
      return c.json({ error: message }, 404);
    }

    return c.json({ error: message }, 500);
  }
});

app.get('/api/tools', (c) => {
  return c.json(registry.listAllTools());
});

app.post('/api/tools/:id/toggle', (c) => {
  const id = c.req.param('id');
  const tools = registry.listAllTools();
  const tool = tools.find(t => t.id === id);
  if (tool) {
    tool.enabled ? registry.disableTool(id) : registry.enableTool(id);
  }
  return c.json({ success: true });
});

app.get('/api/projects', (c) => {
  const projects = db.prepare(`
    SELECT p.*, COUNT(ps.server_id) AS server_count
    FROM projects p
    LEFT JOIN project_servers ps ON p.id = ps.project_id
    GROUP BY p.id
    ORDER BY p.name
  `).all() as Array<Record<string, unknown>>;

  return c.json(projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.created_at,
    serverCount: Number(project.server_count ?? 0)
  })));
});

app.post('/api/projects', async (c) => {
  try {
    const result = await parseJsonBody(c, ProjectCreateSchema);
    if ('response' in result) {
      return result.response;
    }

    const id = result.data.description === undefined
      ? registry.createProject(result.data.name)
      : registry.createProject(result.data.name, result.data.description);
    return c.json({
      id,
      name: result.data.name,
      description: result.data.description,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already exists')) {
      return c.json({ error: message }, 400);
    }

    return c.json({ error: message }, 500);
  }
});

app.patch('/api/projects/:id', async (c) => {
  try {
    const result = await parseJsonBody(c, ProjectUpdateSchema);
    if ('response' in result) {
      return result.response;
    }

    registry.updateProject(c.req.param('id'), result.data);
    return c.json(registry.getProject(c.req.param('id')));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already exists')) {
      return c.json({ error: message }, 400);
    }
    if (message.includes('Project not found')) {
      return c.json({ error: message }, 404);
    }

    return c.json({ error: message }, 500);
  }
});

app.post('/api/projects/:id/delete', (c) => {
  try {
    const deleted = registry.deleteProject(c.req.param('id'));
    if (!deleted) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.get('/api/projects/:id/servers', (c) => {
  const projectId = c.req.param('id');
  const includeSecrets = c.req.query('secrets') === 'true';
  return c.json(registry.listServers(projectId).map((server) => serializeServer(server, includeSecrets)));
});

app.get('/api/projects/:id/full', (c) => {
  const projectId = c.req.param('id');
  const includeSecrets = c.req.query('secrets') === 'true';
  const project = registry.getProject(projectId);

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const servers = registry.getProjectServers(project.name).map((server) => serializeServer(server, includeSecrets));
  const tools = registry.getProjectTools(project.name);

  return c.json({
    project,
    servers,
    tools,
    summary: {
      serverCount: servers.length,
      toolCount: tools.length,
    },
    config: {
      command: `konduct start --project "${project.name}"`,
      description: 'Use this command in your MCP client config to scope access to this project only.',
    },
  });
});

app.post('/api/projects/:id/servers/:serverId/add', (c) => {
  try {
    const projectId = c.req.param('id');
    const serverId = c.req.param('serverId');
    const project = registry.getProject(projectId);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const server = registry.getServer(serverId);
    if (!server) {
      return c.json({ error: 'Server not found' }, 404);
    }

    registry.addServerToProject(projectId, serverId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/api/projects/:id/servers/:serverId/remove', (c) => {
  try {
    const projectId = c.req.param('id');
    const serverId = c.req.param('serverId');
    const project = registry.getProject(projectId);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const server = registry.getServer(serverId);
    if (!server) {
      return c.json({ error: 'Server not found' }, 404);
    }

    registry.removeServerFromProject(projectId, serverId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.get('/api/logs', (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const serverId = c.req.query('server');
  const errorOnly = c.req.query('error') === 'true';

  let query = 'SELECT * FROM request_logs';
  const params: any[] = [];
  const conditions: string[] = [];

  if (serverId) {
    conditions.push('server_id = ?');
    params.push(serverId);
  }
  if (errorOnly) {
    conditions.push('success = 0');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const logs = db.prepare(query).all(...params);
  return c.json(logs);
});

app.get('/api/stats', (c) => {
  const servers = registry.listServers();
  const tools = registry.listAllTools();
  return c.json({
    servers: servers.length,
    enabledServers: servers.filter(s => s.enabled).length,
    tools: tools.length,
    enabledTools: tools.filter(t => t.enabled).length,
    dbPath: getDbPath()
  });
});

app.get('/api/settings/export', (c) => {
  const includeSensitive = c.req.query('sensitive') === 'true';
  return c.json(buildBackupPayload(includeSensitive));
});

app.post('/api/settings/import', async (c) => {
  const modeParam = c.req.query('mode');
  const dryRunParam = c.req.query('dryRun');

  const mode: ImportMode = modeParam === 'replace' ? 'replace' : 'merge';
  const dryRun = dryRunParam !== 'false';

  try {
    const body = await c.req.json();
    const payload = BackupPayloadSchema.parse(body);
    const { summary, messages } = analyzeImportImpact(payload, mode);

    if (dryRun) {
      return c.json({
        success: true,
        mode,
        dryRun: true,
        summary,
        messages: messages.length > 0 ? messages : ['Dry run completed successfully.'],
      });
    }

    const applyResult = applyImportPayload(payload, mode);

    return c.json({
      success: true,
      mode,
      dryRun: false,
      summary: applyResult.summary,
      messages: applyResult.messages.length > 0 ? applyResult.messages : ['Import applied successfully.'],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        mode,
        dryRun,
        summary: emptySummary(),
        messages: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      }, 400);
    }

    return c.json({
      success: false,
      mode,
      dryRun,
      summary: emptySummary(),
      messages: [error instanceof Error ? error.message : String(error)],
    }, 500);
  }
});

const clientDist = join(__dirname, 'client');

app.use('/*', serveStatic({ root: clientDist }));

app.get('*', (c) => {
  const indexPath = join(clientDist, 'index.html');
  if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, 'utf-8');
    return c.html(html);
  }
  return c.text('Frontend not built. Run npm run build.', 404);
});

export default app;
