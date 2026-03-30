import type { ServerConfig, ToolConfig, ToolDefinition, ToolIndexEntry } from '../types/index.js';
import { registry } from './registry.js';
import { z } from 'zod';

export class Aggregator {
  private toolIndex: Map<string, ToolIndexEntry> = new Map();

  private buildInputSchema(schema?: object): Record<string, z.ZodTypeAny> {
    const safe = schema as {
      type?: string | string[];
      properties?: Record<string, {
        type?: string | string[];
        description?: string;
        enum?: unknown[];
        anyOf?: Array<{ type?: string }>;
        oneOf?: Array<{ type?: string }>;
        nullable?: boolean;
        items?: { type?: string };
        properties?: Record<string, unknown>;
      }>;
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

      // Handle enum
      if (descriptor?.enum && Array.isArray(descriptor.enum) && descriptor.enum.length > 0) {
        const allStrings = descriptor.enum.every(v => typeof v === 'string');
        if (allStrings) {
          schemaForKey = z.enum(descriptor.enum as [string, ...string[]]);
        } else {
          const literals = descriptor.enum.map(v => z.literal(v as string | number | boolean));
          schemaForKey = z.union(literals as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
        }
      }
      // Handle anyOf / oneOf — pick the first non-null type
      else if (descriptor?.anyOf || descriptor?.oneOf) {
        const variants = (descriptor.anyOf || descriptor.oneOf) as Array<{ type?: string }>;
        const nonNull = variants.filter(v => v.type && v.type !== 'null');
        schemaForKey = nonNull.length > 0
          ? this.resolveSimpleType(nonNull[0]?.type)
          : z.unknown();
      }
      // Handle type as array (e.g. ["string", "null"])
      else if (Array.isArray(descriptor?.type)) {
        const types = descriptor.type as string[];
        const nonNull = types.filter(t => t !== 'null');
        schemaForKey = this.resolveSimpleType(nonNull[0]);
        if (types.includes('null')) {
          schemaForKey = schemaForKey.nullable();
        }
      }
      // Standard single type
      else {
        schemaForKey = this.resolveSimpleType(descriptor?.type as string | undefined);
      }

      // Handle nullable flag
      if (descriptor?.nullable) {
        schemaForKey = schemaForKey.nullable();
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

  private resolveSimpleType(type?: string): z.ZodTypeAny {
    switch (type) {
      case 'number':
        return z.number();
      case 'integer':
        return z.number().int();
      case 'boolean':
        return z.boolean();
      case 'array':
        return z.array(z.unknown());
      case 'object':
        return z.record(z.string(), z.unknown());
      case 'null':
        return z.null();
      case 'string':
      default:
        return z.string();
    }
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
