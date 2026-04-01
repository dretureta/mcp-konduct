import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetServer: vi.fn(),
  mockRemoveServer: vi.fn(),
  mockEnableServer: vi.fn(),
  mockDisableServer: vi.fn(),
  mockDiscoverTools: vi.fn(),
  mockGetProject: vi.fn(),
  mockDeleteProject: vi.fn(),
  mockAddServerToProject: vi.fn(),
  mockRemoveServerFromProject: vi.fn(),
  mockDbAll: vi.fn(),
  mockDbGet: vi.fn(),
}));

vi.mock('../core/registry.js', () => ({
  registry: {
    getServer: mocks.mockGetServer,
    listServers: vi.fn(() => []),
    addServer: vi.fn(),
    updateServer: vi.fn(),
    createProject: vi.fn(),
    removeServer: mocks.mockRemoveServer,
    enableServer: mocks.mockEnableServer,
    disableServer: mocks.mockDisableServer,
    discoverTools: mocks.mockDiscoverTools,
    getProject: mocks.mockGetProject,
    deleteProject: mocks.mockDeleteProject,
    addServerToProject: mocks.mockAddServerToProject,
    removeServerFromProject: mocks.mockRemoveServerFromProject,
    getProjectServers: vi.fn(() => []),
    getProjectTools: vi.fn(() => []),
    listAllTools: vi.fn(() => []),
    disableTool: vi.fn(),
    enableTool: vi.fn(),
  },
}));

vi.mock('../config/db.js', () => ({
  db: {
    prepare: vi.fn(() => ({
      get: mocks.mockDbGet,
      all: mocks.mockDbAll,
      run: vi.fn(() => ({ changes: 1 })),
    })),
    exec: vi.fn(),
    transaction: vi.fn((callback: () => unknown) => callback),
  },
  getDbPath: vi.fn(() => '/test/db/path'),
}));

import app from './index.js';

const request = async (path: string, init?: RequestInit): Promise<Response> => {
  return app.fetch(new Request(new URL(path, 'http://localhost'), init));
};

describe('Web API - Error envelopes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockRemoveServer.mockReturnValue(true);
    mocks.mockDeleteProject.mockReturnValue(true);
    mocks.mockGetServer.mockReturnValue({ id: 'server-1', enabled: true });
    mocks.mockGetProject.mockReturnValue({ id: 'project-1', name: 'alpha' });
    mocks.mockDiscoverTools.mockResolvedValue([]);
  });

  it('POST /api/servers/:id/toggle returns 404 when server is missing', async () => {
    mocks.mockGetServer.mockReturnValue(null);

    const response = await request('/api/servers/missing/toggle', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toHaveProperty('error');
  });

  it('POST /api/servers/:id/delete returns 404 when server is missing', async () => {
    mocks.mockRemoveServer.mockReturnValue(false);

    const response = await request('/api/servers/missing/delete', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toHaveProperty('error');
  });

  it('POST /api/servers/:id/delete returns 500 with error envelope on internal failure', async () => {
    mocks.mockRemoveServer.mockImplementation(() => {
      throw new Error('delete failed');
    });

    const response = await request('/api/servers/server-1/delete', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toHaveProperty('error', 'delete failed');
  });

  it('POST /api/servers/:id/discover returns 404 when server is missing', async () => {
    mocks.mockDiscoverTools.mockRejectedValue(new Error('Server not found: missing'));

    const response = await request('/api/servers/missing/discover', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toHaveProperty('error');
  });

  it('POST /api/servers/:id/discover returns 500 for internal failures', async () => {
    mocks.mockDiscoverTools.mockRejectedValue(new Error('Transport crashed'));

    const response = await request('/api/servers/server-1/discover', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toHaveProperty('error');
  });

  it('POST /api/servers/:id/toggle returns 500 with error envelope on lookup failure', async () => {
    mocks.mockGetServer.mockImplementation(() => {
      throw new Error('lookup failed');
    });

    const response = await request('/api/servers/server-1/toggle', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toHaveProperty('error', 'lookup failed');
  });

  it('POST /api/projects/:id/delete returns 404 when project is missing', async () => {
    mocks.mockDeleteProject.mockReturnValue(false);

    const response = await request('/api/projects/missing/delete', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toHaveProperty('error');
  });

  it('POST /api/projects/:id/delete returns 500 with error envelope on internal failure', async () => {
    mocks.mockDeleteProject.mockImplementation(() => {
      throw new Error('project delete failed');
    });

    const response = await request('/api/projects/project-1/delete', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toHaveProperty('error', 'project delete failed');
  });

  it('POST /api/projects/:id/servers/:serverId/add returns 404 when project is missing', async () => {
    mocks.mockGetProject.mockReturnValue(null);

    const response = await request('/api/projects/missing/servers/server-1/add', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toHaveProperty('error');
  });

  it('POST /api/projects/:id/servers/:serverId/add returns 404 when server is missing', async () => {
    mocks.mockGetServer.mockReturnValue(null);

    const response = await request('/api/projects/project-1/servers/missing/add', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toHaveProperty('error');
  });

  it('POST /api/projects/:id/servers/:serverId/add returns 500 with error envelope on lookup failure', async () => {
    mocks.mockGetProject.mockImplementation(() => {
      throw new Error('project lookup failed');
    });

    const response = await request('/api/projects/project-1/servers/server-1/add', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toHaveProperty('error', 'project lookup failed');
  });

  it('POST /api/projects/:id/servers/:serverId/remove returns 404 when project is missing', async () => {
    mocks.mockGetProject.mockReturnValue(null);

    const response = await request('/api/projects/missing/servers/server-1/remove', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toHaveProperty('error');
  });

  it('POST /api/projects/:id/servers/:serverId/remove returns 404 when server is missing', async () => {
    mocks.mockGetServer.mockReturnValue(null);

    const response = await request('/api/projects/project-1/servers/missing/remove', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toHaveProperty('error');
  });

  it('POST /api/projects/:id/servers/:serverId/remove returns 500 with error envelope on lookup failure', async () => {
    mocks.mockGetServer.mockImplementation(() => {
      throw new Error('server lookup failed');
    });

    const response = await request('/api/projects/project-1/servers/server-1/remove', { method: 'POST' });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toHaveProperty('error', 'server lookup failed');
  });
});
