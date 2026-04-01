# mcp-konduct

[![CI](https://img.shields.io/github/actions/workflow/status/dretureta/mcp-konduct/ci?branch=main&label=CI&style=flat-square)](https://github.com/dretureta/mcp-konduct/actions)
[![npm Version](https://img.shields.io/npm/v/mcp-konduct?style=flat-square)](https://www.npmjs.com/package/mcp-konduct)
[![Node Version](https://img.shields.io/badge/node-%E2%89%A520-%23D89336?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-%23D89336?style=flat-square)](LICENSE)

**A local control plane for managing multiple MCP servers behind one clean interface.**

`mcp-konduct` lets you register downstream MCP servers, discover and control their tools, group them by project, inspect activity in a web dashboard, and expose everything through a single upstream MCP entrypoint.

## Why use it

When you work with several MCP servers, things get messy quickly:

- client config gets duplicated
- tool names can collide
- some tools should only be visible in certain contexts
- debugging requests across projects is painful

`mcp-konduct` gives you one place to manage that.

## What it can do

- Register MCP servers over **stdio**, **SSE**, or **streamable-http**
- Discover tools and enable or disable them individually
- Expose all configured servers as a single upstream MCP server
- Scope tool access by **project**
- Track request logs with project/session context
- Import and export configuration backups
- Manage everything from a **CLI** or the built-in **web dashboard**

> [!NOTE]
> Recent hardening work added stricter validation, safer secret handling in API responses and exports, transactional import behavior, and stronger backup identity preservation for tools.

## Installation

### From npm

```bash
npm install -g mcp-konduct
```

You can then use either command:

```bash
konduct doctor
# or
mcp-konduct doctor
```

### From source

```bash
git clone https://github.com/dretureta/mcp-konduct.git
cd mcp-konduct
npm install
npm run build
npm link --force
```

## Quick start

### 1. Add a server

```bash
konduct server add \
  --name filesystem \
  --transport stdio \
  --command npx \
  --args -y @modelcontextprotocol/server-filesystem /tmp
```

### 2. Discover its tools

```bash
konduct server list
konduct server discover <server-id>
konduct tool list
```

### 3. Start the upstream MCP server

```bash
konduct start
```

Your MCP client can now connect to `konduct` instead of connecting to each downstream server separately.

## Common workflows

### Run with project scoping

```bash
konduct project create --name Dev --description "Development tools"
konduct project add-server <project-id> <server-id>
konduct start --project Dev
```

Only servers linked to that project will be exposed upstream.

### Launch the dashboard

```bash
konduct start --dashboard --port 3847
```

Then open:

```text
http://localhost:3847
```

The dashboard includes:

- server registration and editing
- tool discovery and toggling
- project management
- scoped project views
- request log inspection
- backup import/export

### Generate client config

```bash
konduct connect opencode
konduct connect cursor --project Dev
konduct connect claude --install
```

## Key commands

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

### Runtime and diagnostics

```bash
konduct start
konduct start --project <project-name>
konduct start --dashboard --port 3847
konduct status
konduct logs --last 50
konduct doctor
```

## Import and export

You can export your current configuration and import it later.

Current behavior:

- backup payloads preserve **tool UUIDs** for better identity continuity
- exports are safe by default for secrets
- merge imports are transactional

If you are scripting against the API, treat backups as configuration plus stable tool identity, not just a loose snapshot.

## Database location

`mcp-konduct` stores state in SQLite.

- **Linux:** `~/.config/mcp-konduct/konduct.db`
- **macOS:** `~/Library/Application Support/mcp-konduct/konduct.db`
- **Windows:** `%APPDATA%/mcp-konduct/konduct.db`

To reset local state, remove the database file and start again.

## Development

### Install

```bash
npm install
```

### Run tests

```bash
npm test
```

### Build

```bash
npm run build
```

### Run commands in development

```bash
npm run dev -- server list
npm run dev -- start --dashboard
```

### Useful project files

- `src/cli/index.ts` — CLI entrypoint
- `src/core/registry.ts` — registry and persistence logic
- `src/core/settings-backup-service.ts` — backup/import logic
- `src/web/index.ts` — web composition root
- `src/web/servers.ts` / `projects.ts` / `tools.ts` / `logs.ts` / `stats.ts` — route modules
- `AGENTS.md` — coding conventions and repo guidance

## Troubleshooting

### Tools are not showing up

Make sure you discovered them:

```bash
konduct server discover <server-id>
konduct tool list
```

### A project exposes the wrong servers

Check project membership:

```bash
konduct project list
konduct server list
```

Then re-add or remove the relevant servers from that project.

### A client cannot connect

Start with:

```bash
konduct doctor
```

Then verify the generated client config with:

```bash
konduct connect <client>
```
