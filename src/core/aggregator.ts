import type { ServerConfig, ToolConfig, ToolDefinition, ToolIndexEntry } from 'types/index.js';
import { registry } from './registry.js';

export class Aggregator {
  private toolIndex: Map<string, ToolIndexEntry> = new Map();

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
          description: `Tool '${originalName}' from server '${server.name}'`,
          inputSchema: {},
          outputSchema: {}
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
