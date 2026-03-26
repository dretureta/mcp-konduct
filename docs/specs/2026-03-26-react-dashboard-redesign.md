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
    ├── index.html               # HTML template (Vite)
    ├── vite.config.ts           # Vite configuration
    ├── tsconfig.json            # TypeScript config (extends root)
    ├── package.json             # Frontend dependencies only
    └── src/web/client.test.tsx  # Component tests
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

**Mechanism:**
1. `useDarkMode()` hook manages state from localStorage
2. Hook provides: `isDarkMode`, `toggleDarkMode()`
3. Theme applied via CSS custom properties (variables)
4. Toggle button in header calls `toggleDarkMode()`
5. Persists to localStorage for user preference

**Example:**
```typescript
// src/web/client/src/hooks/useDarkMode.ts
export function useDarkMode() {
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

  return { isDarkMode, toggleDarkMode };
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

## Development Workflow

### Local Development

```bash
# Terminal 1: Frontend dev server
cd src/web/client
npm install
npm run dev              # Vite server on :5173, HMR enabled

# Terminal 2: Backend dev server
npm run dev start -d     # Hono on :3000, serves static assets
```

**HMR (Hot Module Replacement):** Edit React components → auto-refresh in browser (no page reload)

### Production Build

```bash
npm run build            # Builds both backend + frontend
                         # - tsc compiles src/ → dist/
                         # - vite build compiles React → dist/web/client/

konduct start --dashboard  # Starts Hono, serves React
                           # http://localhost:3000
```

---

## Testing Strategy

### Frontend Testing

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

## Appendix: File Templates

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
