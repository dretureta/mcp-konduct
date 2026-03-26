import type { ServerConfig, ToolConfig, ToolDefinition, ToolIndexEntry } from '../types/index.js';
import { registry } from './registry.js';
import { z } from 'zod';

export class Aggregator {
  private toolIndex: Map<string, ToolIndexEntry> = new Map();

  private buildInputSchema(schema?: object): Record<string, z.ZodTypeAny> {
    const safe = schema as {
      type?: string;
      properties?: Record<string, { type?: string; description?: string }>;
      required?: string[];
    } | undefined;

    const properties = safe?.properties;
    const required = new Set(safe?.required ?? []);

    if (!properties || typeof properties !== 'object') {
      return {};
    }

    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [key, descriptor] of Object.entries(properties)) {
      let schemaForKey: z.ZodTypeAny;
      switch (descriptor?.type) {
        case 'number':
          schemaForKey = z.number();
          break;
        case 'integer':
          schemaForKey = z.number().int();
          break;
        case 'boolean':
          schemaForKey = z.boolean();
          break;
        case 'array':
          schemaForKey = z.array(z.unknown());
          break;
        case 'object':
          schemaForKey = z.record(z.string(), z.unknown());
          break;
        case 'string':
        default:
          schemaForKey = z.string();
          break;
      }

      if (descriptor?.description) {
        schemaForKey = schemaForKey.describe(descriptor.description);
      }

      if (!required.has(key)) {
        schemaForKey = schemaForKey.optional();
      }

      shape[key] = schemaForKey;
    }

    return shape;
  }

  aggregateTools(servers: ServerConfig[], tools: ToolConfig[]): ToolDefinition[] {
    this.toolIndex.clear();
    const definitions: ToolDefinition[] = [];

    const toolsByServer = new Map<string, ToolConfig[]>();
    for (const tool of tools) {
      if (!toolsByServer.has(tool.serverId)) {
        toolsByServer.set(tool.serverId, []);
      }
      toolsByServer.get(tool.serverId)!.push(tool);
    }

    for (const server of servers) {
      const serverTools = toolsByServer.get(server.id) || [];
      const enabledTools = serverTools.filter(t => t.enabled);

      for (const tool of enabledTools) {
        const originalName = tool.toolName;
        let exposedName = originalName;
        let counter = 1;

        while (this.toolIndex.has(exposedName)) {
          exposedName = `${server.name}__${originalName}`;
          if (counter > 1) {
            exposedName = `${exposedName}_${counter}`;
          }
          counter++;
        }

        this.toolIndex.set(exposedName, {
          serverId: server.id,
          originalName
        });

        definitions.push({
          name: exposedName,
          originalName,
          serverId: server.id,
          description: tool.description || `Tool '${originalName}' from server '${server.name}'`,
          inputSchema: this.buildInputSchema(tool.inputSchema),
          outputSchema: tool.outputSchema || {}
        });
      }
    }

    return definitions;
  }

  buildToolIndex(servers: ServerConfig[], tools: ToolConfig[]): Map<string, ToolIndexEntry> {
    this.aggregateTools(servers, tools);
    return new Map(this.toolIndex);
  }

  getToolMapping(): Map<string, ToolIndexEntry> {
    return new Map(this.toolIndex);
  }
}

export const aggregator = new Aggregator();
