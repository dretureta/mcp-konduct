# MCP Konduct Dashboard Design

**Date:** 2026-03-25
**Project:** mcp-konduct
**Feature:** Web Dashboard

---

## 1. Overview

Dashboard web para gestionar el proxy/agregador de servidores MCP. Permite administrar servidores, tools, proyectos y ver logs de requests desde una interfaz visual.

---

## 2. Architecture

```
┌─────────────────────────────────────┐
│         Node.js Process              │
│  ┌─────────────┐  ┌──────────────┐  │
│  │   Hono     │  │   CLI Main    │  │
│  │  HTTP API  │  │   Commands    │  │
│  └──────┬──────┘  └──────────────┘  │
│         │                             │
│  ┌──────┴──────┐                     │
│  │   HTMX      │  ← Static/HTML     │
│  │   Pages     │                     │
│  └─────────────┘                     │
│         │                             │
│  ┌──────┴──────┐                     │
│  │   SQLite    │                     │
│  │  (konduct)  │                     │
│  └─────────────┘                     │
└─────────────────────────────────────┘
```

- **Servidor HTTP:** Hono (ligero, mismo proceso Node.js)
- **UI:** HTMX para interactividad sin JavaScript complejo
- **Acceso:** Solo local (sin autenticación)
- **Puerto:** 3847 (mismo que el router MCP)

---

## 3. Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview con métricas |
| `/servers` | Lista de servidores |
| `/servers/:id` | Detalle de servidor + tools |
| `/servers/new` | Formulario para agregar servidor |
| `/tools` | Todas las tools |
| `/projects` | Gestión de proyectos |
| `/logs` | Request logs con filtros |
| `/settings` | Configuración |

---

## 4. UI Design

### Color Palette (Dark Mode)
- **Background:** `#1a1a2e`
- **Surface:** `#16213e`
- **Primary:** `#00d4ff` (cyan)
- **Success:** `#10b981` (green)
- **Error:** `#ef4444` (red)
- **Warning:** `#f59e0b` (amber)
- **Text Primary:** `#ffffff`
- **Text Secondary:** `#94a3b8`

### Components

1. **Server Cards**
   - Status indicator (green/red dot)
   - Name, transport type
   - Tool count badge
   - Enable/disable toggle

2. **Tool Toggles**
   - Switch component
   - Tool name + description
   - Server origin badge

3. **Data Tables**
   - Sortable columns
   - Pagination
   - Row actions (edit, delete)

4. **Modals**
   - Confirmación para delete
   - Formularios inline

5. **Toasts**
   - Success/error feedback
   - Auto-dismiss 3s

---

## 5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/servers` | List servers |
| POST | `/api/servers` | Create server |
| GET | `/api/servers/:id` | Get server |
| PUT | `/api/servers/:id` | Update server |
| DELETE | `/api/servers/:id` | Delete server |
| POST | `/api/servers/:id/discover` | Discover tools |
| GET | `/api/tools` | List all tools |
| PUT | `/api/tools/:id/toggle` | Toggle tool |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/logs` | Get logs with filters |
| GET | `/api/stats` | Dashboard stats |

---

## 6. Features

- **Dashboard:** Stats (servers enabled/total, tools enabled/total, recent activity)
- **Server Management:** Add, edit, remove, enable/disable servers
- **Tool Discovery:** Discover tools from server, toggle individual tools
- **Project Grouping:** Group servers into projects
- **Request Logs:** Filter by server, success/error, date range
- **Export/Import:** JSON config export/import

---

## 7. Acceptance Criteria

1. Dashboard carga y muestra stats correctos
2. Se pueden agregar/editar/eliminar servidores
3. Tool discovery funciona y guarda en DB
4. Toggle de tools funciona
5. Logs se muestran con filtros
6. Dark mode se renderiza correctamente
7. Responsive en móvil (375px+)
