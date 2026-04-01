import type { Hono } from 'hono';
import { z } from 'zod';
import { registry } from '../core/registry.js';
import { parseJsonBody, serializeServer } from './http-helpers.js';

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

const ServerUpdateSchema = z.object({
  name: z.string().min(1),
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().nullable().optional(),
  args: z.array(z.string()).nullable().optional(),
  env: z.record(z.string(), z.string()).nullable().optional(),
  url: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
});

export const registerServerRoutes = (app: Hono): void => {
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

  app.post('/api/servers/:id/update', async (c) => {
    const id = c.req.param('id');
    const existing = registry.getServer(id);
    if (!existing) {
      return c.json({ error: 'Server not found' }, 404);
    }

    const raw = await c.req.json();
    const parsed = ServerUpdateSchema.parse(raw);
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
};
