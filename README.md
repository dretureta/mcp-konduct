# mcp-konduct

**MCP proxy/aggregator for running multiple downstream MCP servers behind one upstream MCP server.**

Konduct lets you orchestrate multiple Model Context Protocol (MCP) servers through a single unified interface. Register servers, discover their tools, manage them individually or group them by project, and expose everything to MCP clients like OpenCode, Cursor, and Claude.

## What It Does

- **Multi-server registry** — Register and manage multiple MCP servers (stdio, SSE, streamable-http)
- **Tool discovery & control** — Discover tools per server, enable/disable individually or globally
- **Unified MCP endpoint** — Expose all servers as a single MCP stdio interface to upstream clients
- **Project scoping** — Isolate server access by project name for multi-environment setups
- **Built-in dashboard** — Optional web UI for management and inspection
- **CLI tools** — Full command-line interface for server, tool, and project management
- **Health diagnostics** — Built-in `doctor` command for troubleshooting

## Features

- Multi-server MCP registry backed by SQLite
- Tool discovery and enable/disable controls
- Name-collision handling via aggregation
- MCP stdio router for upstream clients
- Project-scoped MCP mode (`konduct start --project <name>`)
- Optional web dashboard mode (`--dashboard`)
- Client config helpers (`konduct connect`)
- Health checks via `konduct doctor`
- Persistent storage with cross-platform support

## Requirements

- **Node.js** 18 or higher
- **npm** (comes with Node.js)

## Installation

### Quick Setup (Global)

```bash
npm install
npm run build
node dist/cli/index.js install
```

Then use `konduct` from anywhere:

```bash
konduct doctor
```

### Local Development

```bash
npm install
npm run build
```

Run commands with:

```bash
npm run start -- <command>
# or
npm run dev -- <command>
```

## Quick Start

### 1. Add a Server

Register a downstream MCP server (example: filesystem):

```bash
konduct server add \
  --name filesystem \
  --transport stdio \
  --command npx \
  --args -y @modelcontextprotocol/server-filesystem /tmp
```

### 2. Discover Tools

List available servers and their tools:

```bash
konduct server list
konduct server discover <server-id>
konduct tool list
```

### 3. Start Konduct

Run as MCP stdio server to expose tools upstream:

```bash
konduct start
```

Your client can now connect and use all discovered tools.

## Core Commands

### Server Management

```bash
konduct server add --name <name> --transport stdio --command <cmd> --args <args...>
konduct server list
konduct server discover <server-id>
konduct server enable <server-id>
konduct server disable <server-id>
konduct server remove <server-id>
```

### Tool Management

```bash
konduct tool list
konduct tool list --server <server-id>
konduct tool enable <tool-id>
konduct tool disable <tool-id>
```

### Project Management

```bash
konduct project create --name <name> [--description <text>]
konduct project list
konduct project add-server <project-id> <server-id>
konduct project remove-server <project-id> <server-id>
```

### Runtime & Diagnostics

```bash
konduct start                                 # Start as MCP stdio server
konduct start --project <project-name>       # Start scoped to project
konduct start --dashboard --port 3847        # Web dashboard mode
konduct status                               # Check runtime status
konduct logs --last 50                       # View recent logs
konduct doctor                               # Health diagnostics
```

## Project-Scoped MCP Access

Isolate tool exposure by project. Use this when you want different clients to see different tool sets.

### Setup

1. Create a project and add servers:

```bash
konduct project create --name Dev_Env
konduct project add-server <project-id> <server-id>
```

2. Start Konduct scoped to that project:

```bash
konduct start --project Dev_Env
```

### Behavior

- If the project doesn't exist, Konduct exits with an error
- Only servers linked to the project are considered
- Only tools from those servers are exposed to clients

## Connecting to Clients

Generate client configuration snippets for OpenCode, Cursor, Claude, or VSCode:

```bash
# View config (don't install)
konduct connect opencode
konduct connect cursor --project Dev_Env
konduct connect claude

# Install to client config automatically
konduct connect opencode --install
konduct connect cursor --install
konduct connect vscode --install
```

When `--project` is provided, the generated config includes `start --project <name>`.

### Config Paths

- **OpenCode:** `~/.config/opencode/opencode.jsonc`
- **Cursor:** `~/.cursor/mcp.json`
- **Claude:** Platform-dependent (app install location)

## Web Dashboard

Launch the optional web dashboard for visual management:

```bash
konduct start --dashboard --port 3847
```

Open in browser:

```
http://localhost:3847
```

The dashboard provides:
- Server registration and discovery UI
- Tool enable/disable controls
- Project management interface
- Real-time status and logs

## Database

Konduct stores all data in SQLite:

- **Linux:** `~/.config/mcp-konduct/konduct.db`
- **macOS:** `~/Library/Application Support/mcp-konduct/konduct.db`
- **Windows:** `%APPDATA%/mcp-konduct/konduct.db`

To reset the database, delete the file and restart Konduct. It will recreate the schema automatically.

## Examples

### Add OpenCode MCP Servers

Map common OpenCode server types to Konduct:

```bash
konduct server add --name chrome-devtools \
  --transport stdio --command npx \
  --args -y chrome-devtools-mcp@latest

konduct server add --name context7 \
  --transport stdio --command npx \
  --args -y @upstash/context7-mcp

konduct server add --name testsprite \
  --transport stdio --command npx \
  --args -y @testsprite/testsprite-mcp@latest --env API_KEY=your_key
```

Then discover tools:

```bash
konduct server discover <server-id>
```

### Multi-Project Setup

```bash
# Project 1: Development environment
konduct project create --name Dev --description "Development tools"
konduct project add-server <dev-project-id> <chrome-server-id>
konduct project add-server <dev-project-id> <filesystem-server-id>

# Project 2: Production environment (read-only)
konduct project create --name Prod --description "Production tools"
konduct project add-server <prod-project-id> <filesystem-server-id>

# Start scoped to project
konduct start --project Dev
# In another terminal:
konduct start --project Prod
```

## Development

### Build

```bash
npm run build
```

### Testing

```bash
npm run test
npm run test -- --watch
npm run test -- --ui
npm run test -- src/path/to/file.test.ts
```

### Development Mode

```bash
npm run dev -- --help
npm run dev -- server list
npm run dev -- start
```

See [AGENTS.md](./AGENTS.md) for detailed development guidelines, code style, and architecture.

## Troubleshooting

### Client Connection Issues

If your client reports `MCP error -32000: Connection closed`:

```bash
konduct doctor
```

This runs diagnostics on server health, database connectivity, and config.

### Ensure Correct Runtime Path

Make sure your client config points to the compiled runtime:

- **Correct:** `~/.npm/_npx/XXX/lib/node_modules/mcp-konduct/dist/cli/index.js`
- **Incorrect:** `~/project/src/cli/index.ts` (uncompiled source)

### Rebuild After Changes

If you modify the source code:

```bash
npm run build
```

The CLI automatically uses `dist/` directory.

### Database Reset

Delete the database to start fresh:

```bash
rm ~/.config/mcp-konduct/konduct.db
konduct doctor  # Recreates schema
```

## Architecture

Konduct is built with:

- **Core:** TypeScript with strict type checking
- **CLI:** Commander.js for command parsing
- **Database:** SQLite with better-sqlite3 (sync API)
- **Web:** Hono + HTMX with Editorial Refined design
- **Validation:** Zod for runtime schema validation
- **Logging:** Pino for structured logs

See [AGENTS.md](./AGENTS.md) for full architecture details and coding standards.

## License

MIT
