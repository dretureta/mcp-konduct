# Dashboard & Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the static dashboard into a functional, real-time interface and implement a global "Add Server" modal accessible from the header.

**Architecture:** Extend `AppContext` with global UI state (modals) and data fetching triggers. Implement an atomic `AddServerModal` component. Update `Dashboard` and `Header` to consume real-time logs and server data.

**Tech Stack:** React 18, Tailwind CSS, Lucide Icons, Axios.

---

### Task 1: Update AppContext with UI State and Log Fetching

**Files:**
- Modify: `src/web/client/src/types/index.ts`
- Modify: `src/web/client/src/context/AppContext.tsx`

- [ ] **Step 1: Add modal types**
Update `src/web/client/src/types/index.ts`:
```typescript
export interface AppContextType {
  // ... existing
  isAddServerModalOpen: boolean;
  setIsAddServerModalOpen: (open: boolean) => void;
}
```

- [ ] **Step 2: Implement state in AppContext**
Update `src/web/client/src/context/AppContext.tsx`:
```typescript
const [isAddServerModalOpen, setIsAddServerModalOpen] = useState(false);
// ... pass to Provider value
```

- [ ] **Step 3: Commit**
```bash
git add src/web/client/src/types/index.ts src/web/client/src/context/AppContext.tsx
git commit -m "feat(context): add global modal state"
```

---

### Task 2: Create AddServerModal Component

**Files:**
- Create: `src/web/client/src/components/servers/AddServerModal.tsx`

- [ ] **Step 1: Implement Modal UI and Form**
```tsx
import React, { useState } from 'react';
import { X, Server, Globe, Terminal, Cpu } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Input } from '../common/Input';

export const AddServerModal: React.FC = () => {
  const { isAddServerModalOpen, setIsAddServerModalOpen, addServer } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    transport: 'stdio' as 'stdio' | 'sse',
    command: '',
    url: '',
    args: ''
  });

  if (!isAddServerModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const args = formData.args.split(' ').filter(a => a.trim() !== '');
    await addServer({
      name: formData.name,
      transport: formData.transport,
      command: formData.transport === 'stdio' ? formData.command : undefined,
      url: formData.transport === 'sse' ? formData.url : undefined,
      args: formData.transport === 'stdio' ? args : undefined
    });
    setIsAddServerModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Add New Server</h3>
            <button type="button" onClick={() => setIsAddServerModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4">
            <Input label="Server Name" placeholder="e.g., Python Filesystem" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={formData.transport === 'stdio' ? 'primary' : 'secondary'} onClick={() => setFormData({...formData, transport: 'stdio'})} className="w-full">STDIO</Button>
              <Button type="button" variant={formData.transport === 'sse' ? 'primary' : 'secondary'} onClick={() => setFormData({...formData, transport: 'sse'})} className="w-full">SSE</Button>
            </div>
            {formData.transport === 'stdio' ? (
              <>
                <Input label="Command" placeholder="npx, python3, etc." value={formData.command} onChange={e => setFormData({...formData, command: e.target.value})} required />
                <Input label="Arguments" placeholder="--port 8080 (space separated)" value={formData.args} onChange={e => setFormData({...formData, args: e.target.value})} />
              </>
            ) : (
              <Input label="URL" placeholder="https://..." value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required />
            )}
          </div>
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsAddServerModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Server</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Commit**
```bash
git add src/web/client/src/components/servers/AddServerModal.tsx
git commit -m "feat(ui): implement AddServerModal"
```

---

### Task 3: Integrate Modal and Update Header

**Files:**
- Modify: `src/web/client/src/App.tsx`
- Modify: `src/web/client/src/components/layout/Header.tsx`

- [ ] **Step 1: Add Modal to App Root**
```tsx
// src/web/client/src/App.tsx
import { AddServerModal } from './components/servers/AddServerModal';
// ... inside Providers
<AddServerModal />
```

- [ ] **Step 2: Connect Header Buttons**
```tsx
// src/web/client/src/components/layout/Header.tsx
const { setIsAddServerModalOpen, logs } = useAppContext();
const errorCount = logs.filter(l => Number(l.success) === 0).length;
// ... update Add Server onClick
<button onClick={() => setIsAddServerModalOpen(true)}>Add Server</button>
// ... update Notification badge with {errorCount > 0 && <span>{errorCount}</span>}
```

- [ ] **Step 3: Commit**
```bash
git add src/web/client/src/App.tsx src/web/client/src/components/layout/Header.tsx
git commit -m "feat(header): connect add server and notifications"
```

---

### Task 4: Connect Dashboard to Real Data

**Files:**
- Modify: `src/web/client/src/pages/Dashboard.tsx`

- [ ] **Step 1: Fetch Logs on Mount**
```tsx
useEffect(() => {
  fetchLogs({ limit: 5 });
}, []);
```

- [ ] **Step 2: Replace Static Activity**
Map through `logs.slice(0, 5)` and use `useNavigate('/logs')` for the button.

- [ ] **Step 3: Commit**
```bash
git add src/web/client/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): show real activity"
```
