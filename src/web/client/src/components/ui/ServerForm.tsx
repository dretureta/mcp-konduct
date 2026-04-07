import React, { useState } from 'react';
import { Server, CreateServerRequest, TransportType } from '../../types';

interface ServerFormProps {
  initialData?: Server;
  onSubmit: (data: CreateServerRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ServerForm: React.FC<ServerFormProps> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState<CreateServerRequest>({
    name: initialData?.name || '',
    transport: initialData?.transport || 'stdio',
    command: initialData?.command || '',
    args: initialData?.args || [],
    url: initialData?.url || '',
  });

  const [argsString, setArgsString] = useState(initialData?.args?.join(', ') || '');

  const [envString, setEnvString] = useState(
    initialData?.env
      ? Object.entries(initialData.env).map(([k, v]) => `${k}=${v}`).join('\n')
      : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const envRecord: Record<string, string> = {};
    envString.split('\n').map(line => line.trim()).filter(Boolean).forEach(line => {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.substring(0, eqIdx).trim();
        const value = line.substring(eqIdx + 1).trim();
        if (key) envRecord[key] = value;
      }
    });

    const finalData = {
      ...formData,
      args: argsString.split(',').map(a => a.trim()).filter(Boolean),
      env: Object.keys(envRecord).length > 0 ? envRecord : undefined,
    };
    await onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Server Name</label>
          <input
            required
            type="text"
            className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all"
            placeholder="e.g., File System"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Transport</label>
          <select
            className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all"
            value={formData.transport}
            onChange={(e) => setFormData({ ...formData, transport: e.target.value as TransportType })}
          >
            <option value="stdio">Standard I/O (stdio)</option>
            <option value="sse">Server-Sent Events (SSE)</option>
            <option value="streamable-http">Streamable HTTP</option>
          </select>
        </div>
      </div>

      {formData.transport === 'stdio' ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Command</label>
            <input
              required
              type="text"
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              placeholder="e.g., npx"
              value={formData.command}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Arguments (comma separated)</label>
            <textarea
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              placeholder="e.g., -y, @modelcontextprotocol/server-filesystem, /tmp"
              rows={3}
              value={argsString}
              onChange={(e) => setArgsString(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">
              KEY=VALUE Environment Variables <span className="font-normal text-foreground-muted">(one per line)</span>
            </label>
            <textarea
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              placeholder={"API_KEY=your_key\nANOTHER_VAR=value"}
              rows={3}
              value={envString}
              onChange={(e) => setEnvString(e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">URL</label>
            <input
              required
              type="url"
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              placeholder="http://localhost:3000"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">
              KEY=VALUE Environment Variables <span className="font-normal text-foreground-muted">(one per line)</span>
            </label>
            <textarea
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              placeholder={"API_KEY=your_key\nANOTHER_VAR=value"}
              rows={3}
              value={envString}
              onChange={(e) => setEnvString(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl font-bold text-foreground-muted hover:bg-muted transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary hover:bg-primary-dark text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : initialData ? 'Update Server' : 'Create Server'}
        </button>
      </div>
    </form>
  );
};
