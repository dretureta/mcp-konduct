import React, { useEffect, useState } from 'react';
import { Filter, RefreshCcw, CheckCircle2, AlertCircle, Clock, Search, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Card } from '../components/common/Card.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Loading } from '../components/common/Loading.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Tooltip } from '../components/common/Tooltip.tsx';
import { LogEntry } from '../types';
import { parseLogTimestamp } from '../utils/time';

export const Logs: React.FC = () => {
  const { logs, servers, fetchLogs, isLoading } = useAppContext();
  const [limit, setLimit] = useState(50);
  const [serverFilter, setServerFilter] = useState('');
  const [errorOnly, setErrorOnly] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

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
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Project</th>
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Tool</th>
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Duration</th>
                <th className="px-8 py-5 text-right text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[13px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20">
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
                  <tr 
                    key={i} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-8 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {parseLogTimestamp(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] text-slate-400 opacity-60">
                          {parseLogTimestamp(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <Badge variant="secondary" className="font-mono">
                        {serverMap.get(log.server_id) || log.server_id.substring(0, 8)}
                      </Badge>
                    </td>
                    <td className="px-8 py-4">
                      {log.project_name ? (
                        <Badge variant="info" className="font-mono">
                          {log.project_name}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-xs italic">unscoped</span>
                      )}
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
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <Search size={14} className="text-primary" />
                        </div>
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

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${Number(selectedLog.success) === 1 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`}>
                  {Number(selectedLog.success) === 1 ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-900 dark:text-white leading-tight">Log Details</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">ID: #{selectedLog.id}</p>
                </div>
              </div>
              <Button variant="secondary" size="icon" onClick={() => setSelectedLog(null)} className="rounded-xl">
                <X size={20} />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Server</span>
                  <span className="font-bold text-slate-900 dark:text-white">{serverMap.get(selectedLog.server_id) || selectedLog.server_id}</span>
                </div>
                {selectedLog.project_name && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Project</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedLog.project_name}</span>
                    {selectedLog.router_session_id && (
                      <span className="text-xs text-slate-400 block mt-1">Session: {selectedLog.router_session_id.substring(0, 8)}...</span>
                    )}
                  </div>
                )}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Tool</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedLog.tool_name}</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Duration</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedLog.duration_ms}ms</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Timestamp</span>
                  <span className="font-bold text-slate-900 dark:text-white">{parseLogTimestamp(selectedLog.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Error Message</span>
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400 font-mono text-sm">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Payload Summary</span>
                <div className="p-4 bg-slate-900 text-slate-300 rounded-2xl font-mono text-sm overflow-x-auto">
                  <pre>{JSON.stringify({
                    server_id: selectedLog.server_id,
                    project: selectedLog.project_name || null,
                    session_id: selectedLog.router_session_id || null,
                    tool: selectedLog.tool_name,
                    success: !!Number(selectedLog.success),
                    error: selectedLog.error_message || null
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <Button variant="primary" onClick={() => setSelectedLog(null)} className="rounded-xl px-8">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
