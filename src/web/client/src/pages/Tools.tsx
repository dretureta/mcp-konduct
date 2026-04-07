import React, { useState } from 'react';
import { Wrench, Search, Power, Filter, Server as ServerIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const serverMap = new Map(servers.map(s => [s.id, s.name]));

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.toolName.toLowerCase().includes(localSearchQuery.toLowerCase());
    const matchesServer = serverFilter === 'all' || tool.serverId === serverFilter;
    return matchesSearch && matchesServer;
  });

  const totalPages = Math.ceil(filteredTools.length / PAGE_SIZE);
  const paginatedTools = filteredTools.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [localSearchQuery, serverFilter]);

  if (isLoading && tools.length === 0) {
    return <Loading label="Discovering tools..." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Tools</h1>
          <p className="text-foreground-muted font-medium">Manage individual tools discovered from your servers</p>
        </div>
        <div className="flex items-center gap-3 bg-surface p-1.5 rounded-2xl border border-border shadow-sm">
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={20} />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative min-w-[240px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
            <select
              className="w-full bg-surface border-2 border-border focus:border-primary rounded-xl h-12 pl-12 pr-10 outline-none appearance-none transition-all text-sm font-bold text-foreground shadow-sm"
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
            >
              <option value="all">All Servers</option>
              {servers.map(server => (
                <option key={server.id} value={server.id}>{server.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-muted">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-8 py-5 text-left text-xs font-black text-foreground-muted uppercase tracking-[0.2em]">Tool Name</th>
                <th className="px-8 py-5 text-left text-xs font-black text-foreground-muted uppercase tracking-[0.2em]">Source Server</th>
                <th className="px-8 py-5 text-left text-xs font-black text-foreground-muted uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-right text-xs font-black text-foreground-muted uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedTools.length === 0 ? (
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
                paginatedTools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-muted transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl transition-colors ${
                          tool.enabled 
                            ? 'bg-primary/10 text-primary group-hover:bg-primary/20' 
                            : 'bg-muted text-foreground-muted'
                        }`}>
                          <Wrench size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground leading-none mb-1">{tool.toolName}</span>
                          <span className="text-[10px] font-mono text-foreground-muted uppercase tracking-tighter">ID: {tool.id.substring(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2.5 text-sm font-bold text-foreground-muted">
                        <div className="p-1.5 bg-muted rounded-lg">
                          <ServerIcon size={14} className="text-foreground-muted" />
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
                          className={tool.enabled ? 'text-success hover:bg-success-soft' : 'text-foreground-muted hover:bg-muted'}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 bg-surface border border-t-0 border-border rounded-b-2xl">
          <div className="text-sm text-foreground-muted">
            Showing <span className="font-bold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
            <span className="font-bold text-foreground">{Math.min(currentPage * PAGE_SIZE, filteredTools.length)}</span> of{' '}
            <span className="font-bold text-foreground">{filteredTools.length}</span> tools
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              ).map(page => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-9"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
