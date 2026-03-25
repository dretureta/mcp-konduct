# AGENTS.md — mcp-konduct Development Guide

> Agent instructions for mcp-konduct: an MCP server proxy/aggregator that manages multiple downstream MCP servers.

## Project Overview

- **Stack:** TypeScript + Node.js, `@modelcontextprotocol/sdk`, SQLite (`better-sqlite3`), CLI with `commander`
- **Target:** ES2022, Node16 modules, strict mode
- **Database:** SQLite via better-sqlite3 (portable between Linux/Windows)

---

## Build / Lint / Test Commands

### Development
```bash
npm run dev                    # Run CLI with tsx (no build required)
npm run dev -- --help          # Verify CLI works
```

### Build
```bash
npm run build                  # Compile TypeScript with tsc
npm run start                  # Run compiled CLI from dist/
```

### Testing
```bash
npm test                       # Run all tests with vitest
npm test --                    # Run in watch mode
npm test -- --run              # Single run (no watch)
npm test -- src/config/db.test.ts    # Run single test file
npm test -- -t "test name"     # Run single test by name
```

### Project Scripts Summary
| Script | Purpose |
|--------|---------|
| `npm run dev` | Development with tsx (no build) |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled CLI |
| `npm test` | Run vitest tests |

---

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode:** Always enabled in tsconfig.json
- **Target:** ES2022
- **Module:** Node16
- **No implicit any:** Never use `any`; use `unknown` when type is uncertain

### Imports
```typescript
// Absolute imports from src/ (configured in tsconfig)
import { ServerRegistry } from 'core/registry';
import { db } from 'config/db';

// External packages
import { McpServer } from '@modelcontextprotocol/sdk';
import chalk from 'chalk';
```

### Naming Conventions
- **Files:** kebab-case (`server-registry.ts`, `connection-pool.ts`)
- **Classes:** PascalCase (`class ServerRegistry`, `class KonductRouter`)
- **Interfaces:** PascalCase with optional "I" prefix discouraged (`interface ServerConfig`)
- **Functions:** camelCase (`discoverTools`, `aggregateTools`)
- **Constants:** UPPER_SNAKE_CASE for compile-time constants, camelCase for others
- **Enums:** PascalCase for enum and values (`enum TransportType { Stdio, Sse }`)

### Types
```typescript
// Prefer interfaces for object shapes
interface ServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'streamable-http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled: boolean;
}

// Use type for unions/intersections
type Transport = 'stdio' | 'sse' | 'streamable-http';

// Zod for runtime validation (required by MCP SDK)
import { z } from 'zod';
const ServerConfigSchema = z.object({ ... });
```

### Error Handling
```typescript
// Custom error classes for domain errors
export class ServerNotFoundError extends Error {
  constructor(serverId: string) {
    super(`Server not found: ${serverId}`);
    this.name = 'ServerNotFoundError';
  }
}

// Always handle async errors with try/catch in async functions
async function callTool(name: string, args: object): Promise<ToolResult> {
  try {
    return await connection.callTool(name, args);
  } catch (error) {
    if (error instanceof TimeoutError) {
      // Handle timeout specifically
      throw new ToolCallError('Timeout calling tool', error);
    }
    throw error; // Re-throw unexpected errors
  }
}
```

### Database (SQLite/better-sqlite3)
```typescript
// Always use prepared statements (no string concatenation for queries)
const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
const server = stmt.get(id) as ServerConfig | undefined;

// Use transactions for multi-step operations
const insertServer = db.transaction((config: ServerConfig) => {
  db.prepare('INSERT INTO servers (...)').run(...);
  discoverTools(config.id);
});
```

### CLI Output
```typescript
// Use chalk for colored output
import chalk from 'chalk';

console.log(chalk.green('✓') + ' Server added successfully');
console.log(chalk.red('✗') + ' Failed: ' + error.message);
console.log(chalk.yellow('⚠') + ' Warning message');

// Support JSON output mode
if (options.json) {
  console.log(JSON.stringify(result, null, 2));
}
```

### Logging
```typescript
// Use pino for structured logging
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty' }
    : undefined
});

// Log structured data
logger.info({ serverId, toolName, durationMs }, 'Tool call completed');
```

---

## Project Structure

```
src/
├── cli/
│   ├── index.ts       # CLI entry point (commander)
│   └── format.ts      # Output formatting helpers
├── config/
│   ├── db.ts          # SQLite connection & migrations
│   └── schema.ts      # Table definitions
├── core/
│   ├── router.ts      # MCP upstream server
│   ├── registry.ts    # Server registry & discovery
│   ├── proxy.ts       # Tool call forwarding
│   └── aggregator.ts  # Tool aggregation & collision handling
├── transports/
│   ├── stdio.ts       # Stdio transport for downstream servers
│   └── http.ts       # SSE/Streamable HTTP transport
└── types/
    └── index.ts       # Shared type definitions
```

---

## Important Notes for Agents

1. **No existing tests yet** — Tests should be added using vitest (see Phase 6 in planning doc)
2. **Database path:** Use `~/.config/mcp-konduct/konduct.db` (Linux) or `%APPDATA%/mcp-konduct/konduct.db` (Windows)
3. **Tool collision handling:** Prefix with server name (`filesystem__read_file`)
4. **MCP SDK:** Uses Zod v4 internally for validation
5. **Always verify checkpoints** before moving to the next phase in the planning doc
