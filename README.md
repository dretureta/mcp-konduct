# mcp-konduct

MCP proxy/aggregator for running multiple downstream MCP servers behind one upstream MCP server.

`mcp-konduct` lets you:
- register MCP servers (`stdio`, `sse`, `streamable-http` metadata)
- discover and toggle tools per server
- expose a single MCP endpoint to clients (OpenCode, Cursor, Claude, etc.)
- inspect logs and health with built-in CLI commands

## Features

- Multi-server MCP registry backed by SQLite
- Tool discovery and enable/disable controls
- Name-collision handling via aggregation
- MCP stdio router for upstream clients
- Optional web dashboard mode
- Client config helpers (`connect`)
- Health checks via `doctor`

## Requirements

- Node.js 18+
- npm

## Install

### Local development

```bash
npm install
npm run build
```

### Global command (recommended)

```bash
# from project root
node dist/cli/index.js install
```

After that, use `konduct` directly:

```bash
konduct doctor
```

## Quick Start

1) Build project:

```bash
npm run build
```

2) Add a downstream MCP server (example: filesystem):

```bash
konduct server add \
  --name filesystem \
  --transport stdio \
  --command npx \
  --args -y @modelcontextprotocol/server-filesystem /tmp
```

3) Discover tools for that server:

```bash
konduct server list
konduct server discover <server-id>
konduct tool list
```

4) Start Konduct as MCP stdio server:

```bash
konduct start
```

## Common Commands

### Server management

```bash
konduct server add --name <name> --transport stdio --command <cmd> --args <args...>
konduct server list
konduct server discover <server-id>
konduct server enable <server-id>
konduct server disable <server-id>
konduct server remove <server-id>
```

### Tool management

```bash
konduct tool list
konduct tool list --server <server-id>
konduct tool enable <tool-id>
konduct tool disable <tool-id>
```

### Project management

```bash
konduct project create --name <name> [--description <text>]
konduct project list
konduct project add-server <project-id> <server-id>
konduct project remove-server <project-id> <server-id>
```

### Runtime / diagnostics

```bash
konduct start
konduct start --dashboard --port 3847
konduct status
konduct logs --last 50
konduct doctor
```

## Connect to Clients

Generate (or install) config snippets:

```bash
konduct connect opencode
konduct connect opencode --install

konduct connect cursor
konduct connect cursor --install

konduct connect claude
konduct connect claude --install
```

Notes:
- OpenCode config path: `~/.config/opencode/opencode.jsonc`
- Cursor config path: `~/.cursor/mcp.json`
- Claude path depends on OS and app install layout

## Web Dashboard

Run web mode:

```bash
konduct start --dashboard --port 3847
```

Open:

```text
http://localhost:3847
```

## Database

Konduct stores data in SQLite:
- Linux: `~/.config/mcp-konduct/konduct.db`
- Windows: `%APPDATA%/mcp-konduct/konduct.db`

## Add Existing OpenCode MCP Servers to Konduct

Map OpenCode `type: local` to Konduct `transport: stdio`.

Examples:

```bash
konduct server add --name chrome-devtools --transport stdio --command npx --args -y chrome-devtools-mcp@latest
konduct server add --name context7 --transport stdio --command npx --args -y @upstash/context7-mcp
konduct server add --name testsprite --transport stdio --command npx --args -y @testsprite/testsprite-mcp@latest --env API_KEY=your_key
```

Then discover tools for each server:

```bash
konduct server discover <server-id>
```

## Development

```bash
npm run dev -- --help
npm run build
npm test
```

## Troubleshooting

- If client says `MCP error -32000: Connection closed`, run:

```bash
konduct doctor
```

- Ensure your client config points to the built runtime (`dist/cli/index.js`) and not unresolved source imports.
- Rebuild after code changes:

```bash
npm run build
```
