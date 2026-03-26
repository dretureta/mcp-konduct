import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { join } from 'path';
import { registry } from '../core/registry.js';
import { getDbPath } from '../config/db.js';
import { db } from '../config/db.js';
import { readFileSync, existsSync } from 'fs';

const app = new Hono();

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
