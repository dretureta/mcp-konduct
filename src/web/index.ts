import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { join } from 'path';
import { z } from 'zod';
import { registry } from '../core/registry.js';
import { getDbPath } from '../config/db.js';
import { db } from '../config/db.js';
import { readFileSync, existsSync } from 'fs';

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

const buildBackupPayload = (): BackupPayload => {
  const servers = db.prepare('SELECT * FROM servers ORDER BY name').all() as Array<z.infer<typeof BackupServerSchema>>;
  const tools = db.prepare('SELECT * FROM tools ORDER BY server_id, tool_name').all() as Array<z.infer<typeof BackupToolSchema>>;
  const projects = db.prepare('SELECT * FROM projects ORDER BY name').all() as Array<z.infer<typeof BackupProjectSchema>>;
  const projectServerRows = db.prepare('SELECT project_id, server_id FROM project_servers ORDER BY project_id, server_id').all() as Array<Record<string, unknown>>;

  const payload: BackupPayload = {
    version: 'konduct-backup-v1',
    exportedAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    data: {
      servers,
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
  const existingToolsById = new Set(
    (db.prepare('SELECT id FROM tools').all() as Array<Record<string, unknown>>).map((row) => row.id as string)
  );
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
    if (existingToolsById.has(tool.id)) {
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

app.use('*', logger());
app.use('*', cors());

// API Endpoints
app.get('/api/servers', (c) => {
  return c.json(registry.listServers());
});

app.post('/api/servers', async (c) => {
  const data = await c.req.json();
  const id = registry.addServer(data);
  return c.json(registry.getServer(id));
});

app.post('/api/servers/:id/update', async (c) => {
  const id = c.req.param('id');
  const data = await c.req.json();
  const stmt = db.prepare(`
    UPDATE servers 
    SET name = ?, transport = ?, command = ?, args = ?, url = ?
    WHERE id = ?
  `);
  stmt.run(
    data.name,
    data.transport,
    data.command || null,
    data.args ? JSON.stringify(data.args) : null,
    data.url || null,
    id
  );
  return c.json(registry.getServer(id));
});

app.post('/api/servers/:id/toggle', (c) => {
  const id = c.req.param('id');
  const server = registry.getServer(id);
  if (server) {
    server.enabled ? registry.disableServer(id) : registry.enableServer(id);
  }
  return c.json({ success: true });
});

app.post('/api/servers/:id/delete', (c) => {
  registry.removeServer(c.req.param('id'));
  return c.json({ success: true });
});

app.post('/api/servers/:id/discover', async (c) => {
  const id = c.req.param('id');
  await registry.discoverTools(id);
  return c.json({ success: true });
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
  const name = c.req.query('name');
  if (name) {
    registry.createProject(name);
  }
  return c.json({ success: true });
});

app.post('/api/projects/:id/delete', (c) => {
  registry.deleteProject(c.req.param('id'));
  return c.json({ success: true });
});

app.get('/api/projects/:id/servers', (c) => {
  const projectId = c.req.param('id');
  return c.json(registry.listServers(projectId));
});

app.post('/api/projects/:id/servers/:serverId/add', (c) => {
  const projectId = c.req.param('id');
  const serverId = c.req.param('serverId');
  registry.addServerToProject(projectId, serverId);
  return c.json({ success: true });
});

app.post('/api/projects/:id/servers/:serverId/remove', (c) => {
  const projectId = c.req.param('id');
  const serverId = c.req.param('serverId');
  registry.removeServerFromProject(projectId, serverId);
  return c.json({ success: true });
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
  return c.json(buildBackupPayload());
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

    return c.json({
      success: false,
      mode,
      dryRun: false,
      summary,
      messages: ['Apply mode not implemented yet. Use dryRun=true for preview.'],
    }, 501);
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

// Static files and SPA fallback
const clientDist = join(process.cwd(), 'dist/web/client');

app.use('/*', serveStatic({ root: './dist/web/client' }));

app.get('*', (c) => {
  const indexPath = join(clientDist, 'index.html');
  if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, 'utf-8');
    return c.html(html);
  }
  return c.text('Frontend not built. Run npm run build.', 404);
});

export default app;
