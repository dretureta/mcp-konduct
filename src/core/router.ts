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
          description: tool.description || '',
          inputSchema: tool.inputSchema as z.ZodType<object>,
          outputSchema: tool.outputSchema as z.ZodType<object> | undefined
        },
        async (params): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
          const args = params as Record<string, unknown>;
          const result = await connectionPool.callTool(tool.name, args);
          return result as { content: Array<{ type: 'text'; text: string }> };
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
