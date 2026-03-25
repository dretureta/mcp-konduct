import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { registry } from './registry.js';
import { aggregator } from './aggregator.js';
import { connectionPool } from './proxy.js';
import type { ToolDefinition } from 'types/index.js';

export class KonductRouter {
  private server: McpServer;
  private toolDefinitions: ToolDefinition[] = [];

  constructor() {
    this.server = new McpServer({
      name: 'mcp-konduct',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
  }

  async initialize(): Promise<void> {
    const enabledServers = registry.listServers().filter(s => s.enabled);
    const allTools = registry.listAllTools();

    const tools = aggregator.aggregateTools(enabledServers, allTools);
    this.toolDefinitions = tools;

    const toolIndex = aggregator.getToolMapping();
    connectionPool.setToolIndex(toolIndex);

    for (const tool of tools) {
      this.server.registerTool(
        tool.name,
        {
          title: tool.name,
          description: tool.description || ''
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (params: any) => {
          try {
            const result = await connectionPool.callTool(tool.name, params);
            return result as any;
          } catch (error) {
            return { content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
          }
        }
      );
    }
  }

  async start(): Promise<void> {
    await this.initialize();
    connectionPool.startCleanup();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async refresh(): Promise<void> {
    await this.initialize();
  }

  async shutdown(): Promise<void> {
    connectionPool.stopCleanup();
    await connectionPool.disconnectAll();
    await this.server.close();
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.toolDefinitions;
  }
}

export const router = new KonductRouter();
