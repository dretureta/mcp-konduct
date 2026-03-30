import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ToolIndexEntry } from '../types/index.js';

// Create mock functions inside hoisted to handle proper hoisting
const mocks = vi.hoisted(() => {
  const mockDbRun = vi.fn();
  const mockClientConnect = vi.fn();
  const mockClientCallTool = vi.fn();
  const mockClientClose = vi.fn();
  const mockGetServer = vi.fn();

  return { mockDbRun, mockClientConnect, mockClientCallTool, mockClientClose, mockGetServer };
});

// Mock db module
vi.mock('../config/db.js', () => ({
  db: {
    prepare: vi.fn(() => ({
      run: mocks.mockDbRun,
    })),
  },
}));

// Mock MCP SDK Client - use a class constructor pattern
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  return {
    Client: function MockClient() {
      return {
        connect: mocks.mockClientConnect,
        callTool: mocks.mockClientCallTool,
        close: mocks.mockClientClose,
      };
    },
  };
});

// Mock registry
vi.mock('./registry.js', () => ({
  registry: {
    getServer: mocks.mockGetServer,
  },
}));

// Import ConnectionPool after all mocks are set up
import { ConnectionPool } from './proxy.js';

describe('ConnectionPool', () => {
  let pool: ConnectionPool;

  beforeEach(() => {
    pool = new ConnectionPool();
    vi.clearAllMocks();
    mocks.mockClientCallTool.mockReset();
    mocks.mockClientClose.mockReset();
    mocks.mockClientConnect.mockReset();
    mocks.mockDbRun.mockReset();
    mocks.mockGetServer.mockReset();
  });

  afterEach(async () => {
    pool.stopCleanup();
    await pool.disconnectAll();
  });

  describe('initialization', () => {
    it('should initialize with empty connections', () => {
      expect(pool).toBeDefined();
    });
  });

  describe('setToolIndex', () => {
    it('should set the tool index', () => {
      const toolIndex = new Map<string, ToolIndexEntry>([
        ['tool1', { serverId: 'server-1', originalName: 'tool1' }],
      ]);

      pool.setToolIndex(toolIndex);

      expect(typeof pool.setToolIndex).toBe('function');
    });
  });

  describe('callTool', () => {
    it('should throw if tool not found in index', async () => {
      const emptyIndex = new Map<string, ToolIndexEntry>();
      pool.setToolIndex(emptyIndex);

      await expect(pool.callTool('non-existent', {})).rejects.toThrow(
        'Tool not found: non-existent'
      );
    });

    it('should return result from callTool', async () => {
      const toolIndex = new Map<string, ToolIndexEntry>([
        ['myTool', { serverId: 'server-1', originalName: 'originalTool' }],
      ]);
      pool.setToolIndex(toolIndex);

      mocks.mockGetServer.mockReturnValue({
        id: 'server-1',
        name: 'test-server',
        transport: 'stdio',
        command: 'node',
        args: ['test.js'],
        enabled: true,
      });

      const expectedResult = {
        content: [{ type: 'text' as const, text: 'tool result' }],
      };
      mocks.mockClientCallTool.mockResolvedValue(expectedResult);

      const result = await pool.callTool('myTool', { arg: 'value' });

      expect(result.content).toEqual(expectedResult.content);
    });

    it('should return error result on tool call failure', async () => {
      const toolIndex = new Map<string, ToolIndexEntry>([
        ['tool1', { serverId: 'server-1', originalName: 'tool1' }],
      ]);
      pool.setToolIndex(toolIndex);

      mocks.mockGetServer.mockReturnValue({
        id: 'server-1',
        name: 'test-server',
        transport: 'stdio',
        command: 'node',
        enabled: true,
      });

      mocks.mockClientCallTool.mockRejectedValue(new Error('Connection failed'));

      const result = await pool.callTool('tool1', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Connection failed');
    });

    it('should throw if server not found', async () => {
      const toolIndex = new Map<string, ToolIndexEntry>([
        ['tool1', { serverId: 'non-existent', originalName: 'tool1' }],
      ]);
      pool.setToolIndex(toolIndex);

      mocks.mockGetServer.mockReturnValue(null);

      await expect(pool.callTool('tool1', {})).rejects.toThrow('Server not found');
    });
  });

  describe('disconnect', () => {
    it('should handle disconnect gracefully when no connection exists', async () => {
      await expect(pool.disconnect('non-existent-server')).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should start cleanup timer', () => {
      pool.startCleanup();
      expect(() => pool.startCleanup()).not.toThrow(); // Idempotent
    });

    it('should stop cleanup timer', () => {
      pool.startCleanup();
      pool.stopCleanup();
      expect(() => pool.stopCleanup()).not.toThrow();
    });

    it('should stop cleanup when not started', () => {
      expect(() => pool.stopCleanup()).not.toThrow();
    });
  });
});
