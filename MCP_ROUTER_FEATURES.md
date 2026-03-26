# 🔄 MCP Router Features Analysis
## Qué podría adaptarse de MCP Router a mcp-konduct

---

## 📊 TOP 10 FEATURES ORDENADAS POR IMPACTO + ESFUERZO

### 🟢 ALTA PRIORIDAD - Implementar en Semanas 1-4

#### **1. Projects & Server Grouping**
```
Esfuerzo: ⭐⭐ (2-3 días)
Impacto:  ⭐⭐⭐⭐⭐ (9/10)
ROI:      ⭐⭐⭐
```
**¿Qué es?** Agrupar múltiples servidores bajo "proyectos" temáticos.

**Ejemplo:**
```
Projects:
  - "ML/AI Tools" → [OpenAI server, Anthropic server, local LLM]
  - "Database" → [PostgreSQL MCP, MySQL MCP]
  - "Infrastructure" → [Terraform, Kubernetes]
```

**Por qué lo quieres:**
- Usuarios con 20+ servidores necesitan organización
- Mejor búsqueda y filtrado de herramientas
- Proyectos aislados = evita conflictos de nombres

**Implementación en mcp-konduct:**
```typescript
// Ya tienes projects en la BD, mejorar UI para:
1. Asignar servidores a proyectos
2. Listar tools por proyecto
3. Filtrar en dashboard por proyecto
```

---

#### **2. Hook System (JavaScript Sandbox)**
```
Esfuerzo: ⭐⭐⭐ (3-5 días)
Impacto:  ⭐⭐⭐⭐ (8/10)
ROI:      ⭐⭐⭐
```

**¿Qué es?** Interceptores que ejecutan JavaScript sandbox antes/después de tool calls.

**Ejemplos:**
```javascript
// Pre-hook: Validar entrada
{
  toolName: "read_file",
  hook: "pre",
  code: `
    if (!args.path.startsWith("/safe/")) {
      throw new Error("Access denied");
    }
  `
}

// Post-hook: Transformar salida
{
  toolName: "read_file",
  hook: "post",
  code: `
    return result.substring(0, 1000); // Limitar output
  `
}
```

**Por qué lo quieres:**
- Transformación de datos sin reescribir herramientas
- Seguridad: validar/sanitizar inputs
- Composabilidad: chains de operaciones
- Rate limiting, logging personalizado

**Implementación en mcp-konduct:**
```typescript
// En registry.ts, agregar:
interface Hook {
  id: string;
  toolId: string;
  type: 'pre' | 'post' | 'transform';
  code: string;  // JavaScript sandbox
  enabled: boolean;
}

// En proxy.ts:
async function callTool(name, args) {
  // 1. Ejecutar pre-hooks
  for (const hook of preHooks) {
    args = await sandbox.eval(hook.code, { args });
  }
  
  // 2. Llamar herramienta
  const result = await connection.callTool(name, args);
  
  // 3. Ejecutar post-hooks
  for (const hook of postHooks) {
    result = await sandbox.eval(hook.code, { result });
  }
  
  return result;
}
```

---

#### **3. Tool Catalog & BM25 Search**
```
Esfuerzo: ⭐⭐⭐⭐ (4-6 días)
Impacto:  ⭐⭐⭐⭐ (7/10)
ROI:      ⭐⭐⭐
```

**¿Qué es?** Indexación de todas las herramientas con búsqueda full-text (BM25).

**Ejemplo:**
```bash
konduct search "read file"
# Output:
# filesystem::read_file       [from: localhost]
# s3::read_object             [from: aws-server]
# github::get_file_contents   [from: github-api]
```

**Por qué lo quieres:**
- Con 50+ herramientas, descubrimiento es hard
- BM25 entiende contexto (mejor que grep simple)
- Dashboard searchable para herramientas

**Implementación:**
```typescript
// En registry.ts
class ToolCatalog {
  private index: Map<string, Tool[]> = new Map();
  
  indexTools() {
    const allTools = this.listAllTools();
    for (const tool of allTools) {
      const tokens = tokenize(tool.toolName + ' ' + tool.description);
      for (const token of tokens) {
        if (!this.index.has(token)) {
          this.index.set(token, []);
        }
        this.index.get(token)!.push(tool);
      }
    }
  }
  
  search(query: string, limit: number = 10): Tool[] {
    // BM25 ranking + relevance score
    const tokens = tokenize(query);
    const scores = new Map<string, number>();
    
    for (const token of tokens) {
      const matches = this.index.get(token) || [];
      for (const tool of matches) {
        scores.set(tool.id, (scores.get(tool.id) || 0) + 1);
      }
    }
    
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, _]) => allTools.find(t => t.id === id)!);
  }
}

// CLI endpoint
konduct.command('search <query>')
  .action((query) => {
    const results = catalog.search(query);
    console.table(results);
  });
```

---

#### **4. Enhanced Logging & Database Export**
```
Esfuerzo: ⭐⭐ (2-3 días)
Impacto:  ⭐⭐⭐⭐ (6/10)
ROI:      ⭐⭐
```

**¿Qué es?** Logging completo de request/response + exportación.

**Hoy en mcp-konduct:**
```
timestamp | server | tool | duration | success
```

**Con esta feature:**
```
timestamp | server | tool | duration | success | request | response | error
+ exportar a CSV/JSON
+ filtros avanzados (por rango de duración, error patterns)
```

**Implementación:**
```typescript
interface RequestLog {
  id: string;
  timestamp: string;
  serverId: string;
  toolName: string;
  request: object;  // NUEVO: argumentos completos
  response: object; // NUEVO: resultado completo
  error?: string;   // NUEVO: mensaje de error
  durationMs: number;
  success: boolean;
}

// Agregar endpoint
app.get('/api/logs/export', (c) => {
  const format = c.req.query('format') || 'csv'; // csv, json
  const logs = db.prepare('SELECT * FROM request_logs').all();
  
  if (format === 'csv') {
    return c.text(convertToCSV(logs), 200, {
      'Content-Disposition': 'attachment; filename="logs.csv"'
    });
  }
  
  return c.json(logs);
});
```

---

### 🟡 MEDIA PRIORIDAD - Q2 2024

#### **5. Workspace Management**
```
Esfuerzo: ⭐⭐⭐⭐⭐ (5-7 días)
Impacto:  ⭐⭐⭐⭐ (7/10)
```
Múltiples contextos aislados (como "profiles" en navegador).

**Ejemplo:**
```bash
konduct workspace create production
konduct workspace create staging
konduct workspace create testing

konduct workspace switch production
konduct server list  # Solo production servers
```

---

#### **6. Per-Tool Permissions Matrix**
```
Esfuerzo: ⭐⭐ (2 días)
Impacto:  ⭐⭐⭐ (5/10)
```

**Ejemplo:**
```json
{
  "filesystem::delete_file": {
    "allowed": false,
    "reason": "Dangerous operation"
  },
  "read_file": {
    "allowed": true,
    "max_file_size": 10000000
  }
}
```

---

### 🔴 BAJA PRIORIDAD - Q3 2024+

#### **7. Visual Workflow System**
```
Esfuerzo: ⭐⭐⭐⭐⭐⭐⭐ (2-3 sprints)
Impacto:  ⭐⭐⭐⭐⭐ (9/10)
```
Editor visual DAG (React Flow) + ejecución automática.

**Estrategia para mcp-konduct:**
- Backend primero: Engine de ejecución DAG
- UI después: React Flow si necesario

---

## 🏗️ ARQUITECTURA A ADOPTAR

### Patrón: Service → Repository → Handler

**MCP Router usa:**
```typescript
module/
├── service.ts       // Lógica de negocio (sin DB)
├── repository.ts    // Acceso a BD (SQLite)
├── ipc.ts          // API handlers/CLI
└── types.ts        // Tipos TypeScript
```

**Aplicar en mcp-konduct:**
```typescript
// Actual (mezcla todo)
src/core/registry.ts  // 500+ líneas mixtas

// Mejorado
src/core/
├── server/
│   ├── server.service.ts
│   ├── server.repository.ts
│   ├── server.types.ts
│   └── server.cli.ts
├── tool/
│   ├── tool.service.ts
│   ├── tool.repository.ts
│   └── tool.types.ts
```

**Ventajas:**
✅ Testeable (service sin BD)  
✅ Reutilizable (service + diferentes handlers)  
✅ Escalable (agregar HTTP handler sin tocar lógica)

---

## 📋 MATRIZ DE DECISIÓN

```
┌─────────────────────────┬───────┬────────┬──────┬───────────────┐
│ Feature                 │ Effort│ Impact │ ROI  │ WHEN          │
├─────────────────────────┼───────┼────────┼──────┼───────────────┤
│ 1. Projects             │ 2-3d  │ 9/10   │ 🔥🔥🔥 │ Week 1-2      │
│ 2. Hooks (Simple)       │ 3-5d  │ 8/10   │ 🔥🔥🔥 │ Week 3-4      │
│ 3. Tool Catalog Search  │ 4-6d  │ 7/10   │ 🔥🔥🔥 │ Week 5-6      │
│ 4. Enhanced Logging     │ 2-3d  │ 6/10   │ 🔥🔥  │ Week 7        │
│ 5. Workspace Mgmt       │ 5-7d  │ 7/10   │ 🔥🔥  │ Q2 2024       │
│ 6. Permissions Matrix   │ 2d    │ 5/10   │ 🔥   │ Q2 2024       │
│ 7. Workflow System      │ 2-3sp │ 9/10   │ 🔥🔥  │ Q3 2024       │
│ 8. Cloud Sync           │ ∞     │ 5/10   │ 🔥   │ ❌ OUT-SCOPE  │
│ 9. Token Management     │ 3-4d  │ 6/10   │ 🔥🔥  │ Q2 2024       │
│ 10. Multi-Protocol      │ 4-5d  │ 6/10   │ 🔥🔥  │ Future        │
└─────────────────────────┴───────┴────────┴──────┴───────────────┘
```

---

## 🚀 ROADMAP RECOMENDADO

### **Phase 1: IMMEDIATE (2-3 sprints)**
```
✅ Projects & Server Grouping
✅ Simple Hook System
✅ Tool Catalog + BM25 Search
✅ Enhanced Logging
✅ Refactor arquitectura (Service→Repo)
```
**Outcome**: 10x mejor UX para usuarios con 20+ servidores.

### **Phase 2: ROBUSTNESS (4-6 semanas)**
```
⏸️ Workspace Management
⏸️ Per-Tool Permissions
⏸️ Token Management API
```

### **Phase 3: AUTOMATION (Q3 2024)**
```
⏸️ Workflow Engine (backend)
⏸️ Visual Workflow Editor (React)
```

---

## 💡 DIFERENCIADOR ÚNICO

Mientras **MCP Router** es un "Electron Desktop App + Management UI", mcp-konduct debe ser:

### **"Lightweight, API-first, extensible CLI router con workflows composables"**

✅ **Keep**: CLI-first, sin Electron overhead  
✅ **Add**: Hooks, Workflows, Tool Discovery  
✅ **Improve**: Arquitectura modular Service→Repo

---

## 📥 ARCHIVO COMPLETO

Este documento es un resumen ejecutivo.

Para detalles técnicos, ver: **`MCP_ROUTER_ANALYSIS.md`** (generado automáticamente)

---

## ⚡ QUICK START: Implementar Feature #1

```bash
# 1. Crear rama
git checkout -b feat/projects-improvement

# 2. Mejorar BD (ya tienes projects)
# Agregar: project_id en servers table

# 3. Mejorar CLI
konduct project list
konduct project assign <server-id> <project-id>
konduct server list --project <project-id>

# 4. Dashboard UI
# Agregar filtro de proyecto en /servers

# 5. Push & PR
```

