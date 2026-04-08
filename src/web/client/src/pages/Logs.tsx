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
import { useI18n } from '../i18n';

export const Logs: React.FC = () => {
  const { logs, servers, fetchLogs, isLoading } = useAppContext();
  const { t } = useI18n();
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
          <h1 className="text-4xl font-black text-foreground tracking-tight">{t('logs.requestLogs')}</h1>
          <p className="text-foreground-muted font-medium">{t('logs.monitorRealtime')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content={t('logs.refreshLogs')}>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => fetchLogs({ limit, server: serverFilter, error: errorOnly })}
              disabled={isLoading}
              className="rounded-2xl h-12 w-12"
            >
              <RefreshCcw size={20} className={isLoading ? 'animate-spin text-primary' : 'text-foreground-muted'} />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
              <select
                className="w-full bg-surface border-2 border-border focus:border-primary rounded-xl h-12 pl-12 pr-10 outline-none appearance-none transition-all text-sm font-bold text-foreground shadow-sm"
                value={serverFilter}
                onChange={(e) => setServerFilter(e.target.value)}
              >
                <option value="">{t('logs.allServers')}</option>
                {servers.map(server => (
                  <option key={server.id} value={server.id}>{server.name}</option>
                ))}
              </select>
            </div>
            <div className="relative w-full sm:w-40">
              <select
                className="w-full bg-surface border-2 border-border focus:border-primary rounded-xl h-12 px-4 outline-none appearance-none transition-all text-sm font-bold text-foreground shadow-sm text-center"
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
            {errorOnly ? t('logs.showErrorsOnly') : t('logs.showAllLogs')}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-8 py-5 text-left text-xs font-black text-foreground-muted uppercase tracking-[0.2em]">{t('logs.timestamp')}</th>
                <th className="px-8 py-5 text-left text-xs font-black text-foreground-muted uppercase tracking-[0.2em]">{t('logs.server')}</th>
                <th className="px-8 py-5 text-left text-xs font-black text-foreground-muted uppercase tracking-[0.2em]">{t('logs.project')}</th>
                <th className="px-8 py-5 text-left text-xs font-black text-foreground-muted uppercase tracking-[0.2em]">{t('logs.tool')}</th>
                <th className="px-8 py-5 text-left text-xs font-black text-foreground-muted uppercase tracking-[0.2em]">{t('logs.duration')}</th>
                <th className="px-8 py-5 text-right text-xs font-black text-foreground-muted uppercase tracking-[0.2em]">{t('logs.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-[13px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20">
                    <EmptyState 
                      icon={Clock}
                      title={t('logs.noActivityRecorded')}
                      description={serverFilter || errorOnly 
                        ? t('logs.noLogsMatchFilter')
                        : t('logs.waitingForLogs')}
                      className="border-none bg-transparent p-0"
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr 
                    key={i} 
                    className="hover:bg-muted transition-colors group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-8 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">
                          {parseLogTimestamp(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] text-foreground-muted opacity-60">
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
                        <span className="text-foreground-muted text-xs italic">unscoped</span>
                      )}
                    </td>
                    <td className="px-8 py-4">
                      <span className="font-bold text-foreground">
                        {log.tool_name}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className={`flex items-center gap-1.5 font-bold ${log.duration_ms > 1000 ? 'text-warning' : 'text-foreground-muted'}`}>
                        <Clock size={12} />
                        {log.duration_ms}ms
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {Number(log.success) === 1 ? (
                          <Badge variant="success" size="md">
                            {t('servers.success')} <CheckCircle2 size={12} className="ml-1.5" />
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="md">
                            {t('servers.error')} <AlertCircle size={12} className="ml-1.5" />
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
          <Loading size="sm" label={t('logs.updatingLogs')} className="flex-row" />
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${Number(selectedLog.success) === 1 ? 'bg-success-soft text-success' : 'bg-error-soft text-error'}`}>
                  {Number(selectedLog.success) === 1 ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                  <h3 className="font-black text-xl text-foreground leading-tight">{t('logs.logDetails')}</h3>
                  <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mt-0.5">ID: #{selectedLog.id}</p>
                </div>
              </div>
              <Button variant="secondary" size="icon" onClick={() => setSelectedLog(null)} className="rounded-xl">
                <X size={20} />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-2xl border border-border">
                  <span className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] block mb-1">{t('logs.server')}</span>
                  <span className="font-bold text-foreground">{serverMap.get(selectedLog.server_id) || selectedLog.server_id}</span>
                </div>
                {selectedLog.project_name && (
                  <div className="p-4 bg-muted rounded-2xl border border-border">
                    <span className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] block mb-1">{t('logs.project')}</span>
                    <span className="font-bold text-foreground">{selectedLog.project_name}</span>
                    {selectedLog.router_session_id && (
                      <span className="text-xs text-foreground-muted block mt-1">Session: {selectedLog.router_session_id.substring(0, 8)}...</span>
                    )}
                  </div>
                )}
                <div className="p-4 bg-muted rounded-2xl border border-border">
                  <span className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] block mb-1">{t('logs.tool')}</span>
                  <span className="font-bold text-foreground">{selectedLog.tool_name}</span>
                </div>
                <div className="p-4 bg-muted rounded-2xl border border-border">
                  <span className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] block mb-1">{t('logs.duration')}</span>
                  <span className="font-bold text-foreground">{selectedLog.duration_ms}ms</span>
                </div>
                <div className="p-4 bg-muted rounded-2xl border border-border">
                  <span className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] block mb-1">{t('logs.timestamp')}</span>
                  <span className="font-bold text-foreground">{parseLogTimestamp(selectedLog.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] ml-1">{t('servers.error')} Message</span>
                  <div className="p-4 bg-error-soft rounded-2xl border border-error-border text-error font-mono text-sm">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] ml-1">Payload Summary</span>
                <div className="p-4 bg-foreground text-foreground-inverted rounded-2xl font-mono text-sm overflow-x-auto">
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

            <div className="p-6 bg-muted border-t border-border flex justify-end">
              <Button variant="primary" onClick={() => setSelectedLog(null)} className="rounded-xl px-8">
                {t('common.close')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};