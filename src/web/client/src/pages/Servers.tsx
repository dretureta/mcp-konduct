import React, { useState } from 'react';
import { Server as ServerIcon, Settings2, Trash2, RefreshCcw, ExternalLink, Plus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Server } from '../types';
import { Modal } from '../components/ui/Modal';
import { ServerForm } from '../components/ui/ServerForm';
import { Card } from '../components/common/Card.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Loading } from '../components/common/Loading.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Tooltip } from '../components/common/Tooltip.tsx';

export const Servers: React.FC = () => {
  const { 
    servers, isLoading, toggleServer, deleteServer, discoverTools, addServer, updateServer 
  } = useAppContext();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);

  if (isLoading && servers.length === 0) {
    return <Loading label="Loading servers..." />;
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this server?')) {
      deleteServer(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Servers</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage and configure your MCP servers</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-full md:w-auto"
        >
          <Plus size={20} />
          <span>Add Server</span>
        </Button>
      </div>

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
