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
  private transport: StdioServerTransport | null = null;

  constructor() {
    this.server = new McpServer({
      name: 'mcp-konduct',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    process.stdin.on('close', () => {
      this.shutdown().catch(console.error);
    });
  }

  async initialize(): Promise<void> {
    try {
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
    } catch (error) {
      console.error('[Router] Initialization error:', error);
    }
  }

  async start(): Promise<void> {
    await this.initialize();
    connectionPool.startCleanup();

    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
  }

  async refresh(): Promise<void> {
    await this.initialize();
  }

  async shutdown(): Promise<void> {
    try {
      connectionPool.stopCleanup();
      await connectionPool.disconnectAll();
      if (this.transport) {
        await this.transport.close();
      }
      await this.server.close();
    } catch (error) {
      console.error('[Router] Shutdown error:', error);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.toolDefinitions;
  }
}

export const router = new KonductRouter();
