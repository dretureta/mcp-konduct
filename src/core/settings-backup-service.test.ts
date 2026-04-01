import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAll = vi.fn<() => Record<string, unknown>[]>(() => []);
const mockGet = vi.fn<() => Record<string, unknown> | undefined>();
const mockRun = vi.fn<() => { changes: number }>(() => ({ changes: 1 }));

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

import { analyzeImportImpact, buildBackupPayload } from './settings-backup-service.js';

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
});
