# React Dashboard Redesign Specification

**Date:** March 26, 2026  
**Project:** mcp-konduct Dashboard Modernization  
**Status:** Design Phase  
**Author:** OpenCode Agent

---

## Executive Summary

Modernize the mcp-konduct web dashboard from Hono + HTMX + vanilla CSS to a modern **React + Vite + Tailwind** architecture. This enables:
- Responsive, reactive UI (SPA experience without page reloads)
- Modern, professional design (Indigo + Pink color scheme)
- Better developer experience (React ecosystem, component libraries, tooling)
- Scalability for future features (hooks, real-time updates, extensions)
- Dark mode toggle for accessibility and user preference

The backend (Hono) remains unchanged functionally; it's reorganized into modular route handlers and serves static React assets.

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│  User Browser                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ React SPA (http://localhost:3000)                 │ │
│  │ - Sidebar, Dashboard, Servers, Tools, Projects    │ │
│  │ - Dark Mode Toggle (localStorage persistence)     │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │ fetch() calls
                       ↓
┌──────────────────────────────────────────────────────────┐
│ Hono Backend (Node.js process)                           │
│ ├── /api/servers       (GET, POST, DELETE, UPDATE)      │
│ ├── /api/tools         (GET, EXECUTE, SEARCH)           │
│ ├── /api/projects      (GET, POST)                       │
│ ├── /api/logs          (GET)                             │
│ └── Static Assets      (Serve dist/web/client/*.js,html)│
└──────────────────────────────────────────────────────────┘
                       │
                       ↓
           ┌──────────────────────┐
           │ SQLite Database      │
           │ (existing schema)    │
           └──────────────────────┘
```

### Directory Structure

```
src/web/
├── server.ts                    # Hono entry point
├── routes/
│   ├── servers.ts               # GET/POST /api/servers/*
│   ├── tools.ts                 # GET/POST /api/tools/*
│   ├── projects.ts              # GET/POST /api/projects/*
│   └── logs.ts                  # GET /api/logs
├── middleware/
│   ├── auth.ts                  # Future: auth middleware
│   └── errorHandler.ts          # Error handling
│
└── client/                       # React SPA (NEW)
    ├── src/
    │   ├── App.tsx              # Root component, routing setup
    │   ├── main.tsx             # Entry point
    │   ├── pages/
    │   │   ├── Dashboard.tsx     # Home page with stats
    │   │   ├── ServersPage.tsx   # Server list & management
    │   │   ├── ToolsPage.tsx     # Tool discovery & execution
    │   │   ├── ProjectsPage.tsx  # Project grouping
    │   │   └── LogsPage.tsx      # Request history & analytics
    │   ├── components/
    │   │   ├── Sidebar.tsx       # Navigation sidebar
    │   │   ├── Header.tsx        # Top header + dark mode toggle
    │   │   ├── ServerCard.tsx    # Reusable server card
    │   │   ├── ToolCard.tsx      # Tool display & execution
    │   │   ├── Modal.tsx         # Generic modal component
    │   │   └── StatBox.tsx       # Stats display
    │   ├── hooks/
    │   │   ├── useServers.ts     # Fetch & cache servers
    │   │   ├── useTools.ts       # Fetch tools
    │   │   ├── useProjects.ts    # Fetch projects
    │   │   ├── useLogs.ts        # Fetch logs
    │   │   ├── useDarkMode.ts    # Dark mode state + localStorage
    │   │   └── useFetch.ts       # Generic fetch wrapper with error handling
    │   ├── context/
    │   │   └── AppContext.tsx    # Global state: servers, tools, projects, theme
    │   ├── types/
    │   │   └── index.ts          # TypeScript interfaces (mirrored from backend)
    │   ├── styles/
    │   │   ├── globals.css       # Tailwind + theme variables
    │   │   └── tailwind.config.js
     │   └── utils/
     │       └── api.ts            # Axios instance + request helpers
     │   └── __tests__/            # Component tests
     │       ├── components/
     │       │   ├── Sidebar.test.tsx
     │       │   ├── ServerCard.test.tsx
     │       │   └── Modal.test.tsx
     │       └── hooks/
     │           ├── useServers.test.ts
     │           └── useDarkMode.test.ts
     ├── index.html               # HTML template (Vite)
     ├── vite.config.ts           # Vite configuration
     ├── tsconfig.json            # TypeScript config (extends root)
     └── package.json             # Frontend dependencies only
```

---

## Technology Stack

### Frontend (New)
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **UI Framework** | React 18.3+ | Industry standard, large ecosystem |
| **Language** | TypeScript | Type safety, better DX |
| **Build Tool** | Vite 5.x | 10x faster than Webpack, excellent HMR |
| **Routing** | React Router v6 | Standard SPA routing |
| **HTTP Client** | Axios 1.6+ | Better error handling than fetch |
| **State Management** | React Context | Simple for current scope; can upgrade to Zustand later |
| **Styling** | Tailwind CSS 3.x | Utility-first, responsive, dark mode built-in |
| **Testing** | Vitest + React Testing Library | Fast, same as backend |
| **Package Manager** | npm | Consistency with backend |

### Backend (Unchanged Functionally)
- **Framework:** Hono (no change)
- **Database:** SQLite (existing)
- **ORM:** None (raw prepared statements)
- **API Pattern:** REST (same endpoints)

---

## UI/UX Design

### Color Scheme (with Dark Mode Support)

**Light Mode:**
```css
--primary: #6366f1      /* Indigo */
--primary-dark: #4f46e5
--accent: #ec4899       /* Pink */
--bg: #f8fafc           /* Slate 50 */
--surface: #f1f5f9      /* Slate 100 */
--text: #0f172a         /* Slate 900 */
--text-secondary: #475569 /* Slate 600 */
```

**Dark Mode (default):**
```css
--primary: #6366f1      /* Indigo */
--primary-dark: #4f46e5
--accent: #ec4899       /* Pink */
--bg: #0f172a           /* Slate 950 */
--surface: #1e293b      /* Slate 900 */
--text: #f1f5f9         /* Slate 50 */
--text-secondary: #cbd5e1 /* Slate 300 */
```

### Layout Structure

**Sidebar Navigation:**
- Fixed left sidebar (280px on desktop, collapsible on mobile)
- Logo + brand name (Konduct with icon)
- Navigation items: Dashboard, Servers, Tools, Projects, Logs, Settings
- Hover effects: background color change + text highlight
- Active state: primary color background

**Header:**
- Search bar (optional)
- "Add Server" button (primary color)
- Dark mode toggle (sun/moon icon, top right)
- Responsive: stacks on mobile

**Main Content Area:**
- Full-width on desktop, single-column on mobile
- Card-based layout with 1.5rem gaps
- Stats grid (4 columns on desktop → 1 on mobile)
- Server cards grid (3 columns on desktop → 1 on mobile)

### Dark Mode Implementation

**Mechanism (Tailwind + CSS Variables):**

1. **HTML Root Class:** Toggle `dark` class on `<html>` element
   ```typescript
   // In App.tsx or Header.tsx
   useEffect(() => {
     if (isDarkMode) {
       document.documentElement.classList.add('dark');
     } else {
       document.documentElement.classList.remove('dark');
     }
   }, [isDarkMode]);
   ```

2. **Tailwind Dark Mode:** Uses `dark:` prefix in class names
   ```typescript
   <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
     Content
   </div>
   ```

3. **CSS Variables:** Define in `:root` and `html.dark`
   ```css
   /* src/web/client/src/styles/globals.css */
   :root {
     --primary: #6366f1;
     --primary-dark: #4f46e5;
     --accent: #ec4899;
     --bg: #f8fafc;
     --surface: #f1f5f9;
     --text: #0f172a;
     --text-secondary: #475569;
   }

   html.dark {
     --primary: #6366f1;
     --primary-dark: #4f46e5;
     --accent: #ec4899;
     --bg: #0f172a;
     --surface: #1e293b;
     --text: #f1f5f9;
     --text-secondary: #cbd5e1;
   }

   body {
     background-color: var(--bg);
      color: var(--text);
    }
    ```

4. **Tailwind Config:** Use explicit hex values (Tailwind doesn't support CSS variable names directly in theme)
    ```typescript
    // tailwind.config.js
    module.exports = {
      theme: {
        extend: {
          colors: {
            // Define as explicit hex values
            primary: '#6366f1',      // Indigo
            'primary-dark': '#4f46e5',
            accent: '#ec4899',       // Pink
            bg: '#0f172a',           // Slate 950 (dark)
            surface: '#1e293b',      // Slate 900 (dark)
            text: '#f1f5f9',         // Slate 50 (dark)
            'text-secondary': '#cbd5e1', // Slate 300 (dark)
          }
        }
      },
      darkMode: 'class' // ← Use class strategy, not media
    };
    ```
    
    **Alternative Approach** (if dynamic theming needed later):
    Use CSS variables with HSL values so Tailwind can read them:
    ```css
    :root {
      --primary: 99, 102, 241;       /* HSL values (h, s, l) */
    }
    ```
    ```typescript
    colors: {
      primary: 'hsl(var(--primary))'
    }
    ```

5. **localStorage Persistence:**
    ```typescript
    // useDarkMode.ts
    const [isDarkMode, setIsDarkMode] = useState(() => {
      const stored = localStorage.getItem('theme-mode');
      return stored === 'light' ? false : true; // default dark
    });


   const toggleDarkMode = () => {
     setIsDarkMode(prev => {
       const newMode = !prev;
       localStorage.setItem('theme-mode', newMode ? 'dark' : 'light');
       return newMode;
     });
   };
   ```

**Result:** Both Tailwind's `dark:` classes AND CSS variables work together. CSS variables provide flexibility; Tailwind provides rapid utility styling.

---

## API Response Types & Schemas

**All API responses follow a standard JSON format:**

### Server Responses
```typescript
// GET /api/servers → List
{
  servers: {
    id: string;
    name: string;
    transport: 'stdio' | 'sse' | 'streamable-http';
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    enabled: boolean;
    createdAt?: string;
    updatedAt?: string;
  }[]
}

// GET /api/servers/:id → Single
{
  id: string;
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// POST /api/servers/:id/update → Success (302 redirect)
// DELETE /api/servers/:id → Success (200 OK)
```

### Error Responses
```typescript
// All errors return:
{
  error: string;     // Human-readable message
  code?: string;     // Error code (e.g., 'NOT_FOUND')
  details?: object;  // Additional context
}
// HTTP status: 400 (bad request), 404 (not found), 500 (server error)
```

### Tool & Project Responses
```typescript
// GET /api/tools → List
{
  tools: {
    name: string;
    originalName: string;
    serverId: string;
    description?: string;
    inputSchema: object;
    outputSchema?: object;
  }[]
}

// GET /api/projects → List
{
  projects: {
    id: string;
    name: string;
    description?: string;
    createdAt?: string;
    serverCount: number;
  }[]
}

// GET /api/logs?limit=50 → List (default limit 50, max 500)
{
  logs: {
    id: number;
    timestamp: string;
    serverId: string;
    toolName: string;
    durationMs: number;
    success: boolean;
    errorMessage?: string;
  }[]
}
```

**Frontend TypeScript Types** (mirrored in `src/web/client/src/types/index.ts`):
```typescript
export interface Server {
  id: string;
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tool {
  name: string;
  originalName: string;
  serverId: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  serverCount: number;
}

export interface RequestLog {
  id: number;
  timestamp: string;
  serverId: string;
  toolName: string;
  durationMs: number;
  success: boolean;
   errorMessage?: string;
}
```

---

## API Contracts (No Changes)

Backend endpoints remain identical; organized into route modules:

### Servers
```
GET    /api/servers                    # List all
POST   /api/servers                    # Create new
GET    /api/servers/:id                # Get detail
POST   /api/servers/:id/update         # Update fields
DELETE /api/servers/:id                # Remove
```

### Tools
```
GET    /api/tools                      # List all tools
GET    /api/tools/:name                # Tool detail
POST   /api/tools/:name/execute        # Execute tool
GET    /api/tools/search?q=keyword     # Search
```

### Projects
```
GET    /api/projects                   # List projects
POST   /api/projects                   # Create
POST   /api/projects/:id/servers       # Add servers to project
```

### Logs
```
GET    /api/logs?limit=50              # Request history
GET    /api/logs/:id                   # Log detail
```

---

## Data Flow

### Server List Example

**User Action:** Navigate to /servers

1. React Router loads `<ServersPage />`
2. `useServers()` hook fires (if not cached)
3. Hook calls `axios.get('/api/servers')`
4. Hono backend queries SQLite → returns JSON
5. Hook stores in React Context
6. Components subscribe to Context → re-render
7. UI displays ServerCard components

**No page reload, instant feedback**

### Tool Execution Example

**User Action:** Click "Execute" on a tool

1. Form modal opens with tool parameters
2. User fills inputs, clicks "Run"
3. `axios.post('/api/tools/:name/execute', { params })`
4. Hono processes request, returns result
5. Modal updates with response (success or error)
6. Request logged to database
7. Logs page can query and display history

---

## Global State Management (AppContext)

**Context Shape** (defined in `src/web/client/src/context/AppContext.tsx`):

```typescript
interface AppContextType {
  // Data state
  servers: Server[];
  tools: Tool[];
  projects: Project[];
  logs: RequestLog[];

  // UI state
  isDarkMode: boolean;
  sidebarOpen: boolean;

  // Loading & error state
  loading: boolean;
  error: string | null;

  // Dispatch functions
  fetchServers: () => Promise<void>;
  fetchTools: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchLogs: (limit?: number) => Promise<void>;
  toggleDarkMode: () => void;
  setSidebarOpen: (open: boolean) => void;
  clearError: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
```

**Usage Pattern:**

1. **Page Load:** `useEffect(() => { fetchServers(); }, [])`
2. **Component Render:** `const { servers } = useContext(AppContext)` → get cached data
3. **User Action:** Call `fetchServers()` → API call → Context updates → components re-render
4. **Caching:** Data stays in Context until page refresh or explicit refetch (simple, suitable for small dataset)

**Future Upgrade:** If caching becomes complex → swap React Context for **TanStack Query** or **Zustand**

---

## Development Workflow

### Local Development

```bash
# Setup (once)
npm install
npm run build                 # Initial build

# Terminal 1: Frontend dev server with hot reload
cd src/web/client
npm run dev                   # Vite on :5173, HMR enabled, proxies /api to :3000

# Terminal 2: Backend dev server
npm run dev start -d          # Hono on :3000, serves static assets from dist/

# Visit: http://localhost:3000 (backend serves React)
# OR:    http://localhost:5173 (Vite dev server with HMR)
```

**HMR (Hot Module Replacement):** Edit React components → instant refresh without losing state

**Proxy Setup** (in `vite.config.ts`):
- `/api/*` requests during dev → proxied to `http://localhost:3000`
- Allows developing frontend at :5173 while backend runs at :3000

**CORS Configuration** (in `src/web/server.ts`):
```typescript
import { cors } from 'hono/cors';

app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
```
This allows Vite dev server (:5173) to make requests to backend (:3000)

### Production Build

```bash
# From root directory
npm run build

# What happens:
# 1. tsc compiles src/ → dist/ (backend TypeScript)
# 2. cd src/web/client && vite build
#    - Compiles React/TypeScript
#    - Bundles with Tailwind CSS
#    - Output: dist/web/client/ (HTML + JS + CSS)
# 3. Hono middleware configured to serve dist/web/client/* files

# Run production build:
konduct start --dashboard

# Backend on :3000, serves React SPA
# Visit: http://localhost:3000
```

**Build Script** (root `package.json`):
```json
{
  "scripts": {
    "build": "tsc && cd src/web/client && npm install && npm run build",
    "dev": "tsx src/cli/index.ts",
    "start": "node dist/cli/index.js"
  }
}
```

---

## Testing Strategy

### Frontend Testing

**Test Organization:**

| Level | Framework | What | Where |
|-------|-----------|------|-------|
| **Unit** | Vitest + React Testing Library | Components, hooks | `src/__tests__/components/*.test.tsx`, `src/__tests__/hooks/*.test.ts` |
| **Integration** | Vitest | Hook + API mocking | `src/__tests__/pages/*.test.tsx` |
| **E2E** | Playwright (optional) | Full user workflows | `e2e/dashboard.spec.ts` |
| **Backend** | Vitest (existing) | API endpoints | `src/web/__tests__/*.test.ts` |

**Target Coverage:** 
- Components: 80%+ 
- Hooks: 90%+
- Critical paths (server CRUD, tool execution): 100%

**Unit Tests (Components):**
```typescript
// ServersPage.test.tsx
import { render, screen } from '@testing-library/react';
import { ServersPage } from './ServersPage';

it('displays server cards', async () => {
  render(<ServersPage />);
  await waitFor(() => {
    expect(screen.getByText('Filesystem')).toBeInTheDocument();
  });
});
```

**Integration Tests:**
- Test `useServers()` hook with mock API
- Test form submission + server update

**E2E Tests (Optional):**
- Use Playwright for full user workflows
- Test dark mode persistence across pages

### Backend Testing
- Existing Vitest setup continues
- API endpoint tests (no changes needed)

---

## Error Handling & Edge Cases

### Network Errors
```typescript
// useFetch hook
try {
  const data = await axios.get('/api/servers');
} catch (error) {
  if (error.response?.status === 404) {
    // Handle not found
  } else if (error.request) {
    // No response (network error)
    showErrorToast('Network error. Check your connection.');
  } else {
    // Request setup error
  }
}
```

### Empty States
- No servers: Show "Add your first server" card with guide
- No tools: Show "Discover tools by adding a server" message
- Failed tools: Show error badge + retry button

### Loading States
- Skeleton loaders for initial page load
- Spinners for async operations
- Disabled buttons during form submission

---

## Performance Considerations

1. **Code Splitting:** React Router lazy-loads page components
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

2. **Data Caching:** Context stores fetched data; can upgrade to React Query
   
3. **Bundle Size:** 
   - React + ReactDOM + Router + Axios: ~150KB gzipped
   - Tailwind CSS: ~50KB gzipped
   - Total: ~200KB (acceptable for a dashboard)

4. **API Call Optimization:**
   - Avoid fetching on every render (use dependency arrays)
   - Debounce search/filter inputs
   - Cache results in Context

---

## Deployment & Build Configuration

### Vite Configuration
```typescript
// src/web/client/vite.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/web/client',  // Output to root dist
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'  // Dev: proxy to Hono
    }
  }
});
```

### Hono Static Serving
```typescript
// src/web/server.ts
import { serveStatic } from 'hono/serve-static';

app.use('/*', serveStatic({
  root: '../dist/web/client'  // Serve React build
}));

app.get('/', (c) => c.html(indexHtml)); // SPA fallback
```

---

## Migration Path (Phased)

### Phase 1: Core UI (Week 1)
- [ ] Set up React + Vite project structure
- [ ] Create Sidebar, Header, basic layout
- [ ] Implement dark mode toggle + localStorage
- [ ] Migrate Dashboard page (stats cards)

### Phase 2: Server Management (Week 2)
- [ ] Migrate ServersPage (list + cards)
- [ ] Create server add/edit/delete flows
- [ ] Connect to existing backend API

### Phase 3: Tools & Projects (Week 3)
- [ ] Migrate ToolsPage (discovery + execution)
- [ ] Migrate ProjectsPage
- [ ] Add search/filter functionality

### Phase 4: Polish & Testing (Week 4)
- [ ] Add component tests
- [ ] Optimize performance + bundle size
- [ ] Accessibility review (WCAG 2.1 AA)
- [ ] Final QA

---

## Success Criteria

- [ ] Dashboard loads and renders without errors
- [ ] All 6 features work: server mgmt, tool discovery, execution, projects, logs, analytics
- [ ] Dark mode toggle persists across sessions
- [ ] Responsive on mobile (320px - 2560px)
- [ ] No console errors or warnings
- [ ] Bundle size under 300KB gzipped
- [ ] Page load time < 2s (CLS, LCP, FID all green)
- [ ] All tests passing (frontend + backend)
- [ ] Backward compatible: no breaking API changes

---

## Assumptions & Constraints

| Item | Details |
|------|---------|
| **Node Version** | 18+ (existing requirement) |
| **Browsers** | Chrome, Firefox, Safari (last 2 versions) |
| **DB Schema** | No changes to SQLite structure |
| **CLI** | `konduct start --dashboard` unchanged |
| **User Base** | Single-machine usage (no auth needed yet) |
| **Scope** | Web-only (no desktop app, no Electron) |

---

## Future Enhancements

- **Real-time Updates:** WebSocket for live log streaming
- **Theme Customization:** Allow users to customize colors
- **Export:** Export server configs, logs, reports
- **Hooks System:** Visual editor for pre/post interceptors
- **Analytics:** Charts for tool usage, performance metrics
- **Notifications:** Toast notifications for long-running tasks

---

## Sign-Off

**Stakeholders:**
- [ ] Developer Team
- [ ] Product Owner
- [ ] QA Lead

**Approved by:** (Pending)

**Date Approved:** (Pending)

---

## Appendix: File Templates & Configuration

### Frontend package.json (src/web/client/package.json)

```json
{
  "name": "mcp-konduct-dashboard",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "axios": "^1.6.8"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "@testing-library/react": "^15.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.0",
    "vite": "^5.4.10",
    "vitest": "^4.1.1"
  }
}
```

### Tailwind CSS Configuration (src/web/client/tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',      // Indigo
        'primary-dark': '#4f46e5',
        'primary-light': '#818cf8',
        accent: '#ec4899',       // Pink
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        // Light mode colors
        'light-bg': '#f8fafc',
        'light-surface': '#f1f5f9',
        'light-text': '#0f172a',
        'light-text-secondary': '#475569',
        // Dark mode colors (use as fallback when class-based dark mode)
        'dark-bg': '#0f172a',
        'dark-surface': '#1e293b',
        'dark-text': '#f1f5f9',
        'dark-text-secondary': '#cbd5e1',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in',
        slideIn: 'slideIn 0.3s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
   },
   darkMode: 'class',
   plugins: [],
};
```

### PostCSS Configuration (src/web/client/postcss.config.js)

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### TypeScript Configuration (src/web/client/tsconfig.json)

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "exclude": ["node_modules", "__tests__"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Vite Configuration (src/web/client/vite.config.ts)

```typescript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/web/client',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'terser',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});
```

---

## Appendix: File Templates

### App.tsx Template (Root Component with Context Provider)

```typescript
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppContext, AppContextType } from './context/AppContext';
import { useDarkMode } from './hooks/useDarkMode';
import { useServers } from './hooks/useServers';
import { useTools } from './hooks/useTools';

// Pages
import { Dashboard } from './pages/Dashboard';
import { ServersPage } from './pages/ServersPage';
import { ToolsPage } from './pages/ToolsPage';

// Layout
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

export function App() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { servers, fetchServers } = useServers();
  const { tools, fetchTools } = useTools();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Apply dark mode class to html
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Initial data fetch
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchServers(), fetchTools()])
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const contextValue: AppContextType = {
    servers,
    tools,
    projects: [], // TODO: add useProjects
    logs: [],     // TODO: add useLogs
    isDarkMode,
    sidebarOpen: true,
    loading,
    error,
    fetchServers,
    fetchTools,
    fetchProjects: async () => {}, // TODO
    fetchLogs: async () => {},     // TODO
    toggleDarkMode,
    setSidebarOpen: () => {},      // TODO
    clearError: () => setError(null),
  };

  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        <div className="flex h-screen bg-dark-bg text-dark-text dark:bg-dark-bg dark:text-dark-text">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            <Header onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
            <div className="flex-1 overflow-auto p-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/servers" element={<ServersPage />} />
                <Route path="/tools" element={<ToolsPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </AppContext.Provider>
  );
}

export default App;
```

### React Component Template
```typescript
import { FC } from 'react';

interface Props {
  title: string;
  // ... other props
}

export const MyComponent: FC<Props> = ({ title }) => {
  return (
    <div className="p-4 bg-surface rounded-lg">
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
    </div>
  );
};
```

### Custom Hook Template
```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

export function useMyData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/my-data');
        setData(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, loading, error };
}
```

---

**Document Version:** 1.0  
**Last Updated:** March 26, 2026
