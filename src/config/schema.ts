export const CREATE_TABLES_SQL = `
-- Servidores MCP registrados
CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  transport TEXT NOT NULL,
  command TEXT,
  args TEXT,
  env TEXT,
  url TEXT,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tools individuales con toggle
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  input_schema TEXT,
  output_schema TEXT,
  enabled INTEGER DEFAULT 1,
  discovered_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

-- Proyectos (agrupaciones de servidores)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Relación proyecto <-> servidor
CREATE TABLE IF NOT EXISTS project_servers (
  project_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  PRIMARY KEY (project_id, server_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

-- Logs de requests (para analytics)
CREATE TABLE IF NOT EXISTS request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT (datetime('now')),
  server_id TEXT,
  tool_name TEXT,
  duration_ms INTEGER,
  success INTEGER,
  error_message TEXT
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tools_server_id ON tools(server_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_request_logs_server_id ON request_logs(server_id);
`;
