import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { registry } from '../core/registry.js';
import {
  analyzeImportImpact,
  applyImportPayload,
  BackupPayloadSchema,
  buildBackupPayload,
  emptySummary,
  type ImportMode,
} from '../core/settings-backup-service.js';
import { getDbPath } from '../config/db.js';
import { db } from '../config/db.js';
import { readFileSync, existsSync } from 'fs';
import { parseJsonBody, serializeServer } from './http-helpers.js';
import { registerProjectRoutes } from './projects.js';

// Get directory of this file (works in ESM and after compilation)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

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

const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) {
    return true;
  }

  return LOCALHOST_ORIGIN_PATTERN.test(origin);
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
registerProjectRoutes(app);

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
