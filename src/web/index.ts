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
  --bg: #1a1a2e;
  --surface: #16213e;
  --surface-hover: #1f2b47;
  --primary: #00d4ff;
  --primary-dim: #0099cc;
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
  --text: #ffffff;
  --text-dim: #94a3b8;
  --border: #2d3a52;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
header { background: var(--surface); padding: 15px 0; border-bottom: 1px solid var(--border); }
header .container { display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }
.logo { font-size: 1.5rem; font-weight: bold; color: var(--primary); }
nav { display: flex; gap: 20px; }
nav a { color: var(--text-dim); }
nav a:hover, nav a.active { color: var(--primary); }
.card { background: var(--surface); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
.stat { background: var(--surface); padding: 20px; border-radius: 8px; text-align: center; }
.stat-value { font-size: 2.5rem; font-weight: bold; color: var(--primary); }
.stat-label { color: var(--text-dim); }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border); }
th { color: var(--text-dim); font-weight: 500; }
tr:hover { background: var(--surface-hover); }
.btn { display: inline-block; padding: 8px 16px; border-radius: 6px; font-size: 0.9rem; cursor: pointer; border: none; }
.btn-primary { background: var(--primary); color: var(--bg); }
.btn-primary:hover { background: var(--primary-dim); }
.btn-danger { background: var(--error); color: white; }
.btn-success { background: var(--success); color: white; }
.btn-sm { padding: 4px 10px; font-size: 0.8rem; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; }
.badge-success { background: var(--success); }
.badge-error { background: var(--error); }
.badge-warning { background: var(--warning); }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; color: var(--text-dim); }
.form-group input, .form-group select { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--text); }
.form-group input:focus { outline: none; border-color: var(--primary); }
.actions { display: flex; gap: 10px; }
.text-dim { color: var(--text-dim); }
.text-success { color: var(--success); }
.text-error { color: var(--error); }
.page-title { margin-bottom: 20px; }
.empty { text-align: center; padding: 40px; color: var(--text-dim); }
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
      <h2 style="margin-bottom: 15px;">Recent Activity</h2>
      ${logsHtml}
    </div>
    <div class="card">
      <h2 style="margin-bottom: 15px;">Quick Actions</h2>
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
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1>Servers</h1>
      <a href="/servers/new" class="btn btn-primary">Add Server</a>
    </div>
    ${content}
  `, 'servers'));
});

app.get('/servers/new', (c) => {
  const content = `
    <h1 class="page-title">Add Server</h1>
    <div class="card">
      <form method="POST" action="/api/servers">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required placeholder="my-server">
        </div>
        <div class="form-group">
          <label for="transport">Transport</label>
          <select id="transport" name="transport">
            <option value="stdio">stdio</option>
            <option value="sse">sse</option>
            <option value="streamable-http">streamable-http</option>
          </select>
        </div>
        <div class="form-group">
          <label for="command">Command (for stdio)</label>
          <input type="text" id="command" name="command" placeholder="npx">
        </div>
        <div class="form-group">
          <label for="args">Arguments (comma-separated)</label>
          <input type="text" id="args" name="args" placeholder="-y,@modelcontextprotocol/server-filesystem,/tmp">
        </div>
        <div class="form-group">
          <label for="url">URL (for sse/http)</label>
          <input type="text" id="url" name="url" placeholder="http://localhost:3000">
        </div>
        <div class="actions">
          <button type="submit" class="btn btn-primary">Add Server</button>
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
    return c.html(layout('Not Found', '<div class="card"><p>Server not found</p></div>'));
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
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <div><a href="/servers" class="text-dim">← Back to Servers</a><h1 style="margin-top: 10px;">${server.name}</h1></div>
      <form method="POST" action="/api/servers/${server.id}/discover"><button type="submit" class="btn btn-primary">Discover Tools</button></form>
    </div>
    <div class="card">
      <h2 style="margin-bottom: 15px;">Server Details</h2>
      <table>
        <tr><th>ID</th><td class="text-dim">${server.id}</td></tr>
        <tr><th>Transport</th><td>${server.transport}</td></tr>
        <tr><th>Command</th><td class="text-dim">${server.command || '-'}</td></tr>
        <tr><th>Args</th><td class="text-dim">${server.args ? server.args.join(' ') : '-'}</td></tr>
        <tr><th>URL</th><td class="text-dim">${server.url || '-'}</td></tr>
        <tr><th>Status</th><td><span class="badge ${server.enabled ? 'badge-success' : 'badge-error'}">${server.enabled ? 'enabled' : 'disabled'}</span></td></tr>
      </table>
    </div>
    <div class="card">
      <h2 style="margin-bottom: 15px;">Tools (${tools.filter(t => t.enabled).length}/${tools.length} enabled)</h2>
      ${toolsHtml}
    </div>
    <div class="card">
      <form method="POST" action="/api/servers/${server.id}/delete" onsubmit="return confirm('Are you sure?')">
        <button type="submit" class="btn btn-danger">Delete Server</button>
      </form>
    </div>`;
  
  return c.html(layout(server.name, content, 'servers'));
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h2>${project.name}</h2>
          <form method="POST" action="/api/projects/${project.id}/delete" style="display: inline;"><button type="submit" class="btn btn-sm btn-danger">Delete</button></form>
        </div>
        <p class="text-dim">${project.description || 'No description'}</p>
        <p style="margin-top: 10px;">${count} servers</p>
      </div>`;
    }).join('');

  const content = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1>Projects</h1>
      <form method="POST" action="/api/projects" style="display: flex; gap: 10px;">
        <input type="text" name="name" placeholder="Project name" required style="padding: 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--text);">
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
    <div class="card" style="margin-bottom: 20px;">
      <form method="GET" style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
        <label class="text-dim">Filter:</label>
        <select name="server" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--text);">
          <option value="">All servers</option>
          ${servers.map(s => `<option value="${s.id}" ${serverFilter === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        <label style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" name="error" ${errorFilter ? 'checked' : ''}> Errors only
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
