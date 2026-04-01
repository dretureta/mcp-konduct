import type { Hono } from 'hono';
import { db } from '../config/db.js';

export const registerLogRoutes = (app: Hono): void => {
  app.get('/api/logs', (c) => {
    const limit = parseInt(c.req.query('limit') || '50');
    const serverId = c.req.query('server');
    const errorOnly = c.req.query('error') === 'true';

    let query = 'SELECT * FROM request_logs';
    const params: unknown[] = [];
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
};
