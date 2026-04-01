import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../config/db.js';
import { registry } from '../core/registry.js';
import { parseJsonBody, serializeServer } from './http-helpers.js';

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

export const registerProjectRoutes = (app: Hono): void => {
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
      serverCount: Number(project.server_count ?? 0),
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
};
