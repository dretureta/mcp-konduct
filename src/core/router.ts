import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { registry } from './registry.js';
import { aggregator } from './aggregator.js';
import { connectionPool } from './proxy.js';
import type { ToolDefinition } from '../types/index.js';

export class KonductRouter {
  private server: McpServer;
  private toolDefinitions: ToolDefinition[] = [];
  private transport: StdioServerTransport | null = null;
  private projectFilterName: string | null = null;

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
      let enabledServers = registry.listServers().filter(s => s.enabled);
      let allTools = registry.listAllTools();

      if (this.projectFilterName) {
        const projectServerIds = new Set(
          registry.getProjectServers(this.projectFilterName).map((server) => server.id)
        );
        enabledServers = enabledServers.filter((server) => projectServerIds.has(server.id));
        allTools = allTools.filter((tool) => projectServerIds.has(tool.serverId));
      }

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
            inputSchema: tool.inputSchema as Record<string, import('zod').ZodTypeAny>
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
      throw error;
    }
  }

  async start(projectFilterName?: string | null): Promise<void> {
    this.projectFilterName = projectFilterName ?? null;
    await this.initialize();
    connectionPool.startCleanup();

    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
  }

  async refresh(): Promise<void> {
    await this.initialize();
  }

  setProjectFilter(projectFilterName: string | null): void {
    this.projectFilterName = projectFilterName;
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
