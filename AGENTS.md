# AGENTS.md - Coding Guidelines for mcp-konduct

This file contains essential information for AI agents working on the mcp-konduct codebase.

## Quick Commands

### Development
```bash
npm install              # Install dependencies
npm run build           # Compile TypeScript (tsc)
npm run dev <args>      # Run with tsx (hot reload): npm run dev server list
npm run start <args>    # Run compiled: npm start start -d -p 3000
npm run test            # Run all tests with vitest
npm run test -- --ui    # Run tests with UI
npm run test -- file.ts # Run single test file
npm run test -- -t "test name" # Run test by name
```

### Build & Install
```bash
npm run build           # Compiles src/ → dist/
npm run start -- install # Global npm link installation
```

### Testing
- Run single test: `npm run test -- src/path/to/file.test.ts`
- Watch mode: `npm run test -- --watch`
- Coverage: `npm run test -- --coverage`
- UI mode for debugging: `npm run test -- --ui`

## Project Structure

```
src/
├── cli/              # CLI command handlers (Commander.js)
│   ├── index.ts      # Main CLI setup & commands (640+ lines)
│   └── format.ts     # Output formatting (success, error, warn, info, table)
├── core/             # Core business logic
│   ├── registry.ts   # ServerRegistry class (CRUD for servers)
│   ├── router.ts     # MCP routing & aggregation logic
│   ├── proxy.ts      # Proxy/transport handling
│   └── aggregator.ts # Tool aggregation across servers
├── config/           # Configuration & database
│   ├── db.ts         # SQLite connection & initialization
│   └── schema.ts     # Database schema definitions
├── transports/       # MCP transport implementations
├── types/            # TypeScript interfaces (ServerConfig, ToolConfig, etc.)
└── web/              # Web dashboard (Hono + HTMX)
    └── index.ts      # Single-file dashboard (850+ lines, Editorial Refined design)
```

## Code Style Guidelines

### Imports & Module Resolution

**Import Order:** Standard libs → External packages → Internal modules (using path aliases)
```typescript
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Command } from 'commander';
import { db } from '../config/db.js';
import type { ServerConfig } from '../types/index.js';
```

**Path Aliases:** Use configured paths from `tsconfig.json`:
- `config/*` → `src/config/*`
- `core/*` → `src/core/*`
- `cli/*` → `src/cli/*`
- `types/*` → `src/types/*`
- `transports/*` → `src/transports/*`

**Always use `.js` extensions for ESM:** `import { ... } from '../file.js'`

### Formatting & Naming

**Variables & Functions:** camelCase
```typescript
const serverRegistry = new ServerRegistry();
function addNewServer(config: ServerConfig): string { }
```

**Types & Interfaces:** PascalCase
```typescript
interface ServerConfig { }
type TransportType = 'stdio' | 'sse' | 'streamable-http';
class ServerRegistry { }
```

**Constants:** UPPER_SNAKE_CASE (only for true constants)
```typescript
const CREATE_TABLES_SQL = `...`;
const DEFAULT_PORT = 3000;
```

**Private Methods:** prefix with `#` (modern TypeScript)
```typescript
class Server {
  #mapServerRow(row: Record<string, unknown>): ServerConfig { }
}
```

**Line Length:** Keep to ~100-120 characters (natural breaking points)

### Error Handling

**Pattern 1: Try-Catch with Type Guard**
```typescript
try {
  const result = riskyOperation();
  return result;
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  error(message);
  process.exit(1);
}
```

**Pattern 2: Throw Early, Validate Input**
```typescript
if (!id) throw new Error('Server ID is required');
if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid server ID format');

const server = this.getServer(id);
if (!server) throw new Error(`Server not found: ${id}`);
```

**Pattern 3: Return null for Not Found**
```typescript
function getServer(id: string): ServerConfig | null {
  const row = db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
  return row ? this.mapServerRow(row) : null;
}
```

**CLI Output:** Use format.ts helpers (no raw console.log)
```typescript
import { success, error, warn, info, json, table } from './format.js';

success('Operation completed');
error('Something went wrong');
warn('Use with caution');
info('For your information');
json(data);
console.log(table(headers, rows));
```

### Type Safety

**Strict TypeScript:** `strict: true` in tsconfig.json
- All parameters must have explicit types
- No implicit `any`
- All return types should be explicit
- Use `unknown` when unsure, then narrow with type guards

**Example:**
```typescript
// ✓ Good
function process(data: Record<string, unknown>): ServerConfig[] {
  if (!Array.isArray(data.servers)) {
    throw new Error('Expected servers array');
  }
  return data.servers.map(s => mapServer(s));
}

// ✗ Bad
function process(data: any): any {
  return data.servers.map((s: any) => mapServer(s));
}
```

**Schema Validation:** Use Zod for runtime validation
```typescript
import { z } from 'zod';

const ServerConfigSchema = z.object({
  name: z.string().min(1),
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
});

const config = ServerConfigSchema.parse(input);
```

### Database Operations

**Prepared Statements:** Always use parameterized queries (never concatenate SQL)
```typescript
// ✓ Good
db.prepare('SELECT * FROM servers WHERE id = ?').get(id);

// ✗ Bad
db.prepare(`SELECT * FROM servers WHERE id = '${id}'`).get();
```

**Type Casting:** Cast query results to known types
```typescript
const rows = db.prepare('SELECT * FROM servers').all() as Record<string, unknown>[];
const row = db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
```

**JSON Serialization:** Store complex types as JSON strings
```typescript
db.prepare('INSERT INTO servers (args) VALUES (?)').run(
  config.args ? JSON.stringify(config.args) : null
);
```

### Web/Dashboard Code (src/web/index.ts)

**Design System:** Editorial Refined aesthetic
- Colors: Primary #7c3aed (Violet), Accent #06b6d4 (Cyan), Dark #0d0d0f
- Typography: Georgia (titles), Segoe UI (body)
- Spacing: 0.5rem → 3rem scale (2rem for main sections)
- Animations: 0.3s cubic-bezier(0.4, 0, 0.2, 1) for smooth transitions

**HTML Templates:** Use Hono's c.html() template literals
```typescript
return c.html(`
  <form class="form" method="POST" action="/api/servers/${id}/update">
    <div class="form-group">
      <label for="name">Server Name</label>
      <input type="text" id="name" name="name" value="${server.name}" required>
    </div>
  </form>
`);
```

**CSS:** Inline in <style> tag (single-file dashboard)
- Use CSS variables for colors: `var(--primary)`, `var(--text)`
- Prefer flexbox/grid over float
- Mobile-first with media queries: `@media (max-width: 768px)`

**Form Handling:** Use Hono's c.req.parseBody() or form data parsing
```typescript
const body = await c.req.parseFormData();
const name = body.get('name') as string;
```

## Testing

**Framework:** Vitest (same as Jest API, faster)

**File Pattern:** `*.test.ts` or `*.spec.ts` in same directory as source

**Example Test:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ServerRegistry } from './registry.ts';

describe('ServerRegistry', () => {
  let registry: ServerRegistry;

  beforeEach(() => {
    registry = new ServerRegistry();
  });

  it('should add a new server', () => {
    const id = registry.addServer({
      name: 'test',
      transport: 'stdio',
      enabled: true,
    });
    expect(id).toBeDefined();
  });
});
```

**Run Single Test:** `npm run test -- src/core/registry.test.ts`

**Run Tests by Pattern:** `npm run test -- -t "should add"`

## Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `commander` | 14.x | CLI command parsing |
| `hono` | 4.x | Web framework |
| `better-sqlite3` | 12.x | SQLite driver (sync API) |
| `zod` | 4.x | Schema validation |
| `chalk` | 5.x | Colored output |
| `pino` | 10.x | Logger |
| `@modelcontextprotocol/sdk` | 1.28.x | MCP protocol |

## Common Tasks

### Add a New CLI Command
1. Add function to `src/cli/index.ts`
2. Use Commander.js pattern: `program.command('name').action(handler)`
3. Import registry/router as needed
4. Use format.ts for output
5. Handle errors with try-catch + `error()` helper + `process.exit(1)`

### Add a Database Table
1. Define SQL in `src/config/schema.ts` in `CREATE_TABLES_SQL`
2. Add TypeScript interface in `src/types/index.ts`
3. Create repository methods in appropriate `core/*.ts` class
4. Use prepared statements for all queries

### Add Web Route
1. Import `app` from Hono in `src/web/index.ts`
2. Add route: `app.get('/path', (c) => { ... })`
3. Return `c.html(...)` for HTML, `c.json(...)` for JSON
4. Use inline CSS variables and Editorial Refined design
5. Include responsive mobile design

### Fix Database Issues
1. Delete `~/.config/mcp-konduct/konduct.db` to reset
2. Restart: `npm run dev start -d` will recreate schema
3. Check schema in `src/config/schema.ts`

## Linting & Type Checking

**TypeScript:** No ESLint configured (strict TypeScript mode enforces style)

**Compile Check:** `npm run build` (catches all type errors)

**Format Check:** Manual (keep to guidelines above)

## Debug Tips

**Enable Verbose Logging:**
```bash
npm run dev -- --verbose
```

**Database Inspection:**
```bash
sqlite3 ~/.config/mcp-konduct/konduct.db ".schema"
sqlite3 ~/.config/mcp-konduct/konduct.db ".mode column" "SELECT * FROM servers;"
```

**Test Debugging:**
```bash
npm run test -- --inspect-brk  # Use Chrome DevTools
npm run test -- --ui           # Open Web UI
```

**MCP Logs:**
```bash
npm run dev -- logs --verbose
```

## Before Submitting Code

- [ ] `npm run build` compiles without errors
- [ ] No `any` types (use `unknown` + type guard instead)
- [ ] Error handling with try-catch or proper validation
- [ ] Database queries use prepared statements (no concatenation)
- [ ] Functions have explicit return types
- [ ] Error messages are user-friendly (use format.ts helpers)
- [ ] Web changes follow Editorial Refined design system
- [ ] Tests pass: `npm run test`
- [ ] TypeScript strict mode satisfied

---

**Last Updated:** 2026-03-26 | **Node:** 18+ | **Type:** ESM
