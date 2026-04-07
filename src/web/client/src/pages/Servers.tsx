import React, { useState } from 'react';
import { Server as ServerIcon, Settings2, Trash2, RefreshCcw, ExternalLink, Plus, FileJson, Upload } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { JsonImportPayload, JsonImportResponse, Server } from '../types';
import { Modal } from '../components/ui/Modal';
import { ServerForm } from '../components/ui/ServerForm';
import { Card } from '../components/common/Card.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Loading } from '../components/common/Loading.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Tooltip } from '../components/common/Tooltip.tsx';
import { serverApi } from '../utils/api';

export const Servers: React.FC = () => {
  const { 
    filteredServers: servers, isLoading, toggleServer, deleteServer, discoverTools, addServer, updateServer, refreshData, discoveringServerId
  } = useAppContext();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importResult, setImportResult] = useState<JsonImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  if (isLoading && servers.length === 0) {
    return <Loading label="Loading servers..." />;
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this server?')) {
      deleteServer(id);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setJsonInput(content);
    setImportResult(null);
    setImportError(null);
  };

  const handleImportJson = async () => {
    setImportError(null);
    setImportResult(null);

    if (!jsonInput.trim()) {
      setImportError('Paste a JSON payload or upload a file first.');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setImportError('Invalid JSON format. Check the payload and try again.');
      return;
    }

    setIsImporting(true);
    try {
      const response = await serverApi.importFromJson(parsed as JsonImportPayload);
      setImportResult(response.data);
      await refreshData();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Servers</h1>
          <p className="font-medium text-foreground-muted">Manage and configure your MCP servers</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button
            variant="secondary"
            onClick={() => setIsImportModalOpen(true)}
            className="w-full md:w-auto"
          >
            <FileJson size={20} />
            <span>Import JSON</span>
          </Button>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full md:w-auto"
          >
            <Plus size={20} />
            <span>Add Server</span>
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportResult(null);
          setImportError(null);
        }}
        title="Import MCP Servers from JSON"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">JSON Payload</label>
            <textarea
              rows={10}
              className="w-full rounded-xl border border-transparent bg-background-subtle px-4 py-2.5 font-mono text-xs text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-ring"
              placeholder='{"mcpServers": {"brave-search": {"command": "docker", "args": ["run", "-i"]}}}'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-background-subtle px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted">
              <Upload size={16} />
              Upload JSON file
              <input type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
            </label>
            <span className="text-xs text-foreground-muted">Supports OpenCode-style `mcpServers` format.</span>
          </div>

          {importError && (
            <div className="rounded-xl border border-error-border bg-error-soft p-3 text-sm text-error">
              {importError}
            </div>
          )}

          {importResult && (
            <div className="space-y-2 rounded-xl border border-border bg-background-subtle p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="success">Created: {importResult.summary.created}</Badge>
                <Badge variant="primary">Updated: {importResult.summary.updated}</Badge>
                <Badge variant="secondary">Skipped: {importResult.summary.skipped}</Badge>
                <Badge variant={importResult.summary.errors > 0 ? 'danger' : 'success'}>
                  Errors: {importResult.summary.errors}
                </Badge>
              </div>
              {importResult.messages.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-foreground-muted">
                  {importResult.messages.map((message, idx) => (
                    <li key={`${idx}-${message}`}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsImportModalOpen(false)}
              disabled={isImporting}
            >
              Close
            </Button>
            <Button onClick={handleImportJson} isLoading={isImporting}>
              Import Servers
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Add New MCP Server"
      >
        <ServerForm 
          onSubmit={async (data) => {
            await addServer(data);
            setIsAddModalOpen(false);
          }} 
          onCancel={() => setIsAddModalOpen(false)} 
        />
      </Modal>

      <Modal 
        isOpen={!!editingServer} 
        onClose={() => setEditingServer(null)} 
        title={`Edit ${editingServer?.name}`}
      >
        {editingServer && (
          <ServerForm 
            initialData={editingServer}
            onSubmit={async (data) => {
              await updateServer(editingServer.id, data);
              setEditingServer(null);
            }} 
            onCancel={() => setEditingServer(null)} 
          />
        )}
      </Modal>

      {servers.length === 0 ? (
        <EmptyState 
          icon={ServerIcon}
          title="No servers yet"
          description="Add your first MCP server to start aggregating tools and capabilities across your network."
          action={
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={20} />
              Add Your First Server
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <ServerCard 
              key={server.id} 
              server={server} 
              onToggle={() => toggleServer(server.id)}
              onDelete={() => handleDelete(server.id)}
              onDiscover={() => discoverTools(server.id)}
              onEdit={() => setEditingServer(server)}
              isDiscovering={discoveringServerId === server.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ServerCard: React.FC<{
  server: Server;
  onToggle: () => void;
  onDelete: () => void;
  onDiscover: () => void;
  onEdit: () => void;
  isDiscovering: boolean;
}> = ({ server, onToggle, onDelete, onDiscover, onEdit, isDiscovering }) => {
  return (
    <Card hover className="group h-full flex flex-col">
      <div className="p-6 flex-1 space-y-4">
        <div className="flex items-start justify-between">
          <div className={`rounded-xl p-3 transition-colors ${
            server.enabled ? 'bg-primary/12 text-primary' : 'bg-muted text-foreground-muted'
          }`}>
            <ServerIcon size={24} />
          </div>
          <div className="flex items-center gap-1">
            <Tooltip content={isDiscovering ? "Discovering..." : "Discover Tools"}>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onDiscover}
                disabled={isDiscovering}
                className={isDiscovering ? 'animate-spin text-primary' : 'text-foreground-muted hover:text-primary'}
              >
                <RefreshCcw size={18} className={isDiscovering ? "animate-spin" : ""} />
              </Button>
            </Tooltip>
            <Tooltip content="Settings">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onEdit}
                className="text-foreground-muted hover:text-primary"
              >
                <Settings2 size={18} />
              </Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onDelete}
                className="text-foreground-muted hover:text-error"
              >
                <Trash2 size={18} />
              </Button>
            </Tooltip>
          </div>
        </div>

        <div>
          <h3 className="truncate text-lg font-bold text-foreground" title={server.name}>
            {server.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{server.transport}</Badge>
            <span className="h-1 w-1 rounded-full bg-border-strong" />
            <span className="truncate font-mono text-[10px] text-foreground-muted">{server.id}</span>
          </div>
        </div>

        <div className="space-y-2">
          {server.url && (
            <div className="flex items-center gap-2 rounded-lg bg-background-subtle px-3 py-2 font-mono text-[10px] text-foreground-muted transition-colors group-hover:bg-muted truncate">
              <ExternalLink size={12} className="shrink-0" />
              {server.url}
            </div>
          )}
          {server.command && (
            <div className="truncate rounded-lg bg-background-subtle px-3 py-2 font-mono text-[10px] text-foreground-muted transition-colors group-hover:bg-muted">
              <span className="text-primary font-bold mr-1">$</span> {server.command} {server.args?.join(' ')}
            </div>
          )}
          {server.env && Object.keys(server.env).length > 0 && (
            <div className="rounded-lg bg-background-subtle px-3 py-2 font-mono text-[10px] text-foreground-muted transition-colors group-hover:bg-muted">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-primary font-bold">ENV</span>
                <span className="text-foreground-muted">({Object.keys(server.env).length})</span>
                {Object.entries(server.env).slice(0, 3).map(([key, value]) => (
                  <span key={key} className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-foreground">
                    <span className="font-semibold">{key}</span>
                    <span>=</span>
                    <span>{value.length > 4 ? '••••••' : '••'}</span>
                  </span>
                ))}
                {Object.keys(server.env).length > 3 && (
                  <span className="text-slate-400">+{Object.keys(server.env).length - 3} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-b-2xl">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${server.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {server.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <Tooltip content={server.enabled ? 'Disable Server' : 'Enable Server'}>
          <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              server.enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                server.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </Tooltip>
      </div>
    </Card>
  );
};
