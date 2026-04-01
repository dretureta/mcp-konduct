import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks to the top level using vi.hoisted
const mocks = vi.hoisted(() => {
  return {
    mockGetServer: vi.fn(),
    mockListServers: vi.fn(),
    mockAddServer: vi.fn(),
    mockUpdateServer: vi.fn(),
    mockCreateProject: vi.fn(),
    mockDbAll: vi.fn(),
    mockDbGet: vi.fn(),
  };
});

vi.mock('../core/registry.js', () => ({
  registry: {
    getServer: mocks.mockGetServer,
    listServers: mocks.mockListServers,
    addServer: mocks.mockAddServer,
    updateServer: mocks.mockUpdateServer,
    createProject: mocks.mockCreateProject,
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
  },
  getDbPath: vi.fn(() => '/test/db/path'),
}));

// Import after mocks
import app from './index.js';

type App = typeof app;

// Helper to create test request
const createTestRequest = async (
  app: App,
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> => {
  const url = new URL(path, 'http://localhost');
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  const init: RequestInit = {
    method,
    headers,
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const request = new Request(url, init);
  return app.fetch(request);
};

describe('Web API - Projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to return default values
    mocks.mockCreateProject.mockReset();
    mocks.mockCreateProject.mockReturnValue('new-project-id');
    mocks.mockAddServer.mockReset();
    mocks.mockAddServer.mockReturnValue('new-server-id');
  });

  describe('POST /api/projects', () => {
    it('should accept JSON body with name and description', async () => {
      const projectId = 'project-uuid-123';
      mocks.mockCreateProject.mockReturnValue(projectId);

      const response = await createTestRequest(app, 'POST', '/api/projects', {
        body: { name: 'my-project', description: 'A test project' },
      });

      expect(response.status).toBe(200);
      expect(mocks.mockCreateProject).toHaveBeenCalledWith('my-project', 'A test project');
      
      const json = await response.json();
      expect(json).toHaveProperty('id', projectId);
      expect(json).toHaveProperty('name', 'my-project');
      expect(json).toHaveProperty('description', 'A test project');
    });

    it('should accept JSON body with name only (description optional)', async () => {
      const projectId = 'project-uuid-456';
      mocks.mockCreateProject.mockReturnValue(projectId);

      const response = await createTestRequest(app, 'POST', '/api/projects', {
        body: { name: 'minimal-project' },
      });

      expect(response.status).toBe(200);
      expect(mocks.mockCreateProject).toHaveBeenCalledWith('minimal-project');
      
      const json = await response.json();
      expect(json).toHaveProperty('id', projectId);
      expect(json).toHaveProperty('name', 'minimal-project');
    });

    it('should return 400 for missing name', async () => {
      const response = await createTestRequest(app, 'POST', '/api/projects', {
        body: { description: 'No name provided' },
      });

      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json).toHaveProperty('error');
    });

    it('should return 400 for empty name', async () => {
      const response = await createTestRequest(app, 'POST', '/api/projects', {
        body: { name: '' },
      });

      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json).toHaveProperty('error');
    });

    it('should return 400 for invalid JSON', async () => {
      const url = new URL('/api/projects', 'http://localhost');
      const response = await app.fetch(new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{',
      }));

      expect(response.status).toBe(400);
    });

    it('should return 400 for duplicate project name', async () => {
      // Override the default mock for this specific test
      mocks.mockCreateProject.mockReset();
      mocks.mockCreateProject.mockImplementation(() => {
        throw new Error("Project with name 'duplicate' already exists");
      });

      const response = await createTestRequest(app, 'POST', '/api/projects', {
        body: { name: 'duplicate' },
      });

      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('already exists');
    });
  });
});

describe('Web API - Servers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default return values
    mocks.mockGetServer.mockReset();
    mocks.mockAddServer.mockReset();
    mocks.mockUpdateServer.mockReset();
    mocks.mockAddServer.mockReturnValue('new-server-id');
  });

  describe('GET /api/servers/:id', () => {
    it('should return 404 for non-existent server', async () => {
      mocks.mockGetServer.mockReturnValue(null);

      const response = await createTestRequest(app, 'GET', '/api/servers/non-existent-id');

      expect(response.status).toBe(404);
      
      const json = await response.json();
      expect(json).toHaveProperty('error', 'Server not found');
    });

    it('should return 200 with server data for existing server', async () => {
      const mockServer = {
        id: 'server-123',
        name: 'test-server',
        transport: 'stdio' as const,
        command: 'node',
        args: ['server.js'],
        env: undefined,
        url: undefined,
        enabled: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      mocks.mockGetServer.mockReturnValue(mockServer);

      const response = await createTestRequest(app, 'GET', '/api/servers/server-123');

      expect(response.status).toBe(200);
      
      const json = await response.json();
      expect(json).toEqual(mockServer);
    });
  });

  describe('POST /api/servers', () => {
    it('should return 400 for missing required fields', async () => {
      const response = await createTestRequest(app, 'POST', '/api/servers', {
        body: { description: 'Missing name and transport' },
      });

      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json).toHaveProperty('error');
    });

    it('should return 400 for invalid transport type', async () => {
      const response = await createTestRequest(app, 'POST', '/api/servers', {
        body: {
          name: 'test-server',
          transport: 'invalid-transport',
        },
      });

      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json).toHaveProperty('error');
    });

    it('should return 400 when stdio server is missing command', async () => {
      const response = await createTestRequest(app, 'POST', '/api/servers', {
        body: {
          name: 'stdio-server',
          transport: 'stdio',
        },
      });

      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json).toHaveProperty('error');
    });

    it('should return 400 when remote server is missing url', async () => {
      const response = await createTestRequest(app, 'POST', '/api/servers', {
        body: {
          name: 'remote-server',
          transport: 'sse',
        },
      });

      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json).toHaveProperty('error');
    });

    it('should return 400 for empty server name', async () => {
      const response = await createTestRequest(app, 'POST', '/api/servers', {
        body: {
          name: '',
          transport: 'stdio',
        },
      });

      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json).toHaveProperty('error');
    });

    it('should return 400 for duplicate server name', async () => {
      mocks.mockAddServer.mockImplementation(() => {
        throw new Error("Server with name 'existing' already exists");
      });

      const response = await createTestRequest(app, 'POST', '/api/servers', {
        body: {
          name: 'existing',
          transport: 'stdio',
          command: 'node',
        },
      });

      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('already exists');
    });

    it('should return 400 for missing transport', async () => {
      const response = await createTestRequest(app, 'POST', '/api/servers', {
        body: {
          name: 'test-server',
        },
      });

      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json).toHaveProperty('error');
    });

    it('should return 400 for invalid JSON', async () => {
      const url = new URL('/api/servers', 'http://localhost');
      const response = await app.fetch(new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-valid-json',
      }));

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/servers/:id/update', () => {
    it('should return 400 when renaming to a duplicate server name', async () => {
      mocks.mockGetServer.mockReturnValue({
        id: 'server-123',
        name: 'server-123',
        transport: 'stdio',
        command: 'node',
        enabled: true,
      });
      mocks.mockUpdateServer.mockImplementation(() => {
        throw new Error("Server with name 'existing-server' already exists");
      });

      const response = await createTestRequest(app, 'POST', '/api/servers/server-123/update', {
        body: {
          name: 'existing-server',
          transport: 'stdio',
          command: 'node',
        },
      });

      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('already exists');
    });
  });
});
