import React, { useState } from 'react';
import { Wrench, Search, Power, Filter, Server as ServerIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Card } from '../components/common/Card.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Input } from '../components/common/Input.tsx';
import { Loading } from '../components/common/Loading.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Tooltip } from '../components/common/Tooltip.tsx';

export const Tools: React.FC = () => {
  const { filteredTools: tools, servers, isLoading, toggleTool, searchQuery: globalSearchQuery } = useAppContext();
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [serverFilter, setServerFilter] = useState<string>('all');

  const serverMap = new Map(servers.map(s => [s.id, s.name]));

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.toolName.toLowerCase().includes(localSearchQuery.toLowerCase());
    const matchesServer = serverFilter === 'all' || tool.serverId === serverFilter;
    return matchesSearch && matchesServer;
  });

  if (isLoading && tools.length === 0) {
    return <Loading label="Discovering tools..." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Tools</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage individual tools discovered from your servers</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Badge variant="primary" size="md" className="px-4 py-2">
            {tools.length} Total
          </Badge>
          <Badge variant="success" size="md" className="px-4 py-2">
            {tools.filter(t => t.enabled).length} Enabled
          </Badge>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="relative flex-1">
          <Input
            placeholder="Search tools by name..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="pl-12"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative min-w-[240px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-primary rounded-xl h-12 pl-12 pr-10 outline-none appearance-none transition-all text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm"
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
            >
              <option value="all">All Servers</option>
              {servers.map(server => (
                <option key={server.id} value={server.id}>{server.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Tool Name</th>
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Source Server</th>
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-right text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTools.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20">
                    <EmptyState 
                      icon={Wrench}
                      title="No tools found"
                      description={localSearchQuery || serverFilter !== 'all' || globalSearchQuery 
                        ? "We couldn't find any tools matching your search criteria. Try adjusting your filters."
                        : "No tools have been discovered yet. Connect a server to start importing capabilities."}
                      className="border-none bg-transparent p-0"
                    />
                  </td>
                </tr>
              ) : (
                filteredTools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl transition-colors ${
                          tool.enabled 
                            ? 'bg-primary/10 text-primary group-hover:bg-primary/20' 
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`}>
                          <Wrench size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white leading-none mb-1">{tool.toolName}</span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">ID: {tool.id.substring(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2.5 text-sm font-bold text-slate-600 dark:text-slate-400">
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <ServerIcon size={14} className="text-slate-500" />
                        </div>
                        {serverMap.get(tool.serverId) || 'Unknown Server'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <Badge variant={tool.enabled ? 'success' : 'secondary'} size="md">
                        {tool.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Tooltip content={tool.enabled ? 'Disable Tool' : 'Enable Tool'}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleTool(tool.id)}
                          className={tool.enabled ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
                        >
                          <Power size={20} />
                        </Button>
                      </Tooltip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
