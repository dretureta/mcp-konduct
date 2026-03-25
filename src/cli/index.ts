#!/usr/bin/env node

import { Command } from 'commander';
import { registry } from 'core/registry.js';
import { router } from 'core/router.js';
import { getDbPath, db } from 'config/db.js';
import { success, error, warn, info, json, table } from './format.js';

const program = new Command();

program
  .name('konduct')
  .description('MCP server proxy/aggregator')
  .version('1.0.0')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output');

const serverCmd = program.command('server').description('Manage MCP servers');

serverCmd
  .command('add')
  .description('Add a new MCP server')
  .requiredOption('-n, --name <name>', 'Server name')
  .requiredOption('-t, --transport <type>', 'Transport type (stdio|sse|streamable-http)')
  .option('-c, --command <cmd>', 'Command to run (for stdio)')
  .option('-a, --args <args...>', 'Command arguments')
  .option('-e, --env <env...>', 'Environment variables (KEY=VALUE)')
  .option('-u, --url <url>', 'Server URL (for sse/http)')
  .action(async (opts) => {
    try {
      const env: Record<string, string> = {};
      if (opts.env) {
        for (const pair of opts.env) {
          const [key, value] = pair.split('=');
          if (key && value) env[key] = value;
        }
      }

      const id = registry.addServer({
        name: opts.name,
        transport: opts.transport,
        command: opts.command,
        args: opts.args,
        env: Object.keys(env).length > 0 ? env : undefined,
        url: opts.url,
        enabled: true
      });

      success(`Server '${opts.name}' added with ID: ${id}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

serverCmd
  .command('remove')
  .description('Remove an MCP server')
  .argument('<id>', 'Server ID')
  .action((id) => {
    try {
      const removed = registry.removeServer(id);
      if (removed) {
        success(`Server removed: ${id}`);
      } else {
        error(`Server not found: ${id}`);
        process.exit(1);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

serverCmd
  .command('list')
  .description('List all MCP servers')
  .option('-p, --project <id>', 'Filter by project')
  .action((opts) => {
    try {
      const servers = registry.listServers(opts.project);
      if (servers.length === 0) {
        info('No servers configured');
        return;
      }

      const headers = ['ID', 'Name', 'Transport', 'Status', 'Updated'];
      const rows = servers.map(s => [
        s.id.substring(0, 8),
        s.name,
        s.transport,
        s.enabled ? 'enabled' : 'disabled',
        s.updatedAt ? s.updatedAt.substring(0, 10) : '-'
      ]);

      console.log(table(headers, rows));
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

serverCmd
  .command('enable')
  .description('Enable a server')
  .argument('<id>', 'Server ID')
  .action((id) => {
    try {
      registry.enableServer(id);
      success(`Server enabled: ${id}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

serverCmd
  .command('disable')
  .description('Disable a server')
  .argument('<id>', 'Server ID')
  .action((id) => {
    try {
      registry.disableServer(id);
      success(`Server disabled: ${id}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

serverCmd
  .command('discover')
  .description('Discover tools from a server')
  .argument('<id>', 'Server ID')
  .action(async (id) => {
    try {
      info('Discovering tools...');
      const tools = await registry.discoverTools(id);
      success(`Discovered ${tools.length} tools:`);
      for (const tool of tools) {
        console.log(`  - ${tool}`);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

const toolCmd = program.command('tool').description('Manage tools');

toolCmd
  .command('list')
  .description('List all tools')
  .option('-s, --server <id>', 'Filter by server')
  .action((opts) => {
    try {
      let tools;
      if (opts.server) {
        tools = registry.getServerTools(opts.server);
      } else {
        tools = registry.listAllTools();
      }

      if (tools.length === 0) {
        info('No tools discovered');
        return;
      }

      const headers = ['ID', 'Server', 'Tool', 'Status'];
      const rows = tools.map(t => [
        t.id.substring(0, 12),
        t.serverId.substring(0, 8),
        t.toolName,
        t.enabled ? 'enabled' : 'disabled'
      ]);

      console.log(table(headers, rows));
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

toolCmd
  .command('enable')
  .description('Enable a tool')
  .argument('<id>', 'Tool ID')
  .action((id) => {
    try {
      registry.enableTool(id);
      success(`Tool enabled: ${id}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

toolCmd
  .command('disable')
  .description('Disable a tool')
  .argument('<id>', 'Tool ID')
  .action((id) => {
    try {
      registry.disableTool(id);
      success(`Tool disabled: ${id}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

const projectCmd = program.command('project').description('Manage projects');

projectCmd
  .command('create')
  .description('Create a new project')
  .requiredOption('-n, --name <name>', 'Project name')
  .option('-d, --description <desc>', 'Project description')
  .action((opts) => {
    try {
      const id = registry.createProject(opts.name, opts.description);
      success(`Project '${opts.name}' created with ID: ${id}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

projectCmd
  .command('list')
  .description('List all projects')
  .action(() => {
    try {
      const projects = registry.listProjects();
      if (projects.length === 0) {
        info('No projects created');
        return;
      }

      const headers = ['ID', 'Name', 'Description'];
      const rows = projects.map(p => [
        p.id.substring(0, 8),
        p.name,
        p.description || '-'
      ]);

      console.log(table(headers, rows));
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

projectCmd
  .command('add-server')
  .description('Add a server to a project')
  .argument('<projectId>', 'Project ID')
  .argument('<serverId>', 'Server ID')
  .action((projectId, serverId) => {
    try {
      registry.addServerToProject(projectId, serverId);
      success(`Server added to project`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

projectCmd
  .command('remove-server')
  .description('Remove a server from a project')
  .argument('<projectId>', 'Project ID')
  .argument('<serverId>', 'Server ID')
  .action((projectId, serverId) => {
    try {
      registry.removeServerFromProject(projectId, serverId);
      success(`Server removed from project`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('connect')
  .description('Generate client configuration')
  .argument('<client>', 'Client type (claude|cursor|cline|custom)')
  .option('-p, --project <id>', 'Project ID')
  .action((client, opts) => {
    try {
      const configPath = process.execPath;
      const scriptPath = process.argv[1];

      const mcpConfig = {
        command: configPath,
        args: [scriptPath, 'start'],
        env: {}
      };

      switch (client.toLowerCase()) {
        case 'claude':
          info('Claude Desktop configuration:');
          console.log(JSON.stringify({ mcpServers: { 'mcp-konduct': mcpConfig } }, null, 2));
          info('Add this to your claude_desktop_config.json');
          break;
        case 'cursor':
          info('Cursor configuration:');
          console.log(JSON.stringify({ mcpServers: { 'mcp-konduct': mcpConfig } }, null, 2));
          info('Add this to .cursor/mcp.json');
          break;
        case 'cline':
          info('Cline configuration:');
          console.log(JSON.stringify({ mcpServers: { 'mcp-konduct': mcpConfig } }, null, 2));
          info('Add this to your cline_mcp_settings.json');
          break;
        case 'custom':
        default:
          info('Generic MCP configuration:');
          console.log(JSON.stringify(mcpConfig, null, 2));
          break;
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the MCP router or web dashboard')
  .option('-t, --transport <type>', 'Transport type (stdio|http)', 'stdio')
  .option('-p, --port <port>', 'Port for HTTP transport', '3847')
  .option('-d, --dashboard', 'Start web dashboard')
  .action(async (opts) => {
    try {
      if (opts.dashboard || opts.transport === 'http') {
        const port = parseInt(opts.port, 10);
        info(`Starting web dashboard on http://localhost:${port}...`);
        
        const { default: webApp } = await import('../web/index.js');
        const { serve } = await import('@hono/node-server');
        serve({
          fetch: webApp.fetch,
          port
        });
        info(`Dashboard running at http://localhost:${port}`);
      } else {
        info('Starting MCP router...');
        await router.start();
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show router status')
  .action(() => {
    try {
      const servers = registry.listServers();
      const enabledServers = servers.filter(s => s.enabled);
      const tools = registry.listAllTools();
      const enabledTools = tools.filter(t => t.enabled);

      if (program.opts().json) {
        json({
          servers: servers.length,
          enabledServers: enabledServers.length,
          tools: tools.length,
          enabledTools: enabledTools.length,
          dbPath: getDbPath()
        });
      } else {
        info(`Servers: ${enabledServers.length}/${servers.length} enabled`);
        info(`Tools: ${enabledTools.length}/${tools.length} enabled`);
        info(`Database: ${getDbPath()}`);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Configuration commands')
  .command('db-path', { isDefault: false })
  .description('Show database path')
  .action(() => {
    console.log(getDbPath());
  });

program
  .command('logs')
  .description('Show request logs')
  .option('-s, --server <id>', 'Filter by server')
  .option('-l, --last <n>', 'Last N logs', '50')
  .option('-e, --errors', 'Show only errors')
  .action((opts) => {
    try {
      const limit = parseInt(opts.last, 10);
      let query = 'SELECT * FROM request_logs';
      const params: unknown[] = [];

      const conditions: string[] = [];
      if (opts.server) {
        conditions.push('server_id = ?');
        params.push(opts.server);
      }
      if (opts.errors) {
        conditions.push('success = 0');
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

      if (rows.length === 0) {
        info('No logs found');
        return;
      }

      const headers = ['Timestamp', 'Server', 'Tool', 'Duration', 'Status'];
      const logRows = rows.map(r => [
        (r.timestamp as string).substring(0, 19),
        (r.server_id as string)?.substring(0, 8) || '-',
        (r.tool_name as string) || '-',
        (r.duration_ms as number)?.toString() || '-',
        (r.success as number) === 1 ? 'success' : 'error'
      ]);

      console.log(table(headers, logRows));
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

process.on('SIGINT', async () => {
  await router.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await router.shutdown();
  process.exit(0);
});

program.parse();
