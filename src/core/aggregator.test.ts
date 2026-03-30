import { describe, it, expect, beforeEach } from 'vitest';
import { Aggregator } from './aggregator.js';
import type { ServerConfig, ToolConfig } from '../types/index.js';

describe('Aggregator', () => {
  let aggregator: Aggregator;

  beforeEach(() => {
    aggregator = new Aggregator();
  });

  describe('aggregateTools', () => {
    it('should return empty array when no servers/tools', () => {
      const result = aggregator.aggregateTools([], []);

      expect(result).toEqual([]);
    });

    it('should return empty array when servers have no enabled tools', () => {
      const servers: ServerConfig[] = [
        {
          id: 'server-1',
          name: 'server-one',
          transport: 'stdio',
          enabled: true,
        },
      ];
      const tools: ToolConfig[] = [];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result).toEqual([]);
    });

    it('should handle server with no tools', () => {
      const servers: ServerConfig[] = [
        {
          id: 'server-1',
          name: 'server-one',
          transport: 'stdio',
          enabled: true,
        },
      ];
      const tools: ToolConfig[] = [];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result).toEqual([]);
    });

    it('should create unique tool names when same tool exists in multiple servers', () => {
      const servers: ServerConfig[] = [
        {
          id: 'server-1',
          name: 'server-one',
          transport: 'stdio',
          enabled: true,
        },
        {
          id: 'server-2',
          name: 'server-two',
          transport: 'stdio',
          enabled: true,
        },
      ];
      const tools: ToolConfig[] = [
        {
          id: 'server-1__duplicate',
          serverId: 'server-1',
          toolName: 'duplicate',
          enabled: true,
        },
        {
          id: 'server-2__duplicate',
          serverId: 'server-2',
          toolName: 'duplicate',
          enabled: true,
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('duplicate');
      expect(result[0].originalName).toBe('duplicate');
      expect(result[1].name).toBe('server-two__duplicate');
      expect(result[1].originalName).toBe('duplicate');
    });

    it('should handle multiple collisions with naming pattern', () => {
      const servers: ServerConfig[] = [
        {
          id: 'server-1',
          name: 'server-one',
          transport: 'stdio',
          enabled: true,
        },
        {
          id: 'server-2',
          name: 'server-two',
          transport: 'stdio',
          enabled: true,
        },
        {
          id: 'server-3',
          name: 'server-three',
          transport: 'stdio',
          enabled: true,
        },
      ];
      const tools: ToolConfig[] = [
        { id: 's1__tool', serverId: 'server-1', toolName: 'tool', enabled: true },
        { id: 's2__tool', serverId: 'server-2', toolName: 'tool', enabled: true },
        { id: 's3__tool', serverId: 'server-3', toolName: 'tool', enabled: true },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('tool');
      expect(result[1].name).toBe('server-two__tool');
      expect(result[2].name).toBe('server-three__tool');
    });

    it('should only include enabled tools', () => {
      const servers: ServerConfig[] = [
        {
          id: 'server-1',
          name: 'server-one',
          transport: 'stdio',
          enabled: true,
        },
      ];
      const tools: ToolConfig[] = [
        { id: 's1__enabled', serverId: 'server-1', toolName: 'enabled', enabled: true },
        { id: 's1__disabled', serverId: 'server-1', toolName: 'disabled', enabled: false },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('enabled');
    });
  });

  describe('buildInputSchema', () => {
    it('should handle basic types (string)', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('name');
    });

    it('should handle number type', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('count');
    });

    it('should handle boolean type', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              flag: { type: 'boolean' },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('flag');
    });

    it('should handle integer type', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              count: { type: 'integer' },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('count');
    });

    it('should handle array type', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              items: { type: 'array' },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('items');
    });

    it('should handle object type', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('data');
    });

    it('should handle enum types', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['pending', 'approved', 'rejected'],
              },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('status');
    });

    it('should handle anyOf types', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              value: {
                anyOf: [{ type: 'string' }, { type: 'number' }],
              },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('value');
    });

    it('should handle oneOf types', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              value: {
                oneOf: [{ type: 'string' }, { type: 'null' }],
              },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('value');
    });

    it('should handle nullable fields', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              optional: {
                type: 'string',
                nullable: true,
              },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('optional');
    });

    it('should handle type arrays like ["string", "null"]', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              value: {
                type: ['string', 'null'],
              },
            },
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('value');
    });

    it('should mark non-required fields as optional', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        {
          id: 's1__test',
          serverId: 's1',
          toolName: 'test',
          enabled: true,
          inputSchema: {
            type: 'object',
            properties: {
              requiredField: { type: 'string' },
              optionalField: { type: 'string' },
            },
            required: ['requiredField'],
          },
        },
      ];

      const result = aggregator.aggregateTools(servers, tools);

      expect(result[0].inputSchema).toHaveProperty('requiredField');
      expect(result[0].inputSchema).toHaveProperty('optionalField');
    });
  });

  describe('buildToolIndex', () => {
    it('should build tool index from servers and tools', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 'server-one', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        { id: 's1__tool1', serverId: 's1', toolName: 'tool1', enabled: true },
      ];

      const index = aggregator.buildToolIndex(servers, tools);

      expect(index.size).toBe(1);
      expect(index.has('tool1')).toBe(true);
    });
  });

  describe('getToolMapping', () => {
    it('should return current tool index mapping', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 's1', transport: 'stdio', enabled: true },
      ];
      const tools: ToolConfig[] = [
        { id: 's1__tool', serverId: 's1', toolName: 'tool', enabled: true },
      ];

      aggregator.aggregateTools(servers, tools);
      const mapping = aggregator.getToolMapping();

      expect(mapping.size).toBe(1);
      expect(mapping.get('tool')?.serverId).toBe('s1');
    });
  });
});
