# mcp-konduct — Planning de Implementación para Agent CLI

> **Objetivo:** Construir mcp-konduct — un servidor MCP que actúa como proxy/agregador de múltiples servidores MCP downstream, gestionable desde CLI, compatible con Linux (Kubuntu) y Windows.
>
> **Stack decidido:** TypeScript + Node.js, `@modelcontextprotocol/sdk`, SQLite (`better-sqlite3`), CLI con `commander`, Web UI opcional (fase posterior).
>
> **Formato:** Cada fase es una tarea autocontenida que un agente CLI (Claude Code, Aider, Codex) puede ejecutar secuencialmente. Los checkpoints son verificables.

---

## FASE 0 — Scaffolding del Proyecto

### Tarea 0.1: Inicializar monorepo
```
Crear el proyecto en ~/DevZone/MCPs/mcp-konduct/ con la siguiente estructura:

mcp-konduct/
├── src/
│   ├── cli/              # Comandos CLI (entry point)
│   │   └── index.ts      # CLI principal con commander
│   ├── core/             # Lógica de negocio del router
│   │   ├── router.ts     # Servidor MCP upstream (lo que ven los clientes)
│   │   ├── registry.ts   # Registro de servidores downstream
│   │   ├── proxy.ts      # Forwarding de tool calls
│   │   └── aggregator.ts # Merge de tools/resources/prompts
│   ├── config/
│   │   ├── db.ts         # SQLite setup y migraciones
│   │   └── schema.ts     # Esquema de tablas
│   ├── transports/
│   │   ├── stdio.ts      # Gestión de procesos stdio downstream
│   │   └── http.ts       # Conexión a servidores SSE/Streamable HTTP
│   └── types/
│       └── index.ts      # Tipos compartidos
├── package.json
├── tsconfig.json
└── README.md

Usar TypeScript strict mode.
Target: ES2022, module: Node16.
```

### Tarea 0.2: Instalar dependencias
```bash
npm init -y
npm install @modelcontextprotocol/sdk zod better-sqlite3 commander chalk
npm install -D typescript @types/node @types/better-sqlite3 tsx
```

**Decisiones técnicas:**
- `@modelcontextprotocol/sdk` — SDK oficial v2 (usa Zod v4 internamente). Provee McpServer (upstream) y Client (downstream).
- `better-sqlite3` — Síncrono, sin async overhead para config reads. Un solo archivo `.db`, portable entre Linux y Windows.
- `commander` — CLI framework. Alternativa: `yargs`. Commander es más limpio para subcommands.
- `chalk` — Colores en terminal. Opcional pero mejora UX del CLI.
- `tsx` — Para desarrollo sin build step (Node.js type stripping nativo desde v22.18+, pero tsx es más estable cross-version).

### Tarea 0.3: Configurar tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### Tarea 0.4: Configurar package.json scripts
```json
{
  "type": "module",
  "bin": {
    "mcp-konduct": "./dist/cli/index.js",
    "konduct": "./dist/cli/index.js"
  },
  "scripts": {
    "dev": "tsx src/cli/index.ts",
    "build": "tsc",
    "start": "node dist/cli/index.js"
  }
}
```

**Checkpoint 0:** `npm run dev -- --help` muestra la ayuda del CLI sin errores.

---

## FASE 1 — Base de Datos y Configuración

### Tarea 1.1: Esquema SQLite

Crear `src/config/schema.ts` con las siguientes tablas:

```sql
-- Servidores MCP registrados
CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,           -- UUID o slug único
  name TEXT NOT NULL,            -- Nombre human-readable
  transport TEXT NOT NULL,       -- 'stdio' | 'sse' | 'streamable-http'
  command TEXT,                  -- Para stdio: comando a ejecutar (ej: "npx -y @some/mcp-server")
  args TEXT,                     -- JSON array de argumentos
  env TEXT,                      -- JSON object de env vars adicionales
  url TEXT,                      -- Para SSE/HTTP: URL del servidor remoto
  enabled INTEGER DEFAULT 1,    -- 1 = activo, 0 = deshabilitado
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tools individuales con toggle
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,           -- server_id + "__" + tool_name
  server_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  discovered_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

-- Proyectos (agrupaciones de servidores)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Relación proyecto <-> servidor
CREATE TABLE IF NOT EXISTS project_servers (
  project_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  PRIMARY KEY (project_id, server_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

-- Logs de requests (para analytics)
CREATE TABLE IF NOT EXISTS request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT (datetime('now')),
  server_id TEXT,
  tool_name TEXT,
  duration_ms INTEGER,
  success INTEGER,
  error_message TEXT
);
```

### Tarea 1.2: Implementar db.ts

```
Crear src/config/db.ts que:
1. Determina la ruta del archivo DB:
   - Linux: ~/.config/mcp-konduct/konduct.db
   - Windows: %APPDATA%/mcp-konduct/konduct.db
   - Usar os.platform() y path.join()
2. Crea el directorio si no existe (fs.mkdirSync recursive)
3. Abre la conexión con better-sqlite3
4. Ejecuta las migraciones (CREATE TABLE IF NOT EXISTS)
5. Exporta una instancia singleton del db
6. Habilita WAL mode: db.pragma('journal_mode = WAL')
```

**Checkpoint 1:** Ejecutar un script de prueba que importe `db.ts`, inserte un servidor de prueba, y lo lea de vuelta. El archivo `.db` debe existir en la ruta correcta del OS.

---

## FASE 2 — Registry: Gestión de Servidores Downstream

### Tarea 2.1: Implementar registry.ts

```
Crear src/core/registry.ts con la clase ServerRegistry:

Métodos:
- addServer(config: ServerConfig): string
  → Inserta en DB, retorna el id generado
  → Valida que no exista duplicado por nombre
  → Para stdio: valida que el command exista en PATH (which/where)

- removeServer(id: string): boolean
  → Elimina de DB (cascade borra tools y project_servers)

- listServers(projectId?: string): ServerConfig[]
  → Lista todos o filtrados por proyecto
  → Incluye conteo de tools habilitadas/totales

- enableServer(id: string): void
- disableServer(id: string): void

- getServer(id: string): ServerConfig | null

- updateServer(id: string, partial: Partial<ServerConfig>): void

Tipo ServerConfig:
{
  id: string
  name: string
  transport: 'stdio' | 'sse' | 'streamable-http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  enabled: boolean
}
```

### Tarea 2.2: Implementar discovery de tools

```
Crear la función discoverTools(serverId: string) en registry.ts:

1. Conectarse al servidor MCP downstream usando el SDK Client
2. Llamar a client.listTools()
3. Para cada tool encontrada:
   - Insertar en tabla tools si no existe (INSERT OR IGNORE)
   - Si ya existe, no tocar el estado enabled (el usuario pudo haberla toggleado)
4. Eliminar tools de la DB que ya no existan en el servidor (limpieza)
5. Retornar la lista actualizada

Para la conexión downstream:
- stdio: usar StdioClientTransport del SDK, spawneando el proceso
- SSE/HTTP: usar SSEClientTransport o StreamableHTTPClientTransport del SDK
```

**Checkpoint 2:** `npm run dev -- server add --name "filesystem" --transport stdio --command "npx" --args "-y,@modelcontextprotocol/server-filesystem,/tmp"` registra el servidor. `npm run dev -- server list` lo muestra. `npm run dev -- server discover filesystem` lista las tools del servidor.

---

## FASE 3 — Core: El Router MCP

### Tarea 3.1: Implementar aggregator.ts

```
Crear src/core/aggregator.ts:

Función aggregateTools(registry: ServerRegistry): ToolDefinition[]
1. Para cada servidor habilitado en la DB:
   - Leer sus tools habilitadas
2. Construir la lista unificada de tools
3. Manejar colisiones de nombres:
   - Si dos servidores exponen una tool con el mismo nombre,
     prefijar con el nombre del servidor: "filesystem__read_file"
   - Guardar el mapeo original para el routing
4. Retornar el array de ToolDefinition compatible con el SDK

Función buildToolIndex(): Map<string, { serverId: string, originalName: string }>
- Mapa de nombre_expuesto → { servidor, nombre_original }
- Usado por el proxy para routear
```

### Tarea 3.2: Implementar proxy.ts

```
Crear src/core/proxy.ts:

Clase ConnectionPool:
- Mantiene conexiones activas a servidores downstream
- Lazy connection: solo conecta cuando se necesita la primera tool call
- Reconexión automática si el proceso stdio muere
- Timeout configurable (default 30s por tool call)
- Cleanup: desconecta servidores que llevan X minutos sin uso

Método callTool(toolName: string, args: object): Promise<ToolResult>
1. Buscar en el toolIndex a qué servidor pertenece
2. Obtener o crear la conexión al servidor downstream
3. Llamar client.callTool({ name: originalName, arguments: args })
4. Loggear en request_logs (duración, éxito/error)
5. Retornar resultado al caller

Manejo de errores:
- Si el servidor downstream no responde en 30s → timeout error
- Si el proceso stdio crashea → reconectar una vez, si falla de nuevo → error al cliente
- Si el servidor SSE desconecta → reintentar conexión
```

### Tarea 3.3: Implementar router.ts — El servidor MCP principal

```
Crear src/core/router.ts:

Clase KonductRouter:
- Instancia McpServer del SDK con nombre "mcp-konduct"
- Registra tools dinámicamente basándose en aggregateTools()
- Cada tool registrada es un proxy que llama a proxy.callTool()

Flujo de inicialización:
1. Leer servidores habilitados de la DB
2. Ejecutar discovery de tools para cada uno (en paralelo)
3. Agregar tools (con manejo de colisiones)
4. Registrar cada tool en el McpServer:
   server.tool(toolName, schema, async (args) => {
     return await connectionPool.callTool(toolName, args);
   });
5. Conectar al transporte (stdio por defecto para uso con Claude/Cursor)

Capacidades a exponer:
- tools (principal)
- resources (fase posterior — pass-through de resources de servidores downstream)
- prompts (fase posterior — idem)

Hot-reload:
- Método refresh() que re-descubre tools y actualiza el McpServer
- Watchea cambios en la DB (polling cada 5s o trigger manual desde CLI)
```

**Checkpoint 3:** Ejecutar el router en modo stdio, configurar Claude Desktop para conectarse a él, verificar que las tools de los servidores downstream aparezcan y funcionen a través del router.

---

## FASE 4 — CLI Completo

### Tarea 4.1: Implementar los comandos CLI

```
Crear src/cli/index.ts usando commander:

konduct server add
  --name <nombre>
  --transport <stdio|sse|streamable-http>
  --command <cmd>          (para stdio)
  --args <arg1,arg2,...>   (para stdio)
  --env <KEY=VAL,...>      (para stdio)
  --url <url>              (para sse/http)
  → Registra servidor en DB

konduct server remove <id>
  → Elimina servidor (pide confirmación)

konduct server list
  → Tabla con: id | nombre | transporte | estado | tools activas/total
  → Usar chalk para colores (verde=enabled, rojo=disabled)

konduct server enable <id>
konduct server disable <id>

konduct server discover <id>
  → Conecta al servidor, descubre tools, muestra resultado

konduct tool list [--server <id>]
  → Lista tools con su estado enabled/disabled

konduct tool enable <tool_id>
konduct tool disable <tool_id>

konduct project create --name <nombre>
konduct project list
konduct project add-server <project_id> <server_id>
konduct project remove-server <project_id> <server_id>

konduct start
  --transport <stdio|http>  (default: stdio)
  --port <puerto>           (para http, default: 3847)
  --project <id>            (opcional: solo servidores de este proyecto)
  → Arranca el router MCP

konduct logs
  --server <id>             (filtrar por servidor)
  --last <N>                (últimos N registros, default: 50)
  --errors                  (solo errores)
  → Muestra logs de request_logs

konduct status
  → Muestra resumen: servidores activos, tools totales, conexiones vivas

konduct config
  --db-path                 (muestra ruta de la DB)
  --export <file.json>      (exporta config completa)
  --import <file.json>      (importa config)
```

### Tarea 4.2: Output formatting

```
Crear src/cli/format.ts con helpers de formateo:

- table(headers: string[], rows: string[][]): string
  → Tabla ASCII alineada (sin dependencia externa, calcular anchos)
  → Alternativa: usar el paquete 'cli-table3' si se prefiere

- success(msg: string): void → chalk.green("✓ " + msg)
- error(msg: string): void → chalk.red("✗ " + msg)
- warn(msg: string): void → chalk.yellow("⚠ " + msg)
- info(msg: string): void → chalk.blue("ℹ " + msg)

- json(data: any): void → JSON.stringify con indent 2
  → Soportar flag --json global para output parseble por máquinas
```

**Checkpoint 4:** Flujo completo desde CLI:
1. `konduct server add --name fs --transport stdio --command npx --args "-y,@modelcontextprotocol/server-filesystem,/tmp"`
2. `konduct server discover fs`
3. `konduct tool list --server fs`
4. `konduct tool disable fs__write_file`
5. `konduct start` → conectar desde Claude Desktop → verificar que write_file NO aparece pero read_file SÍ.

---

## FASE 5 — Integración con Clientes (Claude, Cursor, etc.)

### Tarea 5.1: Generador de config para clientes

```
Crear comando: konduct connect <client>

Clientes soportados:
- claude → genera/actualiza claude_desktop_config.json
- cursor → genera/actualiza .cursor/mcp.json
- cline → genera/actualiza cline_mcp_settings.json
- custom → muestra la config JSON genérica

Para cada cliente:
1. Detectar la ruta del archivo de config del cliente en el OS actual
2. Leer config existente (si la hay)
3. Agregar/actualizar la entrada de mcp-konduct:
   {
     "mcp-konduct": {
       "command": "node",
       "args": ["/ruta/absoluta/a/dist/cli/index.js", "start"],
       "env": {}
     }
   }
4. Escribir el archivo actualizado
5. Mostrar instrucciones post-setup

Variante con proyecto:
  konduct connect claude --project mi-proyecto
  → Solo expone tools de ese proyecto
```

### Tarea 5.2: Modo HTTP/SSE para clientes remotos

```
Implementar en src/transports/http.ts:

Cuando se ejecuta: konduct start --transport http --port 3847

1. Levantar servidor Express/HTTP nativo
2. Exponer endpoint Streamable HTTP en /mcp
3. Exponer endpoint SSE en /sse (backwards compatibility)
4. Opcionalmente: auth con token simple (--token <token> o generado)
5. CORS habilitado por defecto

Esto permite conectar clientes remotos o incluso
desde otra máquina en la misma red.
```

**Checkpoint 5:** `konduct connect claude` configura Claude Desktop automáticamente. Reiniciar Claude Desktop y verificar que las tools del router aparecen.

---

## FASE 6 — Resiliencia y Calidad

### Tarea 6.1: Manejo robusto de procesos stdio

```
Mejorar src/transports/stdio.ts:

- Capturar stderr del proceso hijo → loggear como warning
- Detectar crash del proceso (event 'exit') → marcar servidor como unhealthy
- Implementar retry con backoff exponencial (1s, 2s, 4s, max 30s)
- Healthcheck periódico: enviar ping MCP cada 60s a cada conexión activa
- Graceful shutdown: al recibir SIGINT/SIGTERM, cerrar todas las conexiones
  y esperar max 5s antes de forzar kill

Cross-platform:
- Linux: process.kill(pid, 'SIGTERM') para cleanup
- Windows: usar taskkill o process.kill(pid) (SIGTERM no existe en Windows)
- Detectar OS y usar el método correcto
```

### Tarea 6.2: Tests

```
Instalar vitest: npm install -D vitest

Tests prioritarios:
1. config/db.test.ts — Crear DB en /tmp, verificar migraciones, CRUD básico
2. core/registry.test.ts — Agregar/remover servidores, discovery mock
3. core/aggregator.test.ts — Merge de tools, manejo de colisiones
4. core/proxy.test.ts — Mock de conexiones, timeout, retry
5. cli/index.test.ts — Parsing de comandos (sin side effects)

Para tests de integración:
- Crear un servidor MCP de prueba mínimo (3 tools dummy)
- Verificar el flujo completo: registro → discovery → routing → respuesta
```

### Tarea 6.3: Logging estructurado

```
Instalar pino: npm install pino

- Log file en ~/.config/mcp-konduct/konduct.log
- Niveles: debug, info, warn, error
- Formato JSON para facilitar parsing
- Rotación simple: truncar si > 50MB
- Flag --verbose en CLI para output a stdout en modo debug
```

**Checkpoint 6:** `npm test` pasa. El router sobrevive un crash de un servidor downstream sin caer. Los logs son legibles y útiles.

---

## FASE 7 — Web UI (Opcional, Post-MVP)

### Tarea 7.1: Dashboard web minimalista

```
Solo si se necesita. No es MVP.

Stack: Hono (framework HTTP ligero) + HTMX o React simple
Servido desde el mismo proceso Node que el router.

Endpoints:
GET /dashboard          → Vista principal
GET /api/servers        → JSON de servidores
POST /api/servers       → Agregar servidor
GET /api/tools          → JSON de tools
POST /api/tools/:id/toggle → Toggle tool
GET /api/logs           → Logs paginados
GET /api/status         → Status del router

Accesible en http://localhost:3847/dashboard
```

---

## Resumen de Dependencias Finales

| Paquete | Propósito | Tipo |
|---------|-----------|------|
| `@modelcontextprotocol/sdk` | SDK MCP (Server + Client) | prod |
| `zod` | Validación de schemas (peer dep del SDK) | prod |
| `better-sqlite3` | Base de datos local | prod |
| `commander` | Framework CLI | prod |
| `chalk` | Colores en terminal | prod |
| `pino` | Logging estructurado | prod |
| `typescript` | Compilador | dev |
| `tsx` | Runner dev sin build | dev |
| `@types/node` | Tipos Node.js | dev |
| `@types/better-sqlite3` | Tipos SQLite | dev |
| `vitest` | Testing | dev |

---

## Orden de Ejecución para Agent CLI

```
FASE 0 → FASE 1 → FASE 2 → FASE 3 → FASE 4 → FASE 5 → FASE 6
                                                            ↓
                                                     FASE 7 (opcional)
```

Cada fase tiene un checkpoint verificable. No avanzar a la siguiente fase hasta que el checkpoint pase.

**Tiempo estimado de implementación:**
- Fases 0-3 (core funcional): ~4-6 horas de trabajo de agente
- Fase 4 (CLI completo): ~2-3 horas
- Fase 5 (integración clientes): ~1-2 horas
- Fase 6 (resiliencia): ~2-3 horas
- Fase 7 (web UI): ~3-4 horas (solo si se decide hacer)

**Total MVP (fases 0-5): ~10-14 horas de agente**
