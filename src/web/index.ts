import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { registry } from '../core/registry.js';
import { getDbPath } from '../config/db.js';
import { db } from '../config/db.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

const CSS = `
:root {
  --bg: #0d0d0f;
  --surface: #13131a;
  --surface-hover: #1a1a24;
  --primary: #7c3aed;
  --primary-dim: #6d28d9;
  --accent: #06b6d4;
  --success: #10b981;
  --error: #dc2626;
  --warning: #d97706;
  --text: #f5f5f5;
  --text-dim: #9ca3af;
  --border: #1f1f26;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', 'Trebuchet MS', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.65;
}

html {
  scroll-behavior: smooth;
}

a {
  color: var(--primary);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 3rem 2rem;
}

header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 1.5rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
}

.logo {
  font-family: 'Georgia', 'Garamond', serif;
  font-size: 1.8rem;
  font-weight: 400;
  color: var(--primary);
  letter-spacing: -0.02em;
}

nav {
  display: flex;
  gap: 2.5rem;
}

nav a {
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
  color: var(--text-dim);
  position: relative;
  font-weight: 500;
}

nav a::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary);
  transition: width 0.3s ease;
}

nav a:hover::after,
nav a.active::after {
  width: 100%;
}

nav a:hover,
nav a.active {
  color: var(--primary);
}

main {
  animation: subtle-fade 0.4s ease-out;
}

@keyframes subtle-fade {
  from { opacity: 0.95; }
  to { opacity: 1; }
}

.card {
  background: var(--surface);
  border-radius: 0.5rem;
  padding: 2.5rem;
  margin-bottom: 2rem;
  border-left: 4px solid var(--primary);
  transition: all 0.3s ease;
}

.card:hover {
  border-left-color: var(--accent);
}

.divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--border), transparent);
  margin: 2rem 0;
}

h1, h2, h3 {
  font-family: 'Georgia', 'Garamond', serif;
  font-weight: 400;
  letter-spacing: -0.01em;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 1.8rem;
}

h3 {
  font-size: 1.3rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.stat {
  background: var(--surface);
  padding: 2rem;
  border-radius: 0.5rem;
  border-left: 4px solid var(--primary);
  transition: all 0.3s ease;
}

.stat:hover {
  border-left-color: var(--accent);
  transform: translateY(-2px);
}

.stat-value {
  font-size: 3rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-dim);
}

table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
}

thead {
  border-bottom: 1px solid var(--border);
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 1px;
  font-weight: 600;
}

th, td {
  padding: 1.2rem 1rem;
  text-align: left;
}

tbody tr {
  border-bottom: 1px solid rgba(31, 31, 38, 0.5);
  transition: background-color 0.2s ease;
}

tbody tr:hover {
  background: var(--surface-hover);
}

.btn {
  display: inline-block;
  padding: 0.9rem 1.8rem;
  border-radius: 0.375rem;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  transition: left 0.4s ease;
  z-index: 0;
}

.btn:hover::before {
  left: 100%;
}

.btn-primary {
  background: var(--primary);
  color: white;
  position: relative;
  z-index: 1;
}

.btn-primary:hover {
  background: var(--primary-dim);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(124, 58, 237, 0.3);
}

.btn-danger {
  background: var(--error);
  color: white;
  position: relative;
  z-index: 1;
}

.btn-danger:hover {
  background: #b91c1c;
  transform: translateY(-2px);
}

.btn-success {
  background: var(--success);
  color: white;
  position: relative;
  z-index: 1;
}

.btn-success:hover {
  background: #059669;
  transform: translateY(-2px);
}

.btn-sm {
  padding: 0.5rem 1.2rem;
  font-size: 0.8rem;
}

.badge {
  display: inline-block;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.badge-success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.badge-error {
  background: rgba(220, 38, 38, 0.15);
  color: var(--error);
  border: 1px solid rgba(220, 38, 38, 0.3);
}

.badge-warning {
  background: rgba(217, 119, 6, 0.15);
  color: var(--warning);
  border: 1px solid rgba(217, 119, 6, 0.3);
}

.form-group {
  margin-bottom: 2rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.8rem;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  color: var(--text);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 1rem;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  border-radius: 0.375rem;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  background: var(--surface);
}

.form-help {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-top: 0.4rem;
}

.actions {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.text-dim {
  color: var(--text-dim);
}

.text-success {
  color: var(--success);
}

.text-error {
  color: var(--error);
}

.page-title {
  margin-bottom: 2rem;
}

.empty {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-dim);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.back-link:hover {
  color: var(--primary);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

@media (max-width: 768px) {
  .container {
    padding: 1.5rem 1rem;
  }
  
  header .container {
    padding: 0 1rem;
    flex-direction: column;
    gap: 1rem;
  }
  
  nav {
    gap: 1rem;
  }
  
  nav a {
    font-size: 0.7rem;
    letter-spacing: 0;
  }
  
  .stats {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .stat-value {
    font-size: 2rem;
  }
  
  table {
    font-size: 0.85rem;
  }
  
  th, td {
    padding: 0.8rem 0.5rem;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .actions {
    width: 100%;
  }
  
  .actions a,
  .actions button {
    flex: 1;
    text-align: center;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
`;

function layout(title: string, content: string, nav: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - MCP Konduct</title>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>${CSS}</style>
</head>
<body hx-boost="true">
  <header>
    <div class="container">
      <a href="/dashboard" class="logo">🔌 MCP Konduct</a>
      <nav>
        <a href="/dashboard" class="${nav === 'dashboard' ? 'active' : ''}">Dashboard</a>
        <a href="/servers" class="${nav === 'servers' ? 'active' : ''}">Servers</a>
        <a href="/tools" class="${nav === 'tools' ? 'active' : ''}">Tools</a>
        <a href="/projects" class="${nav === 'projects' ? 'active' : ''}">Projects</a>
        <a href="/logs" class="${nav === 'logs' ? 'active' : ''}">Logs</a>
      </nav>
    </div>
  </header>
  <main class="container">
    ${content}
  </main>
</body>
</html>`;
}

app.get('/', (c) => c.redirect('/dashboard'));

app.get('/dashboard', (c) => {
  const servers = registry.listServers();
  const enabledServers = servers.filter(s => s.enabled);
  const tools = registry.listAllTools();
  const enabledTools = tools.filter(t => t.enabled);
  const recentLogs = db.prepare('SELECT * FROM request_logs ORDER BY timestamp DESC LIMIT 5').all() as Record<string, unknown>[];

  const logsHtml = recentLogs.length === 0 
    ? '<p class="text-dim">No recent activity</p>'
    : `<table>
        <thead>
          <tr><th>Time</th><th>Server</th><th>Tool</th><th>Duration</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${recentLogs.map(log => `
            <tr>
              <td class="text-dim">${String(log.timestamp).substring(0, 19)}</td>
              <td>${String(log.server_id).substring(0, 8)}</td>
              <td>${String(log.tool_name)}</td>
              <td>${log.duration_ms}ms</td>
              <td><span class="badge ${Number(log.success) === 1 ? 'badge-success' : 'badge-error'}">${Number(log.success) === 1 ? 'success' : 'error'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

  const content = `
    <h1 class="page-title">Dashboard</h1>
    <div class="stats">
      <div class="stat"><div class="stat-value">${servers.length}</div><div class="stat-label">Total Servers</div></div>
      <div class="stat"><div class="stat-value">${enabledServers.length}</div><div class="stat-label">Enabled</div></div>
      <div class="stat"><div class="stat-value">${tools.length}</div><div class="stat-label">Total Tools</div></div>
      <div class="stat"><div class="stat-value">${enabledTools.length}</div><div class="stat-label">Tools Enabled</div></div>
    </div>
    <div class="card">
      <h2>Recent Activity</h2>
      <div class="divider"></div>
      ${logsHtml}
    </div>
    <div class="card">
      <h2>Quick Actions</h2>
      <div class="divider"></div>
      <div class="actions">
        <a href="/servers/new" class="btn btn-primary">Add Server</a>
        <a href="/servers" class="btn">View All Servers</a>
      </div>
    </div>`;
  
  return c.html(layout('Dashboard', content, 'dashboard'));
});

app.get('/servers', (c) => {
  const servers = registry.listServers();
  
  const rowsHtml = servers.map(server => {
    const serverTools = registry.getServerTools(server.id);
    return `<tr>
      <td><a href="/servers/${server.id}">${server.name}</a></td>
      <td class="text-dim">${server.transport}</td>
      <td><span class="badge ${server.enabled ? 'badge-success' : 'badge-error'}">${server.enabled ? 'enabled' : 'disabled'}</span></td>
      <td>${serverTools.filter(t => t.enabled).length}/${serverTools.length}</td>
      <td>
        <div class="actions">
          <a href="/servers/${server.id}" class="btn btn-sm">View</a>
          <a href="/servers/${server.id}/edit" class="btn btn-sm">Edit</a>
          <form method="POST" action="/api/servers/${server.id}/toggle" style="display: inline;">
            <button type="submit" class="btn btn-sm ${server.enabled ? '' : 'btn-success'}">${server.enabled ? 'Disable' : 'Enable'}</button>
          </form>
        </div>
      </td>
    </tr>`;
  }).join('');

  const content = servers.length === 0
    ? `<div class="card empty"><p>No servers configured</p><a href="/servers/new" class="btn btn-primary" style="margin-top: 15px;">Add Your First Server</a></div>`
    : `<div class="card"><table><thead><tr><th>Name</th><th>Transport</th><th>Status</th><th>Tools</th><th>Actions</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
  
  return c.html(layout('Servers', `
    <div class="page-header">
      <h1>Servers</h1>
      <a href="/servers/new" class="btn btn-primary">Add Server</a>
    </div>
    ${content}
  `, 'servers'));
});

app.get('/servers/new', (c) => {
  const content = `
    <a href="/servers" class="back-link">← Back to Servers</a>
    <h1 class="page-title">Add Server</h1>
    <div class="card">
      <form method="POST" action="/api/servers">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Server Name</label>
            <input type="text" id="name" name="name" required placeholder="e.g., filesystem, web-api">
            <p class="form-help">A descriptive name for this server</p>
          </div>
          <div class="form-group">
            <label for="transport">Transport Type</label>
            <select id="transport" name="transport">
              <option value="stdio">Standard I/O (stdio)</option>
              <option value="sse">Server-Sent Events (SSE)</option>
              <option value="streamable-http">Streamable HTTP</option>
            </select>
            <p class="form-help">How the server communicates</p>
          </div>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label for="command">Command <span class="text-dim">(for stdio)</span></label>
          <input type="text" id="command" name="command" placeholder="e.g., npx">
          <p class="form-help">The command to execute the server</p>
        </div>
        <div class="form-group">
          <label for="args">Arguments <span class="text-dim">(comma-separated)</span></label>
          <input type="text" id="args" name="args" placeholder="e.g., -y,@modelcontextprotocol/server-filesystem,/tmp">
          <p class="form-help">Command line arguments for the server</p>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label for="url">URL <span class="text-dim">(for SSE/HTTP)</span></label>
          <input type="url" id="url" name="url" placeholder="http://localhost:3000">
          <p class="form-help">Server endpoint URL</p>
        </div>
        <div class="actions">
          <button type="submit" class="btn btn-primary">Create Server</button>
          <a href="/servers" class="btn">Cancel</a>
        </div>
      </form>
    </div>`;
  
  return c.html(layout('Add Server', content, 'servers'));
});

app.get('/servers/:id', (c) => {
  const id = c.req.param('id');
  const server = registry.getServer(id);
  
  if (!server) {
    return c.html(layout('Not Found', '<div class="card"><p class="text-error">Server not found</p></div>'));
  }
  
  const tools = registry.getServerTools(id);
  
  const toolsHtml = tools.length === 0
    ? '<p class="text-dim">No tools discovered yet. Click "Discover Tools" to find available tools.</p>'
    : `<table><thead><tr><th>Tool Name</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        ${tools.map(tool => `<tr>
          <td>${tool.toolName}</td>
          <td><span class="badge ${tool.enabled ? 'badge-success' : 'badge-error'}">${tool.enabled ? 'enabled' : 'disabled'}</span></td>
          <td><form method="POST" action="/api/tools/${tool.id}/toggle" style="display: inline;"><button type="submit" class="btn btn-sm">${tool.enabled ? 'Disable' : 'Enable'}</button></form></td>
        </tr>`).join('')}
      </tbody></table>`;

  const content = `
    <a href="/servers" class="back-link">← Back to Servers</a>
    <div class="page-header">
      <h1>${server.name}</h1>
      <form method="POST" action="/api/servers/${server.id}/discover"><button type="submit" class="btn btn-primary">Discover Tools</button></form>
    </div>
    <div class="card">
      <h2>Server Details</h2>
      <div class="divider"></div>
      <table>
        <tr><th>ID</th><td class="text-dim">${server.id}</td></tr>
        <tr><th>Transport</th><td>${server.transport}</td></tr>
        <tr><th>Command</th><td class="text-dim">${server.command || '-'}</td></tr>
        <tr><th>Args</th><td class="text-dim">${server.args ? server.args.join(' ') : '-'}</td></tr>
        <tr><th>URL</th><td class="text-dim">${server.url || '-'}</td></tr>
        <tr><th>Status</th><td><span class="badge ${server.enabled ? 'badge-success' : 'badge-error'}">${server.enabled ? 'enabled' : 'disabled'}</span></td></tr>
      </table>
      <div style="margin-top: 2rem;">
        <a href="/servers/${server.id}/edit" class="btn btn-primary">Edit Server</a>
      </div>
    </div>
    <div class="card">
      <h2>Tools (${tools.filter(t => t.enabled).length}/${tools.length} enabled)</h2>
      <div class="divider"></div>
      ${toolsHtml}
    </div>
    <div class="card" style="border-left-color: var(--error);">
      <form method="POST" action="/api/servers/${server.id}/delete" onsubmit="return confirm('Are you sure you want to delete this server?')">
        <button type="submit" class="btn btn-danger">Delete Server</button>
      </form>
    </div>`;
  
  return c.html(layout(server.name, content, 'servers'));
});

app.get('/servers/:id/edit', (c) => {
  const id = c.req.param('id');
  const server = registry.getServer(id);
  
  if (!server) {
    return c.html(layout('Not Found', '<div class="card"><p class="text-error">Server not found</p></div>'));
  }
  
  const content = `
    <a href="/servers/${id}" class="back-link">← Back to Server</a>
    <h1 class="page-title">Edit Server</h1>
    <div class="card">
      <form method="POST" action="/api/servers/${id}/update">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Server Name</label>
            <input type="text" id="name" name="name" required placeholder="e.g., filesystem" value="${server.name}">
            <p class="form-help">A descriptive name for this server</p>
          </div>
          <div class="form-group">
            <label for="transport">Transport Type</label>
            <select id="transport" name="transport">
              <option value="stdio" ${server.transport === 'stdio' ? 'selected' : ''}>Standard I/O (stdio)</option>
              <option value="sse" ${server.transport === 'sse' ? 'selected' : ''}>Server-Sent Events (SSE)</option>
              <option value="streamable-http" ${server.transport === 'streamable-http' ? 'selected' : ''}>Streamable HTTP</option>
            </select>
            <p class="form-help">How the server communicates</p>
          </div>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label for="command">Command <span class="text-dim">(for stdio)</span></label>
          <input type="text" id="command" name="command" placeholder="e.g., npx" value="${server.command || ''}">
          <p class="form-help">The command to execute the server</p>
        </div>
        <div class="form-group">
          <label for="args">Arguments <span class="text-dim">(comma-separated)</span></label>
          <input type="text" id="args" name="args" placeholder="e.g., -y,@modelcontextprotocol/server-filesystem,/tmp" value="${server.args ? server.args.join(',') : ''}">
          <p class="form-help">Command line arguments for the server</p>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label for="url">URL <span class="text-dim">(for SSE/HTTP)</span></label>
          <input type="url" id="url" name="url" placeholder="http://localhost:3000" value="${server.url || ''}">
          <p class="form-help">Server endpoint URL</p>
        </div>
        <div class="actions">
          <button type="submit" class="btn btn-primary">Update Server</button>
          <a href="/servers/${id}" class="btn">Cancel</a>
        </div>
      </form>
    </div>`;
  
  return c.html(layout(`Edit ${server.name}`, content, 'servers'));
});

app.get('/tools', (c) => {
  const tools = registry.listAllTools();
  const servers = registry.listServers();
  const serverMap = new Map(servers.map(s => [s.id, s.name]));
  
  const rowsHtml = tools.map(tool => `<tr>
    <td>${tool.toolName}</td>
    <td class="text-dim">${serverMap.get(tool.serverId) || tool.serverId.substring(0, 8)}</td>
    <td><span class="badge ${tool.enabled ? 'badge-success' : 'badge-error'}">${tool.enabled ? 'enabled' : 'disabled'}</span></td>
    <td><form method="POST" action="/api/tools/${tool.id}/toggle" style="display: inline;"><button type="submit" class="btn btn-sm">${tool.enabled ? 'Disable' : 'Enable'}</button></form></td>
  </tr>`).join('');

  const content = tools.length === 0
    ? '<div class="card empty"><p>No tools discovered yet</p><a href="/servers" class="btn btn-primary" style="margin-top: 15px;">Go to Servers</a></div>'
    : `<div class="card"><table><thead><tr><th>Tool Name</th><th>Server</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
  
  return c.html(layout('Tools', `<h1 class="page-title">Tools</h1>${content}`, 'tools'));
});

app.get('/projects', (c) => {
  const projects = registry.listProjects();
  const servers = registry.listServers();
  
  const projectsHtml = projects.length === 0
    ? '<div class="card empty"><p>No projects created yet</p></div>'
    : projects.map(project => {
      const rows = db.prepare('SELECT * FROM project_servers WHERE project_id = ?').all(project.id) as Record<string, unknown>[];
      const count = rows.length;
      return `<div class="card">
        <div class="page-header">
          <h2>${project.name}</h2>
          <form method="POST" action="/api/projects/${project.id}/delete" style="display: inline;"><button type="submit" class="btn btn-sm btn-danger">Delete</button></form>
        </div>
        <p class="text-dim">${project.description || 'No description'}</p>
        <p style="margin-top: 10px;">${count} servers</p>
      </div>`;
    }).join('');

  const content = `
    <div class="page-header">
      <h1>Projects</h1>
      <form method="POST" action="/api/projects" style="display: flex; gap: 10px;">
        <input type="text" name="name" placeholder="Project name" required style="padding: 0.9rem 1.8rem; border-radius: 0.375rem; border: 1px solid var(--border); background: var(--bg); color: var(--text); min-width: 250px;">
        <button type="submit" class="btn btn-primary">Create</button>
      </form>
    </div>
    ${projectsHtml}`;
  
  return c.html(layout('Projects', content, 'projects'));
});

app.get('/logs', (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const serverFilter = c.req.query('server');
  const errorFilter = c.req.query('error');
  
  let query = 'SELECT * FROM request_logs';
  const params: unknown[] = [];
  const conditions: string[] = [];
  
  if (serverFilter) { conditions.push('server_id = ?'); params.push(serverFilter); }
  if (errorFilter) { conditions.push('success = 0'); }
  if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  
  const logs = db.prepare(query).all(...params) as Record<string, unknown>[];
  const servers = registry.listServers();
  const serverMap = new Map(servers.map(s => [s.id, s.name]));
  
  const rowsHtml = logs.map(log => `<tr>
    <td class="text-dim">${String(log.timestamp).substring(0, 19)}</td>
    <td>${serverMap.get(String(log.server_id)) || String(log.server_id).substring(0, 8)}</td>
    <td>${String(log.tool_name)}</td>
    <td>${log.duration_ms}ms</td>
    <td><span class="badge ${Number(log.success) === 1 ? 'badge-success' : 'badge-error'}">${Number(log.success) === 1 ? 'success' : 'error'}</span></td>
  </tr>`).join('');

  const content = `
    <h1 class="page-title">Request Logs</h1>
    <div class="card">
      <form method="GET" style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
        <label class="text-dim" style="font-weight: 600;">Filter:</label>
        <select name="server" style="padding: 0.9rem 1.8rem; border-radius: 0.375rem; border: 1px solid var(--border); background: var(--bg); color: var(--text); min-width: 200px;">
          <option value="">All servers</option>
          ${servers.map(s => `<option value="${s.id}" ${serverFilter === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        <label style="display: flex; align-items: center; gap: 8px; color: var(--text-dim); cursor: pointer;">
          <input type="checkbox" name="error" ${errorFilter ? 'checked' : ''} style="cursor: pointer;"> Errors only
        </label>
        <button type="submit" class="btn btn-sm btn-primary">Apply</button>
      </form>
    </div>
    ${logs.length === 0 ? '<div class="card empty"><p>No logs found</p></div>' : `<div class="card"><table><thead><tr><th>Timestamp</th><th>Server</th><th>Tool</th><th>Duration</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`}`;
  
  return c.html(layout('Logs', content, 'logs'));
});

// API Endpoints
app.post('/api/servers', async (c) => {
  const formData = await c.req.parseBody();
  const args = formData.args ? String(formData.args).split(',').map(s => s.trim()) : undefined;
  const url = formData.url ? String(formData.url) : undefined;
  
  try {
    const id = registry.addServer({
      name: String(formData.name),
      transport: String(formData.transport) as 'stdio' | 'sse' | 'streamable-http',
      command: formData.command ? String(formData.command) : undefined,
      args,
      url,
      enabled: true
    });
    return c.redirect(`/servers/${id}`);
  } catch (err) {
    return c.html(layout('Error', `<div class="card"><p class="text-error">${err instanceof Error ? err.message : String(err)}</p></div>`));
  }
});

app.post('/api/servers/:id/update', async (c) => {
  const id = c.req.param('id');
  const server = registry.getServer(id);
  
  if (!server) {
    return c.html(layout('Not Found', '<div class="card"><p class="text-error">Server not found</p></div>'));
  }
  
  const formData = await c.req.parseBody();
  const args = formData.args ? String(formData.args).split(',').map(s => s.trim()) : undefined;
  const url = formData.url ? String(formData.url) : undefined;
  
  try {
    const stmt = db.prepare(`
      UPDATE servers 
      SET name = ?, transport = ?, command = ?, args = ?, url = ?
      WHERE id = ?
    `);
    
    stmt.run(
      String(formData.name),
      String(formData.transport),
      formData.command ? String(formData.command) : null,
      args ? JSON.stringify(args) : null,
      url || null,
      id
    );
    
    return c.redirect(`/servers/${id}`);
  } catch (err) {
    return c.html(layout('Error', `<div class="card"><p class="text-error">Update failed: ${err instanceof Error ? err.message : String(err)}</p></div>`));
  }
});

app.post('/api/servers/:id/toggle', (c) => {
  const id = c.req.param('id');
  const server = registry.getServer(id);
  if (server) {
    server.enabled ? registry.disableServer(id) : registry.enableServer(id);
  }
  return c.redirect(`/servers/${id}`);
});

app.post('/api/servers/:id/delete', (c) => {
  const id = c.req.param('id');
  registry.removeServer(id);
  return c.redirect('/servers');
});

app.post('/api/servers/:id/discover', async (c) => {
  const id = c.req.param('id');
  try {
    await registry.discoverTools(id);
    return c.redirect(`/servers/${id}`);
  } catch (err) {
    return c.html(layout('Error', `<div class="card"><p class="text-error">Discovery failed: ${err instanceof Error ? err.message : String(err)}</p></div>`));
  }
});

app.post('/api/tools/:id/toggle', (c) => {
  const id = c.req.param('id');
  const tools = registry.listAllTools();
  const tool = tools.find(t => t.id === id);
  if (tool) {
    tool.enabled ? registry.disableTool(id) : registry.enableTool(id);
    return c.redirect(`/servers/${tool.serverId}`);
  }
  return c.redirect('/tools');
});

app.post('/api/projects', (c) => {
  const name = c.req.query('name') || '';
  if (name) { registry.createProject(name); }
  return c.redirect('/projects');
});

app.post('/api/projects/:id/delete', (c) => {
  registry.deleteProject(c.req.param('id'));
  return c.redirect('/projects');
});

app.get('/api/stats', (c) => {
  const servers = registry.listServers();
  const tools = registry.listAllTools();
  return c.json({
    servers: servers.length,
    enabledServers: servers.filter(s => s.enabled).length,
    tools: tools.length,
    enabledTools: tools.filter(t => t.enabled).length,
    dbPath: getDbPath()
  });
});

export default app;
