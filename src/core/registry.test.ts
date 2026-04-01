import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerRegistry } from './registry.js';

// Mock the db module
const mockRun = vi.fn<() => { changes: number }>(() => ({ changes: 1 }));
const mockAll = vi.fn<() => Record<string, unknown>[]>(() => []);
const mockGet = vi.fn<() => Record<string, unknown> | undefined>();

vi.mock('../config/db.js', () => ({
  db: {
    prepare: vi.fn(() => ({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    })),
    exec: vi.fn(),
  },
}));

describe('ServerRegistry', () => {
  let registry: ServerRegistry;

  beforeEach(() => {
    registry = new ServerRegistry();
    vi.clearAllMocks();
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
    mockRun.mockReturnValue({ changes: 1 });
    mockAll.mockReturnValue([]);
    mockGet.mockReturnValue(undefined);
  });

  describe('addServer', () => {
    it('should add a server and return an ID', () => {
      mockGet.mockReturnValue(undefined); // No existing server

      const id = registry.addServer({
        name: 'test-server',
        transport: 'stdio',
        command: 'npx',
        enabled: true,
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(36); // UUID format
      expect(mockRun).toHaveBeenCalled();
    });

    it('should throw if server name already exists', () => {
      mockGet.mockReturnValue({ id: 'existing-id' }); // Server exists

      expect(() =>
        registry.addServer({
          name: 'duplicate-server',
          transport: 'stdio',
          enabled: true,
        })
      ).toThrow("Server with name 'duplicate-server' already exists");
    });
  });

  describe('removeServer', () => {
    it('should return true when server exists and is deleted', () => {
      mockRun.mockReturnValue({ changes: 1 });

      const result = registry.removeServer('existing-id');

      expect(result).toBe(true);
    });

    it('should return false when server does not exist', () => {
      mockRun.mockReturnValue({ changes: 0 });

      const result = registry.removeServer('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('getServer', () => {
    it('should return null for non-existent server', () => {
      mockGet.mockReturnValue(undefined);

      const result = registry.getServer('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return server config for existing server', () => {
      const mockRow = {
        id: 'test-id',
        name: 'test-server',
        transport: 'stdio',
        command: 'npx',
        args: null,
        env: null,
        url: null,
        enabled: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      mockGet.mockReturnValue(mockRow);

      const result = registry.getServer('test-id');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-id');
      expect(result?.name).toBe('test-server');
      expect(result?.enabled).toBe(true);
    });
  });

  describe('listServers', () => {
    it('should return all servers', () => {
      const mockRows: Record<string, unknown>[] = [
        {
          id: 'server-1',
          name: 'server-one',
          transport: 'stdio',
          command: 'node',
          args: null,
          env: null,
          url: null,
          enabled: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'server-2',
          name: 'server-two',
          transport: 'sse',
          command: null,
          args: null,
          env: null,
          url: 'http://localhost:3000',
          enabled: 0,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
      ];
      mockAll.mockReturnValue(mockRows as Record<string, unknown>[]);

      const result = registry.listServers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('server-one');
      expect(result[1].name).toBe('server-two');
      expect(result[1].enabled).toBe(false);
    });

    it('should return empty array when no servers exist', () => {
      mockAll.mockReturnValue([]);

      const result = registry.listServers();

      expect(result).toEqual([]);
    });

    it('should return servers for a specific project', () => {
      const mockRows: Record<string, unknown>[] = [
        {
          id: 'server-1',
          name: 'project-server',
          transport: 'stdio',
          command: 'node',
          args: null,
          env: null,
          url: null,
          enabled: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockAll.mockReturnValue(mockRows as Record<string, unknown>[]);

      const result = registry.listServers('project-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('project-server');
    });
  });

  describe('enableServer / disableServer', () => {
    it('should enable a server', () => {
      registry.enableServer('server-id');

      expect(mockRun).toHaveBeenCalledWith('server-id');
    });

    it('should disable a server', () => {
      registry.disableServer('server-id');

      expect(mockRun).toHaveBeenCalledWith('server-id');
    });
  });

  describe('getProjectTools', () => {
    it('should return tools for a project using SQL JOIN', () => {
      // First call: getProjectByName
      // Second call: get tools via JOIN query
      const projectRow = {
        id: 'project-id',
        name: 'test-project',
        description: null,
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const toolRows: Record<string, unknown>[] = [
        {
          id: 'server-id__tool-1',
          server_id: 'server-id',
          tool_name: 'tool1',
          title: 'Tool One',
          description: 'A test tool',
          input_schema: '{"type":"object","properties":{"name":{"type":"string"}}}',
          output_schema: null,
          enabled: 1,
          discovered_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockGet
        .mockReturnValueOnce(projectRow) // getProjectByName
        .mockReturnValueOnce(toolRows[0]); // First tool row
      mockAll.mockReturnValue(toolRows);

      const result = registry.getProjectTools('test-project');

      expect(result).toHaveLength(1);
      expect(result[0].toolName).toBe('tool1');
      expect(result[0].title).toBe('Tool One');
    });

    it('should throw if project not found', () => {
      mockGet.mockReturnValue(undefined);

      expect(() => registry.getProjectTools('non-existent')).toThrow(
        'Project not found: non-existent'
      );
    });
  });

  describe('getServerTools', () => {
    it('should return tools for a server', () => {
      const mockRows: Record<string, unknown>[] = [
        {
          id: 'server-id__tool1',
          server_id: 'server-id',
          tool_name: 'tool1',
          title: 'Tool 1',
          description: 'First tool',
          input_schema: null,
          output_schema: null,
          enabled: 1,
          discovered_at: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockAll.mockReturnValue(mockRows as Record<string, unknown>[]);

      const result = registry.getServerTools('server-id');

      expect(result).toHaveLength(1);
      expect(result[0].toolName).toBe('tool1');
    });
  });

  describe('updateServer', () => {
    it('should update server name', () => {
      registry.updateServer('server-id', { name: 'new-name' });
      expect(mockRun).toHaveBeenCalled();
    });

    it('should update server with env and persist it as JSON', () => {
      const env = { API_KEY: 'secret123', DEBUG: 'true' };
      registry.updateServer('server-id', { env });
      
      // Verify run was called with the serialized env
      const runCall = mockRun.mock.calls[0];
      expect(runCall).toContain(JSON.stringify(env));
    });

    it('should write null when env is an empty object', () => {
      registry.updateServer('server-id', { env: {} });
      
      const runCall = mockRun.mock.calls[0];
      // Empty env should be persisted as null, not '{}'
      expect(runCall).toContain(null);
    });

    it('should write null when args is an empty array', () => {
      registry.updateServer('server-id', { args: [] });
      
      const runCall = mockRun.mock.calls[0];
      // Empty args should be persisted as null, not '[]'
      expect(runCall).toContain(null);
    });

    it('should update transport and clear irrelevant fields for stdio', () => {
      registry.updateServer('server-id', {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', 'server'],
        url: 'http://localhost:3000', // should be cleared for stdio
      });
      
      expect(mockRun).toHaveBeenCalled();
    });

    it('should update enabled flag', () => {
      registry.updateServer('server-id', { enabled: false });
      expect(mockRun).toHaveBeenCalled();
    });

    it('should do nothing when called with empty partial', () => {
      mockRun.mockClear();
      registry.updateServer('server-id', {});
      expect(mockRun).not.toHaveBeenCalled();
    });
  });

  describe('createProject', () => {
    it('should create a project and return an ID', () => {
      mockRun.mockReturnValue({ changes: 1 });

      const id = registry.createProject('test-project', 'A test project');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(36); // UUID format
      expect(mockRun).toHaveBeenCalled();
    });

    it('should reject duplicate project names', () => {
      // First call: check if name exists
      mockGet.mockReturnValueOnce({ id: 'existing-id', name: 'duplicate-project' });
      
      expect(() => registry.createProject('duplicate-project')).toThrow(
        "Project with name 'duplicate-project' already exists"
      );
    });

    it('should create project without description', () => {
      mockRun.mockReturnValue({ changes: 1 });

      const id = registry.createProject('simple-project');

      expect(id).toBeDefined();
      expect(mockRun).toHaveBeenCalled();
    });
  });
});
