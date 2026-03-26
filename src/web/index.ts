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

