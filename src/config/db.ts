import Database, { Database as DatabaseType } from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { CREATE_TABLES_SQL } from './schema.js';

const isWindows = process.platform === 'win32';
const dbDir = isWindows
  ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'mcp-konduct')
  : join(homedir(), '.config', 'mcp-konduct');

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const dbPath = join(dbDir, 'konduct.db');

export const db: DatabaseType = new Database(dbPath);

export type { DatabaseType };

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const statements = CREATE_TABLES_SQL.split(';').filter(s => s.trim());
for (const stmt of statements) {
  if (stmt.trim()) {
    db.exec(stmt);
  }
}

// Retain only last 30 days of request logs
try {
  db.prepare("DELETE FROM request_logs WHERE timestamp < datetime('now', '-30 days')").run();
} catch {
  // Non-critical: ignore retention errors
}

export function getDbPath(): string {
  return dbPath;
}
