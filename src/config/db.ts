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

// Migrate request_logs table: add project_id, project_name, router_session_id if missing
const migrationColumns: Array<{ name: string; sql: string }> = [
  { name: 'project_id', sql: 'ALTER TABLE request_logs ADD COLUMN project_id TEXT' },
  { name: 'project_name', sql: 'ALTER TABLE request_logs ADD COLUMN project_name TEXT' },
  { name: 'router_session_id', sql: 'ALTER TABLE request_logs ADD COLUMN router_session_id TEXT' },
];
const columns = db.prepare("PRAGMA table_info(request_logs)").all() as Array<Record<string, unknown>>;
const existingColumns = new Set(columns.map(c => String(c.name)));
for (const col of migrationColumns) {
  if (!existingColumns.has(col.name)) {
    db.exec(col.sql);
  }
}

// Create indexes for new columns (if not exist)
const existingIndexes = new Set(
  (db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<Record<string, unknown>>).map(r => String(r.name))
);
if (!existingIndexes.has('idx_request_logs_project_id')) {
  db.exec('CREATE INDEX IF NOT EXISTS idx_request_logs_project_id ON request_logs(project_id)');
}
if (!existingIndexes.has('idx_request_logs_router_session_id')) {
  db.exec('CREATE INDEX IF NOT EXISTS idx_request_logs_router_session_id ON request_logs(router_session_id)');
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
