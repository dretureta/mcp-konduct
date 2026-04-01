import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockServerRow = {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'streamable-http';
  command?: string | null;
  args?: string | null;
  env?: string | null;
  url?: string | null;
  enabled: number;
  created_at?: string;
  updated_at?: string;
};

type MockProjectRow = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
};

type MockRelationRow = {
  project_id: string;
  server_id: string;
};

const mocks = vi.hoisted(() => {
  const state = {
    servers: [] as MockServerRow[],
    tools: [] as Array<Record<string, unknown>>,
    projects: [] as MockProjectRow[],
    relations: [] as MockRelationRow[],
    failOnProjectInsert: false,
  };

  const clone = (): typeof state => JSON.parse(JSON.stringify(state));
  const restore = (snapshot: typeof state): void => {
    state.servers = snapshot.servers;
    state.tools = snapshot.tools;
    state.projects = snapshot.projects;
    state.relations = snapshot.relations;
    state.failOnProjectInsert = snapshot.failOnProjectInsert;
  };

  const reset = (): void => {
    state.servers = [];
    state.tools = [];
    state.projects = [];
    state.relations = [];
    state.failOnProjectInsert = false;
  };

  const mockTransaction = vi.fn((callback: () => unknown) => () => {
    const snapshot = clone();
    try {
      return callback();
    } catch (error) {
      restore(snapshot);
      throw error;
    }
  });

  const handleAll = (sql: string): Record<string, unknown>[] => {
    if (sql.includes('SELECT * FROM servers ORDER BY name')) {
      return state.servers as Record<string, unknown>[];
    }
    if (sql.includes('SELECT * FROM tools ORDER BY server_id, tool_name')) {
      return state.tools;
    }
    if (sql.includes('SELECT * FROM projects ORDER BY name')) {
      return state.projects as Record<string, unknown>[];
    }
    if (sql.includes('SELECT project_id, server_id FROM project_servers')) {
      return state.relations as Record<string, unknown>[];
    }
    if (sql.includes('SELECT id, name FROM servers')) {
      return state.servers.map((server) => ({ id: server.id, name: server.name }));
    }
    if (sql.includes('SELECT id, name FROM projects')) {
      return state.projects.map((project) => ({ id: project.id, name: project.name }));
    }
    if (sql.includes('SELECT id, uuid FROM tools')) {
      return state.tools.map((tool) => ({ id: tool.id, uuid: tool.uuid }));
    }
    if (sql.includes('SELECT id FROM servers')) {
      return state.servers.map((server) => ({ id: server.id }));
    }
    if (sql.includes('SELECT name FROM servers')) {
      return state.servers.map((server) => ({ name: server.name }));
    }
    if (sql.includes('SELECT id FROM projects')) {
      return state.projects.map((project) => ({ id: project.id }));
    }
    if (sql.includes('SELECT name FROM projects')) {
      return state.projects.map((project) => ({ name: project.name }));
    }

    return [];
  };

  const handleGet = (sql: string): Record<string, unknown> | undefined => {
    if (sql.includes('SELECT COUNT(*) as count FROM servers')) {
      return { count: state.servers.length };
    }
    if (sql.includes('SELECT COUNT(*) as count FROM tools')) {
      return { count: state.tools.length };
    }
    if (sql.includes('SELECT COUNT(*) as count FROM projects')) {
      return { count: state.projects.length };
    }
    if (sql.includes('SELECT COUNT(*) as count FROM project_servers')) {
      return { count: state.relations.length };
    }

    return undefined;
  };

  const handleRun = (sql: string, values: unknown[]): { changes: number } => {
    if (sql.includes('INSERT INTO servers')) {
      state.servers.push({
        id: values[0] as string,
        name: values[1] as string,
        transport: values[2] as MockServerRow['transport'],
        command: (values[3] as string | null | undefined) ?? null,
        args: (values[4] as string | null | undefined) ?? null,
        env: (values[5] as string | null | undefined) ?? null,
        url: (values[6] as string | null | undefined) ?? null,
        enabled: values[7] as number,
        created_at: (values[8] as string | undefined) ?? '2024-01-01T00:00:00.000Z',
        updated_at: (values[9] as string | undefined) ?? '2024-01-01T00:00:00.000Z',
      });
      return { changes: 1 };
    }

    if (sql.includes('INSERT INTO projects')) {
      if (state.failOnProjectInsert) {
        throw new Error('project insert failed');
      }

      state.projects.push({
        id: values[0] as string,
        name: values[1] as string,
        description: (values[2] as string | null | undefined) ?? null,
        created_at: (values[3] as string | undefined) ?? '2024-01-01T00:00:00.000Z',
      });
      return { changes: 1 };
    }

    if (sql.includes('INSERT OR IGNORE INTO project_servers')) {
      state.relations.push({ project_id: values[0] as string, server_id: values[1] as string });
      return { changes: 1 };
    }

    if (sql.includes('DELETE FROM project_servers')) {
      state.relations = [];
      return { changes: 1 };
    }
    if (sql.includes('DELETE FROM tools')) {
      state.tools = [];
      return { changes: 1 };
    }
    if (sql.includes('DELETE FROM projects')) {
      state.projects = [];
      return { changes: 1 };
    }
    if (sql.includes('DELETE FROM servers')) {
      state.servers = [];
      return { changes: 1 };
    }

    return { changes: 1 };
  };

  const mockPrepare = vi.fn((sql: string) => ({
    all: vi.fn(() => handleAll(sql)),
    get: vi.fn(() => handleGet(sql)),
    run: vi.fn((...values: unknown[]) => handleRun(sql, values)),
  }));

  return {
    state,
    reset,
    mockTransaction,
    mockPrepare,
  };
});

vi.mock('../core/registry.js', () => ({
  registry: {
    listServers: vi.fn(() => []),
    getServer: vi.fn(() => null),
    addServer: vi.fn(),
    updateServer: vi.fn(),
    createProject: vi.fn(),
    deleteProject: vi.fn(),
    addServerToProject: vi.fn(),
    removeServerFromProject: vi.fn(),
    discoverTools: vi.fn(),
    listAllTools: vi.fn(() => []),
    disableTool: vi.fn(),
    enableTool: vi.fn(),
    getProject: vi.fn(() => null),
    getProjectServers: vi.fn(() => []),
    getProjectTools: vi.fn(() => []),
  },
}));

vi.mock('../config/db.js', () => ({
  db: {
    prepare: mocks.mockPrepare,
    exec: vi.fn(),
    transaction: mocks.mockTransaction,
  },
  getDbPath: vi.fn(() => '/test/db/path'),
}));

import app from './index.js';

const request = async (path: string, init?: RequestInit): Promise<Response> => {
  return app.fetch(new Request(new URL(path, 'http://localhost'), init));
};

const createPayload = (): Record<string, unknown> => ({
  version: 'konduct-backup-v1',
  exportedAt: '2026-03-31T00:00:00.000Z',
  appVersion: '1.6.4',
  data: {
    servers: [
      {
        id: 'server-1',
        name: 'alpha',
        transport: 'stdio',
        command: 'node',
        args: null,
        env: '{"API_KEY":"super-secret"}',
        url: null,
        enabled: 1,
      },
    ],
    tools: [],
    projects: [
      {
        id: 'project-1',
        name: 'project-alpha',
        description: 'demo',
      },
    ],
    projectServers: [],
  },
});

describe('Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reset();
    mocks.state.servers = [
      {
        id: 'server-existing',
        name: 'existing',
        transport: 'stdio',
        command: 'node',
        args: null,
        env: '{"API_KEY":"real-secret","DEBUG":"true"}',
        url: null,
        enabled: 1,
      },
    ];
  });

  describe('GET /api/settings/export', () => {
    it('should sanitize env values by default', async () => {
      const response = await request('/api/settings/export');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(JSON.parse(json.data.servers[0].env)).toEqual({
        API_KEY: '[REDACTED]',
        DEBUG: '[REDACTED]',
      });
    });

    it('should preserve real secrets when sensitive=true', async () => {
      const response = await request('/api/settings/export?sensitive=true');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(JSON.parse(json.data.servers[0].env)).toEqual({
        API_KEY: 'real-secret',
        DEBUG: 'true',
      });
    });

    it('should fail closed when env payload is malformed', async () => {
      mocks.state.servers[0].env = 'API_KEY=real-secret';

      const response = await request('/api/settings/export');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.servers[0].env).toBe('[REDACTED]');
    });
  });

  describe('POST /api/settings/import', () => {
    it('should use a transaction for merge imports', async () => {
      const response = await request('/api/settings/import?mode=merge&dryRun=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload()),
      });

      expect(response.status).toBe(200);
      expect(mocks.mockTransaction).toHaveBeenCalled();
    });

    it('should rollback merge changes if a later insert fails', async () => {
      mocks.state.servers = [];
      mocks.state.failOnProjectInsert = true;

      const response = await request('/api/settings/import?mode=merge&dryRun=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload()),
      });

      expect(response.status).toBe(500);
      expect(mocks.state.servers).toHaveLength(0);
      expect(mocks.state.projects).toHaveLength(0);
    });

    it('should still support dry-run preview with valid payloads', async () => {
      const response = await request('/api/settings/import?mode=merge&dryRun=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload()),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.dryRun).toBe(true);
    });
  });
});
