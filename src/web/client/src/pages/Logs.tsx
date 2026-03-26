import React, { useEffect, useState } from 'react';
import { Filter, RefreshCcw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Card } from '../components/common/Card.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Loading } from '../components/common/Loading.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Tooltip } from '../components/common/Tooltip.tsx';

export const Logs: React.FC = () => {
  const { logs, servers, fetchLogs, isLoading } = useAppContext();
  const [limit, setLimit] = useState(50);
  const [serverFilter, setServerFilter] = useState('');
  const [errorOnly, setErrorOnly] = useState(false);

  const serverMap = new Map(servers.map(s => [s.id, s.name]));

  useEffect(() => {
    fetchLogs({ limit, server: serverFilter, error: errorOnly });
    
    const interval = setInterval(() => {
      fetchLogs({ limit, server: serverFilter, error: errorOnly });
    }, 10000);
    
    return () => clearInterval(interval);
  }, [limit, serverFilter, errorOnly, fetchLogs]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Request Logs</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Monitor real-time interactions across your MCP network</p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Refresh Logs">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => fetchLogs({ limit, server: serverFilter, error: errorOnly })}
              disabled={isLoading}
              className="rounded-2xl h-12 w-12"
            >
              <RefreshCcw size={20} className={isLoading ? 'animate-spin text-primary' : 'text-slate-500'} />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-primary rounded-xl h-12 pl-12 pr-10 outline-none appearance-none transition-all text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm"
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
            >
              <option value="">All Servers</option>
              {servers.map(server => (
                <option key={server.id} value={server.id}>{server.name}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full sm:w-40">
            <select
              className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-primary rounded-xl h-12 px-4 outline-none appearance-none transition-all text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm text-center"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={25}>25 Lines</option>
              <option value={50}>50 Lines</option>
              <option value={100}>100 Lines</option>
              <option value={500}>500 Lines</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={errorOnly ? 'danger' : 'secondary'}
            onClick={() => setErrorOnly(!errorOnly)}
            className="w-full lg:w-auto h-12 rounded-xl"
          >
            <AlertCircle size={18} />
            {errorOnly ? 'Showing Errors Only' : 'Show All Logs'}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Server</th>
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Tool</th>
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Duration</th>
                <th className="px-8 py-5 text-right text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[13px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20">
                    <EmptyState 
                      icon={Clock}
                      title="No activity recorded"
                      description={serverFilter || errorOnly 
                        ? "No logs match your current filter settings. Try relaxing your search criteria."
                        : "Waiting for request logs... Run some tools to see activity here."}
                      className="border-none bg-transparent p-0"
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-8 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] text-slate-400 opacity-60">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <Badge variant="secondary" className="font-mono">
                        {serverMap.get(log.server_id) || log.server_id.substring(0, 8)}
                      </Badge>
                    </td>
                    <td className="px-8 py-4">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {log.tool_name}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className={`flex items-center gap-1.5 font-bold ${log.duration_ms > 1000 ? 'text-amber-500' : 'text-slate-500'}`}>
                        <Clock size={12} />
                        {log.duration_ms}ms
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {Number(log.success) === 1 ? (
                          <Badge variant="success" size="md">
                            Success <CheckCircle2 size={12} className="ml-1.5" />
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="md">
                            Error <AlertCircle size={12} className="ml-1.5" />
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {isLoading && logs.length > 0 && (
        <div className="flex justify-center pt-4">
          <Loading size="sm" label="Updating logs..." className="flex-row" />
        </div>
      )}
    </div>
  );
};
