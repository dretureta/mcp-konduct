# Design Spec: Dashboard & Header Functionality Fixes
**Date:** 2026-03-25
**Topic:** Real Activity, Global Add Server Modal, and Header Navigation

## 1. Context & Goals
The current dashboard displays static data in "Recent Activity" and several header buttons (Search, Notifications, Add Server) are non-functional. The goal is to connect these to the application state and the real backend API.

## 2. Proposed Changes

### A. Global State (AppContext.tsx)
- Add `isAddServerModalOpen` (boolean) and `setIsAddServerModalOpen` (function) to the context.
- This allows the `Header` to trigger the modal regardless of the current route.

### B. Header Functionality (Header.tsx)
- **Add Server:** Connect the "Add Server" button to `setIsAddServerModalOpen(true)`.
- **Search:** Implement a basic filter logic. While typing, it will search through `servers` and `tools` in the context.
- **Notifications:** Change the static dot to a badge showing the count of recent error logs (last 1 hour).
- **Navigation:** Ensure links use `useNavigate` or `NavLink` for SPA behavior.

### C. Add Server Modal (AddServerModal.tsx)
- Create a new component in `src/web/client/src/components/servers/`.
- It will contain a form to create a new MCP server (Name, Transport, Command/URL, Args).
- On success, it calls `addServer` from `AppContext` and closes the modal.

### D. Dashboard Real Activity (Dashboard.tsx)
- **Data Fetching:** Call `fetchLogs({ limit: 5 })` on component mount.
- **Recent Activity Section:**
    - Replace static list with `logs.slice(0, 5)`.
    - Map icons: `CheckCircle2` for success, `AlertCircle` for errors.
    - Format timestamp to relative time (e.g., "5m ago").
- **Audit Log Button:** Connect to `useNavigate('/logs')`.

## 3. Component Structure
- `App.tsx`: Include the `AddServerModal` at the root level so it's globally available.
- `Header.tsx`: Update to use `useAppContext` for modal control and search.
- `Dashboard.tsx`: Update to use `useAppContext` for logs and navigation.

## 4. Verification Plan
- **Add Server:** Open modal from Dashboard, Servers, and Logs pages. Submit a new server and verify it appears in the list.
- **Recent Activity:** Execute a tool call (via CLI or API) and verify it appears at the top of the Dashboard activity list.
- **Navigation:** Click "View Audit Log" and verify it navigates to `/logs`.
- **Search:** Type a server name in the header and verify it filters/highlights results.
