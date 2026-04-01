import type { Hono } from 'hono';
import { registry } from '../core/registry.js';

export const registerToolRoutes = (app: Hono): void => {
  app.get('/api/tools', (c) => {
    return c.json(registry.listAllTools());
  });

  app.post('/api/tools/:id/toggle', (c) => {
    const id = c.req.param('id');
    const tools = registry.listAllTools();
    const tool = tools.find((item) => item.id === id);

    if (tool) {
      tool.enabled ? registry.disableTool(id) : registry.enableTool(id);
    }

    return c.json({ success: true });
  });
};
