import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAll = vi.fn<() => Record<string, unknown>[]>(() => []);
const mockGet = vi.fn<() => Record<string, unknown> | undefined>();
const mockRun = vi.fn<(...args: unknown[]) => { changes: number }>(() => ({ changes: 1 }));

vi.mock('../config/db.js', () => ({
  db: {
    prepare: vi.fn(() => ({
      all: mockAll,
      get: mockGet,
      run: mockRun,
    })),
    transaction: vi.fn((callback: () => unknown) => callback),
  },
}));

import { analyzeImportImpact, applyImportPayload, BackupPayloadSchema, buildBackupPayload } from './settings-backup-service.js';
import type { BackupPayload } from './settings-backup-service.js';

describe('settings-backup-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAll.mockReset();
    mockGet.mockReset();
    mockRun.mockReset();
    mockAll.mockReturnValue([]);
    mockGet.mockReturnValue(undefined);
    mockRun.mockReturnValue({ changes: 1 });
  });

  it('redacts malformed env values when exporting without sensitive mode', () => {
    mockAll
      .mockReturnValueOnce([
        {
          id: 'server-1',
          name: 'alpha',
          transport: 'stdio',
          command: 'node',
          args: null,
          env: 'API_KEY=secret',
          url: null,
          enabled: 1,
        },
      ])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);

    const payload = buildBackupPayload(false);

    expect(payload.data.servers[0].env).toBe('[REDACTED]');
  });

  it('preserves env values when exporting with sensitive mode enabled', () => {
    mockAll
      .mockReturnValueOnce([
        {
          id: 'server-1',
          name: 'alpha',
          transport: 'stdio',
          command: 'node',
          args: null,
          env: '{"API_KEY":"secret"}',
          url: null,
          enabled: 1,
        },
      ])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);

    const payload = buildBackupPayload(true);

    expect(payload.data.servers[0].env).toBe('{"API_KEY":"secret"}');
  });

  it('includes tools.uuid in exported backup payloads', () => {
    mockAll
      .mockReturnValueOnce([])
      .mockReturnValueOnce([
        {
          id: 'local-tool-id',
          uuid: '880e8400-e29b-41d4-a716-446655440003',
          server_id: 'server-1',
          tool_name: 'search',
          enabled: 1,
        },
      ])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);

    const payload = buildBackupPayload(true);

    expect(payload.data.tools[0].uuid).toBe('880e8400-e29b-41d4-a716-446655440003');
  });

  it('counts duplicate merge relations as skipped during dry-run analysis', () => {
    mockAll
      .mockReturnValueOnce([{ id: 'server-1' }])
      .mockReturnValueOnce([{ name: 'alpha' }])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ id: 'project-1' }])
      .mockReturnValueOnce([{ name: 'project-alpha' }])
      .mockReturnValueOnce([{ project_id: 'project-1', server_id: 'server-1' }]);

    const result = analyzeImportImpact({
      version: 'konduct-backup-v1',
      exportedAt: '2026-03-31T00:00:00.000Z',
      appVersion: '1.6.6',
      data: {
        servers: [],
        tools: [],
        projects: [],
        projectServers: [{ projectId: 'project-1', serverId: 'server-1' }],
      },
    }, 'merge');

    expect(result.summary.created).toBe(0);
    expect(result.summary.skipped).toBe(1);
  });

  // ============================================================
  // RED TESTS: Replace mode coverage
  // ============================================================

  describe('analyzeImportImpact replace mode', () => {
    it('calculates removed count from existing data and created count from payload', () => {
      // Mock current state: 3 servers, 5 tools, 2 projects, 4 relations
      mockGet
        .mockReturnValueOnce({ count: 3 }) // servers
        .mockReturnValueOnce({ count: 5 }) // tools
        .mockReturnValueOnce({ count: 2 }) // projects
        .mockReturnValueOnce({ count: 4 }); // relations

      // Payload: 2 servers, 4 tools, 1 project, 3 relations
      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'A', transport: 'stdio', enabled: 1 }, { id: 's2', name: 'B', transport: 'sse', enabled: 1 }],
          tools: [{ id: 't1', server_id: 's1', tool_name: 'foo', enabled: 1 }, { id: 't2', server_id: 's1', tool_name: 'bar', enabled: 1 }, { id: 't3', server_id: 's2', tool_name: 'baz', enabled: 1 }, { id: 't4', server_id: 's2', tool_name: 'qux', enabled: 1 }],
          projects: [{ id: 'p1', name: 'Proj1' }],
          projectServers: [{ projectId: 'p1', serverId: 's1' }, { projectId: 'p1', serverId: 's2' }, { projectId: 'p1', serverId: 's1' }], // duplicate
        },
      };

      const result = analyzeImportImpact(payload, 'replace');

      // removed = 3 + 5 + 2 + 4 = 14
      expect(result.summary.removed).toBe(14);
      // created = 2 + 4 + 1 + 3 = 10
      expect(result.summary.created).toBe(10);
      expect(result.messages).toContain('Replace mode will overwrite current configuration data.');
    });

    it('returns zero removed when database is empty', () => {
      mockGet.mockReturnValue({ count: 0 });

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: { servers: [], tools: [], projects: [], projectServers: [] },
      };

      const result = analyzeImportImpact(payload, 'replace');

      expect(result.summary.removed).toBe(0);
      expect(result.summary.created).toBe(0);
    });
  });

  describe('applyImportPayload replace mode', () => {
    it('deletes existing data before inserting new data', () => {
      // Test that summary.removed > 0 indicates existing data was deleted
      mockAll.mockReset();
      mockGet.mockReset();
      mockRun.mockReset();
      
      mockGet.mockReturnValue({ count: 5 }); // Simulate existing data
      mockAll.mockReturnValue([]);
      mockRun.mockReturnValue({ changes: 1 });

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [],
          projects: [],
          projectServers: [],
        },
      };

      const result = applyImportPayload(payload, 'replace');

      // Summary should indicate data was removed before insertion
      expect(result.summary.removed).toBeGreaterThan(0);
      expect(result.summary.created).toBeGreaterThan(0);
    });

    it('reports errors for tools with unknown server_id', () => {
      mockAll.mockReset();
      mockGet.mockReset();
      mockRun.mockReset();
      
      // applyImportReplace uses mockGet for COUNT queries
      mockGet.mockReturnValue({ count: 0 });
      mockAll.mockReturnValue([]);
      mockRun.mockReturnValue({ changes: 1 });

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [
            { id: 't1', server_id: 's1', tool_name: 'valid', enabled: 1 },
            { id: 't2', server_id: 'unknown-server', tool_name: 'invalid', enabled: 1 },
          ],
          projects: [],
          projectServers: [],
        },
      };

      const result = applyImportPayload(payload, 'replace');

      expect(result.summary.errors).toBe(1);
      expect(result.messages.some(m => m.includes("Tool skipped: server 'unknown-server' not found"))).toBe(true);
    });

    it('preserves tools.uuid during replace imports', () => {
      mockAll.mockReset();
      mockGet.mockReset();
      mockRun.mockReset();

      mockGet.mockReturnValue({ count: 0 });
      mockAll.mockReturnValue([]);

      let toolInsertArgs: unknown[] | undefined;
      mockRun.mockImplementation((...args: unknown[]) => {
        if (args.length === 6 && args[0] === 'local-tool-id') {
          toolInsertArgs = args;
        }
        return { changes: 1 };
      });

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [
            {
              id: 'local-tool-id',
              uuid: '880e8400-e29b-41d4-a716-446655440003',
              server_id: 's1',
              tool_name: 'search',
              enabled: 1,
            },
          ],
          projects: [],
          projectServers: [],
        },
      };

      applyImportPayload(payload, 'replace');

      expect(toolInsertArgs).toBeDefined();
      expect(toolInsertArgs?.[1]).toBe('880e8400-e29b-41d4-a716-446655440003');
    });
  });

  // ============================================================
  // RED TESTS: Merge UUID migration branches
  // ============================================================

  describe('merge tool UUID resolution', () => {
    it('matches tool by UUID when tool.id is a valid UUID and exists in existingToolsById', () => {
      // Mock: tool exists with BOTH id AND uuid matching
      mockAll
        .mockReturnValueOnce([]) // servers
        .mockReturnValueOnce([]) // projects
        .mockReturnValueOnce([{ id: '550e8400-e29b-41d4-a716-446655440000', uuid: '550e8400-e29b-41d4-a716-446655440000' }]) // SELECT id, uuid FROM tools
        .mockReturnValueOnce([]); // tools for update check
      mockRun.mockReturnValue({ changes: 1 });

      // Payload: tool with same UUID AND same id should be updated
      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [
            { id: '550e8400-e29b-41d4-a716-446655440000', server_id: 's1', tool_name: 'discovered_tool', enabled: 1 },
          ],
          projects: [],
          projectServers: [],
        },
      };

      const result = applyImportPayload(payload, 'merge');

      // Should be updated (matched by both id and uuid)
      expect(result.summary.updated).toBe(1);
    });

    it('generates new UUID for tool that does not exist in database', () => {
      // Setup: empty database
      mockAll.mockReturnValue([]);
      mockRun.mockReturnValue({ changes: 1 });

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [
            { id: 'some-random-id', server_id: 's1', tool_name: 'new_tool', enabled: 1 },
          ],
          projects: [],
          projectServers: [],
        },
      };

      // Capture the insert call arguments
      let capturedInsertArgs: unknown[] = [];
      mockRun.mockImplementation((...args: unknown[]) => {
        capturedInsertArgs = args as unknown[];
        return { changes: 1 };
      });

      applyImportPayload(payload, 'merge');

      // The second insert call should have a generated UUID as second param (uuid column)
      // Format: INSERT INTO tools (id, uuid, server_id, ...)
      const uuidArg = capturedInsertArgs[1];
      expect(uuidArg).toBeDefined();
      expect(typeof uuidArg).toBe('string');
      // UUID format: 8-4-4-4-12 hex digits
      expect(uuidArg).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('creates tool when UUID matches but id differs (legacy migration scenario)', () => {
      // Mock: existing tool has UUID 'abc' stored as uuid column, but id is 'old-local-id'
      mockAll
        .mockReturnValueOnce([{ id: 's1', name: 'Test' }]) // servers
        .mockReturnValueOnce([]) // projects
        .mockReturnValueOnce([{ id: 'old-local-id', uuid: '660e8400-e29b-41d4-a716-446655440001' }]) // SELECT id, uuid FROM tools
        .mockReturnValueOnce([]); // tools for update check
      mockRun.mockReturnValue({ changes: 1 });

      // Payload: tool has id that matches existing uuid
      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [
            { id: '660e8400-e29b-41d4-a716-446655440001', server_id: 's1', tool_name: 'discovered_tool', enabled: 1 },
          ],
          projects: [],
          projectServers: [],
        },
      };

      mockRun.mockImplementation(() => ({ changes: 1 }));

      const result = applyImportPayload(payload, 'merge');

      const toolUpdateCall = mockRun.mock.calls.find((args) =>
        args.length === 4 && args[1] === 'discovered_tool' && args[3] === 'old-local-id'
      );

      expect(result.summary.created).toBe(0);
      expect(result.summary.updated).toBe(2); // existing server + UUID-matched tool
      expect(toolUpdateCall).toBeDefined();
    });
  });

  // ============================================================
  // RED TESTS: Error/skipped paths
  // ============================================================

  describe('merge error handling', () => {
    it('reports errors for project-server relations with unknown project', () => {
      mockAll.mockReturnValue([]);
      mockRun.mockReturnValue({ changes: 1 });

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [],
          projects: [{ id: 'p1', name: 'Project' }],
          projectServers: [{ projectId: 'unknown-project', serverId: 's1' }],
        },
      };

      const result = applyImportPayload(payload, 'merge');

      expect(result.summary.errors).toBe(1);
      expect(result.messages.some(m => m.includes("Relation skipped: project 'unknown-project'"))).toBe(true);
    });

    it('reports errors for project-server relations with unknown server', () => {
      // Setup: project exists in DB, but relation references unknown server
      mockAll
        .mockReturnValueOnce([]) // servers (empty DB)
        .mockReturnValueOnce([]) // projects (empty DB)
        .mockReturnValueOnce([]) // tools
        .mockReturnValueOnce([{ id: 'p1' }]) // projects (for projectExistsById)
        .mockReturnValueOnce([{ name: 'Project' }]) // project names
        .mockReturnValueOnce([]) // relations
        .mockReturnValueOnce([]); // tools for update check
      mockRun.mockReturnValue({ changes: 1 });

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [],
          projects: [{ id: 'p1', name: 'Project' }],
          projectServers: [{ projectId: 'p1', serverId: 'unknown-server' }],
        },
      };

      const result = applyImportPayload(payload, 'merge');

      expect(result.summary.errors).toBe(1);
      expect(result.messages.some(m => m.includes("server 'unknown-server'"))).toBe(true);
    });

    it('skips duplicate project-server relations without error', () => {
      // Setup: both relations in payload are duplicates of existing DB relation
      mockAll
        .mockReturnValueOnce([]) // servers
        .mockReturnValueOnce([]) // projects
        .mockReturnValueOnce([]) // tools
        .mockReturnValueOnce([]) // tools (2nd call)
        .mockReturnValueOnce([{ project_id: 'p1', server_id: 's1' }]); // relations (already exists!)
      
      // First INSERTs return changes=1 to populate exists sets
      let insertCallCount = 0;
      mockRun.mockImplementation(() => {
        insertCallCount++;
        if (insertCallCount <= 2) return { changes: 1 };
        return { changes: 0 };
      });

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [],
          projects: [{ id: 'p1', name: 'Project' }],
          projectServers: [
            { projectId: 'p1', serverId: 's1' },
            { projectId: 'p1', serverId: 's1' }, // duplicate
          ],
        },
      };

      const result = applyImportPayload(payload, 'merge');

      // Both relations are duplicates (exist in DB), so both are skipped
      expect(result.summary.errors).toBe(0);
      expect(result.summary.skipped).toBe(2);
    });
  });

  describe('replace error handling', () => {
    it('reports errors for relations with unknown project', () => {
      mockAll.mockReset();
      mockGet.mockReset();
      mockRun.mockReset();
      
      mockGet.mockReturnValue({ count: 0 });
      mockAll.mockReturnValue([]);
      mockRun.mockReturnValue({ changes: 1 });

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [],
          projects: [],
          projectServers: [{ projectId: 'unknown-project', serverId: 's1' }],
        },
      };

      const result = applyImportPayload(payload, 'replace');

      expect(result.summary.errors).toBe(1);
      expect(result.messages.some(m => m.includes("Relation skipped: project 'unknown-project'"))).toBe(true);
    });

    it('reports errors for relations with unknown server', () => {
      mockAll.mockReset();
      mockGet.mockReset();
      mockRun.mockReset();
      
      mockGet.mockReturnValue({ count: 0 });
      mockAll.mockReturnValue([]);
      mockRun.mockReturnValue({ changes: 1 });

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [],
          projects: [{ id: 'p1', name: 'Project' }],
          projectServers: [{ projectId: 'p1', serverId: 'unknown-server' }],
        },
      };

      const result = applyImportPayload(payload, 'replace');

      expect(result.summary.errors).toBe(1);
      // Error message format: "Relation skipped: project 'p1' or server 'unknown-server' not found."
      expect(result.messages.some(m => m.includes("server 'unknown-server'"))).toBe(true);
    });
  });

  // ============================================================
  // RED TESTS: Validation paths
  // ============================================================

  describe('payload validation', () => {
    it('throws on invalid version string', () => {
      expect(() => BackupPayloadSchema.parse({
        version: 'invalid-version',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { servers: [], tools: [], projects: [], projectServers: [] },
      })).toThrow();
    });

    it('throws on missing required data fields', () => {
      expect(() => BackupPayloadSchema.parse({
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { servers: [] }, // missing tools, projects, projectServers
      })).toThrow();
    });

    it('throws on invalid transport type', () => {
      expect(() => BackupPayloadSchema.parse({
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.0.0',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'websocket' as any, enabled: 1 }],
          tools: [],
          projects: [],
          projectServers: [],
        },
      })).toThrow();
    });
  });

  // ============================================================
  // RED TESTS: analyzeImportImpact merge edge cases
  // ============================================================

  describe('analyzeImportImpact merge edge cases', () => {
    it('counts tools with UUID match as updated', () => {
      // Existing tools with UUID
      mockAll
        .mockReturnValueOnce([]) // servers by id
        .mockReturnValueOnce([]) // servers by name
        .mockReturnValueOnce([{ id: 'local-id', uuid: '770e8400-e29b-41d4-a716-446655440002' }]) // tools
        .mockReturnValueOnce([]) // projects by id
        .mockReturnValueOnce([]) // projects by name
        .mockReturnValueOnce([]); // relations

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [],
          tools: [
            { id: '770e8400-e29b-41d4-a716-446655440002', server_id: 's1', tool_name: 'foo', enabled: 1 },
          ],
          projects: [],
          projectServers: [],
        },
      };

      const result = analyzeImportImpact(payload, 'merge');

      // UUID match should count as updated
      expect(result.summary.updated).toBe(1);
      expect(result.summary.created).toBe(0);
    });

    it('reports error when relation references non-existent project during analysis', () => {
      mockAll
        .mockReturnValueOnce([]) // servers by id
        .mockReturnValueOnce([]) // servers by name
        .mockReturnValueOnce([]) // tools
        .mockReturnValueOnce([]) // projects by id
        .mockReturnValueOnce([]) // projects by name
        .mockReturnValueOnce([]); // relations

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [],
          projects: [],
          projectServers: [{ projectId: 'ghost-project', serverId: 's1' }],
        },
      };

      const result = analyzeImportImpact(payload, 'merge');

      expect(result.summary.errors).toBe(1);
      expect(result.messages.some(m => m.includes("Relation skipped: project 'ghost-project'"))).toBe(true);
    });

    it('skips relation that exists in database during analysis', () => {
      mockAll
        .mockReturnValueOnce([{ id: 's1' }]) // servers by id
        .mockReturnValueOnce([{ name: 'Test' }]) // servers by name
        .mockReturnValueOnce([]) // tools
        .mockReturnValueOnce([{ id: 'p1' }]) // projects by id
        .mockReturnValueOnce([{ name: 'Project' }]) // projects by name
        .mockReturnValueOnce([{ project_id: 'p1', server_id: 's1' }]); // relations (already exists)

      const payload: BackupPayload = {
        version: 'konduct-backup-v1',
        exportedAt: '2026-03-31T00:00:00.000Z',
        appVersion: '1.6.6',
        data: {
          servers: [{ id: 's1', name: 'Test', transport: 'stdio', enabled: 1 }],
          tools: [],
          projects: [{ id: 'p1', name: 'Project' }],
          projectServers: [{ projectId: 'p1', serverId: 's1' }],
        },
      };

      const result = analyzeImportImpact(payload, 'merge');

      expect(result.summary.skipped).toBe(1);
      expect(result.summary.created).toBe(0);
    });
  });
});
