import type { Hono } from 'hono';
import { getDbPath } from '../config/db.js';
import { registry } from '../core/registry.js';

export const registerStatRoutes = (app: Hono): void => {
  app.get('/api/stats', (c) => {
    const servers = registry.listServers();
    const tools = registry.listAllTools();

    return c.json({
      servers: servers.length,
      enabledServers: servers.filter((server) => server.enabled).length,
      tools: tools.length,
      enabledTools: tools.filter((tool) => tool.enabled).length,
      dbPath: getDbPath(),
    });
  });
};
