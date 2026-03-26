# Implementation Plan: React Dashboard Redesign

**Project:** mcp-konduct Dashboard Modernization  
**Date Created:** March 26, 2026  
**Spec Reference:** `docs/specs/2026-03-26-react-dashboard-redesign.md`  
**Timeline:** 4 Weeks (Phases 1-4)

---

## Overview

Migrate the mcp-konduct web dashboard from Hono + HTMX + vanilla CSS to a modern React 18 + Vite + Tailwind architecture. This plan breaks down the work into 4 manageable phases, each delivering functional value.

---

## Phase 1: Core UI & Infrastructure (Week 1)

### Objective
Set up React + Vite infrastructure, implement basic layout (Sidebar, Header, Dashboard), and implement dark mode toggle with persistence.

### Deliverables
- [ ] React + Vite project initialized in `src/web/client/`
- [ ] Hono backend refactored to serve React static assets
- [ ] Sidebar component with navigation
- [ ] Header component with dark mode toggle
- [ ] Dashboard page with stats cards grid
- [ ] Dark mode fully functional (localStorage persistence)
- [ ] HMR working for development
- [ ] Project builds and runs without errors

### Tasks

#### 1.1 Setup & Scaffolding
```bash
# Create React + Vite project
cd src/web/
mkdir client
cd client
npm create vite@latest . -- --template react-ts
npm install
```

**Deliverable:** React project structure initialized, dependencies installed

**Dependencies to add:**
- `react-router-dom` (routing)
- `axios` (HTTP client)
- `tailwindcss` (styling)
- `postcss`, `autoprefixer`
- `vitest`, `@testing-library/react` (testing)

**Time estimate:** 1-2 hours

---

#### 1.2 Tailwind CSS Setup
**Files to create/modify:**
- `src/web/client/tailwind.config.js` (copy from spec appendix)
- `src/web/client/postcss.config.js` (copy from spec appendix)
- `src/web/client/src/styles/globals.css` (global Tailwind + base styles)

**Key tasks:**
- [ ] Configure Tailwind with custom colors (Indigo, Pink, etc.)
- [ ] Configure dark mode with `class` strategy
- [ ] Create global CSS with reset and animations
- [ ] Test: `npm run build` succeeds without errors

**Time estimate:** 1 hour

---

#### 1.3 TypeScript & Project Configuration
**Files to create/modify:**
- `src/web/client/tsconfig.json` (copy from spec appendix)
- `src/web/client/vite.config.ts` (copy from spec appendix)
- `src/web/client/src/types/index.ts` (TypeScript interfaces)

**Key tasks:**
- [ ] Set up TypeScript configuration
- [ ] Configure Vite with React plugin + proxy to :3000
- [ ] Create shared type definitions (Server, Tool, Project, etc.)
- [ ] Verify `npm run build` compiles without errors

**Time estimate:** 1.5 hours

---

#### 1.4 Dark Mode Hook & Provider
**Files to create:**
- `src/web/client/src/hooks/useDarkMode.ts`
- `src/web/client/src/context/AppContext.tsx`

**Key implementation:**
```typescript
// useDarkMode.ts
export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme-mode');
    return stored === 'light' ? false : true;
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

**Key tasks:**
- [ ] Implement `useDarkMode()` hook with localStorage
- [ ] Create `AppContext` with proper TypeScript interface
- [ ] Create `AppContext.Provider` wrapper
- [ ] Test dark mode toggle and persistence

**Time estimate:** 2 hours

---

#### 1.5 Sidebar Component
**Files to create:**
- `src/web/client/src/components/Sidebar.tsx`
- `src/web/client/src/styles/sidebar.module.css` (if needed, else use Tailwind classes)

**Key implementation:**
- Fixed left sidebar (280px on desktop)
- Navigation items: Dashboard, Servers, Tools, Projects, Logs, Settings
- Active state indication
- Responsive collapse on mobile

**Mockup reference:** Dashboard mockup at http://localhost:55476/dashboard-mockup.html

**Key tasks:**
- [ ] Create Sidebar with navigation links
- [ ] Style with Tailwind (flex, spacing, colors)
- [ ] Implement active route detection using React Router
- [ ] Test responsive behavior

**Time estimate:** 2-3 hours

---

#### 1.6 Header Component
**Files to create:**
- `src/web/client/src/components/Header.tsx`

**Key features:**
- Title area
- "Add Server" button (primary)
- Dark mode toggle (sun/moon icon, top right)
- Search bar (optional, can defer to Phase 2)

**Key tasks:**
- [ ] Create Header with layout
- [ ] Implement dark mode toggle button
- [ ] Add "Add Server" button (style only, no action yet)
- [ ] Style responsive behavior

**Time estimate:** 1.5-2 hours

---

#### 1.7 Dashboard Page & Stats Cards
**Files to create:**
- `src/web/client/src/pages/Dashboard.tsx`
- `src/web/client/src/components/StatBox.tsx`

**Key implementation:**
- Stats grid: 4 columns on desktop → 1 on mobile
- Cards show: Active Servers, Available Tools, Requests Today, Success Rate
- Mock data initially (will fetch from API in Phase 2)

**Key tasks:**
- [ ] Create `StatBox` component
- [ ] Create `Dashboard` page with stats grid
- [ ] Use mock data for now
- [ ] Test responsive grid layout

**Time estimate:** 2 hours

---

#### 1.8 Root App Component & Routing
**Files to create/modify:**
- `src/web/client/src/App.tsx` (copy template from spec appendix)
- `src/web/client/src/main.tsx`

**Key tasks:**
- [ ] Set up React Router with routes for all 5 pages
- [ ] Wrap app with `AppContext.Provider`
- [ ] Apply dark mode class to `<html>` element
- [ ] Implement basic page stubs (Dashboard, Servers, Tools, Projects, Logs)

**Time estimate:** 2 hours

---

#### 1.9 Hono Backend: Serve React Assets
**Files to modify:**
- `src/web/server.ts` (add static asset serving)

**Key changes:**
```typescript
import { serveStatic } from 'hono/serve-static';

// Serve React build
app.use('/*', serveStatic({
  root: '../dist/web/client'
}));

// Fallback to index.html for SPA
app.get('/', (c) => {
  // Serve index.html
});
```

**Key tasks:**
- [ ] Import Hono's `serveStatic` middleware
- [ ] Configure to serve `dist/web/client` directory
- [ ] Add CORS middleware for dev server (:5173)
- [ ] Test: `konduct start --dashboard` serves React

**Time estimate:** 1.5 hours

---

#### 1.10 Build Pipeline & Testing
**Files to create/modify:**
- Root `package.json` (update build script if needed)
- `src/web/client/package.json` (verify scripts)

**Key tasks:**
- [ ] Verify `npm run build` compiles both backend + frontend
- [ ] Test production build locally: `npm run start -- start --dashboard`
- [ ] Verify assets load correctly
- [ ] Check for console errors or warnings

**Time estimate:** 1 hour

---

### Testing for Phase 1
- [ ] Manual: Sidebar navigation works, routes change
- [ ] Manual: Dark mode toggle persists across page reload
- [ ] Manual: Dashboard stats cards display
- [ ] Manual: Responsive layout on mobile (320px, 768px, 1920px)
- [ ] Manual: No console errors
- [ ] Manual: HMR works (edit component, see instant refresh)

**Estimated Time:** 1 hour

---

### Phase 1 Success Criteria
- Dashboard loads without errors
- Dark mode toggle works + persists
- Sidebar navigation functional
- Responsive design confirmed
- Build succeeds
- Zero console errors
- HMR working for development

**Total Phase 1 Effort:** 5-6 days (40-48 hours)

---

## Phase 2: Server Management (Week 2)

### Objective
Implement full CRUD operations for servers: list, create, edit, delete. Connect to existing Hono backend API.

### Deliverables
- [ ] Servers page with server cards grid
- [ ] Add Server modal/form
- [ ] Edit Server modal/form
- [ ] Delete confirmation + deletion
- [ ] Server detail page
- [ ] `useServers()` hook with API integration
- [ ] Error handling & loading states
- [ ] All server operations working end-to-end

### Tasks

#### 2.1 Create useServers() Hook
**Files to create:**
- `src/web/client/src/hooks/useServers.ts`
- `src/web/client/src/hooks/useFetch.ts` (generic fetch wrapper)
- `src/web/client/src/utils/api.ts` (Axios instance)

**Key implementation:**
```typescript
// useFetch.ts - Generic wrapper
export function useFetch<T>(url: string, method: 'GET' | 'POST' = 'GET') {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (body?: unknown) => {
    setLoading(true);
    try {
      const res = await axiosInstance({ method, url, data: body });
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

// useServers.ts
export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const { execute, loading, error } = useFetch<{ servers: Server[] }>('/api/servers');

  const fetchServers = async () => {
    const res = await execute();
    if (res) setServers(res.servers);
  };

  const addServer = async (config: Omit<Server, 'id' | 'createdAt' | 'updatedAt'>) => {
    await axiosInstance.post('/api/servers', config);
    await fetchServers();
  };

  const updateServer = async (id: string, partial: Partial<Server>) => {
    await axiosInstance.post(`/api/servers/${id}/update`, partial);
    await fetchServers();
  };

  const deleteServer = async (id: string) => {
    await axiosInstance.delete(`/api/servers/${id}`);
    await fetchServers();
  };

  return { servers, fetchServers, addServer, updateServer, deleteServer, loading, error };
}
```

**Time estimate:** 3-4 hours

---

#### 2.2 Create ServerCard Component
**Files to create:**
- `src/web/client/src/components/ServerCard.tsx`

**Key features:**
- Display server name, transport, tool count, status
- Action buttons: Edit, View Tools, Delete
- Styling with Tailwind (card, hover effect, badges)

**Time estimate:** 2 hours

---

#### 2.3 Create Servers Page
**Files to create:**
- `src/web/client/src/pages/ServersPage.tsx`

**Key features:**
- Server cards grid (3 columns → 1 on mobile)
- "Add Server" button at top
- Loading state (skeleton loaders)
- Empty state ("No servers")
- Error handling

**Time estimate:** 2-3 hours

---

#### 2.4 Create Modal Component
**Files to create:**
- `src/web/client/src/components/Modal.tsx`

**Key features:**
- Reusable modal wrapper
- Title, content, footer
- Close button (X)
- Overlay with click-to-close

**Time estimate:** 1-2 hours

---

#### 2.5 Create Add Server Form
**Files to create:**
- `src/web/client/src/components/AddServerForm.tsx`

**Key fields:**
- Name (required)
- Transport type (dropdown: stdio, sse, streamable-http)
- Command (for stdio)
- Arguments (for stdio)
- URL (for sse/http)
- Environment variables (optional, JSON)

**Key tasks:**
- [ ] Create form with validation
- [ ] Submit to `/api/servers`
- [ ] Show loading state during submit
- [ ] Close modal on success
- [ ] Display error message on failure

**Time estimate:** 3-4 hours

---

#### 2.6 Create Edit Server Form
**Files to create:**
- `src/web/client/src/components/EditServerForm.tsx`

**Key tasks:**
- [ ] Pre-fill form with server data
- [ ] Submit to `/api/servers/:id/update`
- [ ] Validation same as Add form
- [ ] Success: close modal, refresh list

**Time estimate:** 2-3 hours

---

#### 2.7 Create Delete Confirmation
**Files to create:**
- `src/web/client/src/components/DeleteConfirmation.tsx`

**Key features:**
- Warning message
- "Delete" and "Cancel" buttons
- Submit to `/api/servers/:id`
- Handle loading & errors

**Time estimate:** 1-2 hours

---

#### 2.8 Update AppContext
**Files to modify:**
- `src/web/client/src/context/AppContext.tsx`

**Key changes:**
- Add `fetchServers`, `addServer`, `updateServer`, `deleteServer` dispatch functions
- Initialize servers from hook on mount
- Store servers in context

**Time estimate:** 1 hour

---

#### 2.9 Update Dashboard with Real Data
**Files to modify:**
- `src/web/client/src/pages/Dashboard.tsx`

**Key tasks:**
- [ ] Read `servers` from AppContext
- [ ] Display real active server count
- [ ] Display real tool count
- [ ] Keep stats card grid

**Time estimate:** 1 hour

---

### Testing for Phase 2
- [ ] Manual: List servers from API
- [ ] Manual: Add server → appears in list
- [ ] Manual: Edit server → updates list
- [ ] Manual: Delete server → removed from list
- [ ] Manual: Form validation (required fields)
- [ ] Manual: Error handling (network error, invalid input)
- [ ] Manual: Loading states during API calls
- [ ] Unit test: `useServers()` hook
- [ ] Unit test: ServerCard component

**Estimated Time:** 2-3 hours

---

### Phase 2 Success Criteria
- All CRUD operations working
- Server list displays real data from backend
- Forms validate input
- Error messages displayed
- Loading states visible
- No console errors

**Total Phase 2 Effort:** 4-5 days (32-40 hours)

---

## Phase 3: Tools & Projects (Week 3)

### Objective
Implement Tool discovery, execution, and Project management pages.

### Key Tasks
- [ ] Create `useTools()` hook
- [ ] Create ToolsPage with tool cards and categories
- [ ] Implement tool execution modal
- [ ] Create tool search/filter
- [ ] Create ProjectsPage with project CRUD
- [ ] Integrate projects into server management
- [ ] Create LogsPage with request history

### Estimated Effort
- Tools page + hooks: 4-5 days
- Projects page + CRUD: 3-4 days
- Logs page: 2-3 days

**Total Phase 3 Effort:** 4-5 days (32-40 hours)

---

## Phase 4: Polish & Testing (Week 4)

### Objective
Performance optimization, accessibility, testing, and QA.

### Key Tasks
- [ ] Code splitting for pages (lazy load routes)
- [ ] Bundle size optimization
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Component tests (80%+ coverage)
- [ ] E2E tests with Playwright (optional)
- [ ] Performance optimization (Lighthouse)
- [ ] Final QA and bug fixes

### Estimated Effort
- Testing & QA: 3-4 days
- Performance & optimization: 2-3 days
- Accessibility: 1-2 days

**Total Phase 4 Effort:** 3-4 days (24-32 hours)

---

## Critical Path & Dependencies

```
Phase 1 (Infrastructure) → Phase 2 (Server CRUD) → Phase 3 (Tools/Projects) → Phase 4 (Polish)
```

**No parallel work recommended** — each phase depends on previous foundation.

---

## Development Environment Setup

### Prerequisites
- Node 18+ (already installed)
- npm or yarn
- Git

### Initial Setup
```bash
cd /home/work/DevZone/MCPs/mcp-konduct

# Install root dependencies
npm install

# Install frontend dependencies
cd src/web/client
npm install

# Build everything
npm run build
```

### Development Workflow
```bash
# Terminal 1: Frontend dev server
cd src/web/client
npm run dev

# Terminal 2: Backend dev server
npm run dev start -d

# Visit http://localhost:3000 (backend)
# Or     http://localhost:5173 (Vite with HMR)
```

---

## Deployment & Build Process

### Build for Production
```bash
npm run build  # Compiles TypeScript + Vite bundle
```

### Run Production Dashboard
```bash
konduct start --dashboard
# Opens http://localhost:3000
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Vite config issues | Use provided config template; test early in Phase 1 |
| Tailwind CSS variables | Use explicit hex values (not CSS vars) as documented |
| CORS errors in dev | Configure Hono CORS middleware per spec |
| Large bundle size | Code splitting + tree shaking; Phase 4 optimization |
| Type mismatches | Keep TypeScript strict mode; run `tsc` frequently |
| React Context performance | Plan upgrade to TanStack Query if needed |

---

## Success Metrics

**By End of Phase 1:**
- Dashboard loads without errors
- Dark mode working
- Build succeeds
- HMR functional

**By End of Phase 2:**
- All server CRUD operations working
- Real data from API displayed
- Forms validate correctly

**By End of Phase 3:**
- Tools page functional
- Projects page functional
- Logs page functional
- All 6 features working

**By End of Phase 4:**
- 80%+ test coverage
- Lighthouse score > 90 (Performance)
- Zero console errors
- WCAG 2.1 AA accessibility

---

## Tracking & Checkpoints

### Weekly Checkpoints
- **EOW1 (Phase 1):** Demo working dashboard with dark mode
- **EOW2 (Phase 2):** Demo server CRUD operations
- **EOW3 (Phase 3):** Demo tools + projects pages
- **EOW4 (Phase 4):** Final QA, testing complete, ready for release

### Daily Standup Items
- What was completed today
- What's blocked (if anything)
- Plan for tomorrow

---

## Team Communication

- **Issues:** Create GitHub issues for bugs/tasks
- **PR Reviews:** Code review before merging
- **Testing:** Manual testing + automated tests before marking complete

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-26 | Initial implementation plan from spec |

---

**Implementation Plan Approved:** (Pending)  
**Lead Developer:** (TBD)  
**Project Manager:** (TBD)

---

**Next Step:** Begin Phase 1 implementation. Start with task 1.1 (React + Vite setup).
