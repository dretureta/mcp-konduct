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
import { registerLogRoutes } from './logs.js';
import { registerProjectRoutes } from './projects.js';
import { registerServerRoutes } from './servers.js';
import { registerStatRoutes } from './stats.js';
import { registerToolRoutes } from './tools.js';

// Get directory of this file (works in ESM and after compilation)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

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
  allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// API Endpoints
registerServerRoutes(app);
registerToolRoutes(app);
registerProjectRoutes(app);
registerLogRoutes(app);
registerStatRoutes(app);

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
