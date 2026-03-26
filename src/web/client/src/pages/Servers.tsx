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
    filteredServers: servers, isLoading, toggleServer, deleteServer, discoverTools, addServer, updateServer, refreshData
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
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Servers</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage and configure your MCP servers</p>
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
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">JSON Payload</label>
            <textarea
              rows={10}
              className="w-full bg-slate-100 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono text-xs"
              placeholder='{"mcpServers": {"brave-search": {"command": "docker", "args": ["run", "-i"]}}}'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <Upload size={16} />
              Upload JSON file
              <input type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
            </label>
            <span className="text-xs text-slate-500">Supports OpenCode-style `mcpServers` format.</span>
          </div>

          {importError && (
            <div className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 rounded-xl p-3">
              {importError}
            </div>
          )}

          {importResult && (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="success">Created: {importResult.summary.created}</Badge>
                <Badge variant="primary">Updated: {importResult.summary.updated}</Badge>
                <Badge variant="secondary">Skipped: {importResult.summary.skipped}</Badge>
                <Badge variant={importResult.summary.errors > 0 ? 'danger' : 'success'}>
                  Errors: {importResult.summary.errors}
                </Badge>
              </div>
              {importResult.messages.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
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
}> = ({ server, onToggle, onDelete, onDiscover, onEdit }) => {
  return (
    <Card hover className="group h-full flex flex-col">
      <div className="p-6 flex-1 space-y-4">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl transition-colors ${
            server.enabled ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
          }`}>
            <ServerIcon size={24} />
          </div>
          <div className="flex items-center gap-1">
            <Tooltip content="Discover Tools">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onDiscover}
                className="text-slate-400 hover:text-primary"
              >
                <RefreshCcw size={18} />
              </Button>
            </Tooltip>
            <Tooltip content="Settings">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onEdit}
                className="text-slate-400 hover:text-primary"
              >
                <Settings2 size={18} />
              </Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onDelete}
                className="text-slate-400 hover:text-rose-500"
              >
                <Trash2 size={18} />
              </Button>
            </Tooltip>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate" title={server.name}>
            {server.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{server.transport}</Badge>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="font-mono text-[10px] text-slate-400 truncate">{server.id}</span>
          </div>
        </div>

        <div className="space-y-2">
          {server.url && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg text-[10px] font-mono text-slate-500 truncate group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
              <ExternalLink size={12} className="shrink-0" />
              {server.url}
            </div>
          )}
          {server.command && (
            <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg text-[10px] font-mono text-slate-500 truncate group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
              <span className="text-primary font-bold mr-1">$</span> {server.command} {server.args?.join(' ')}
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
