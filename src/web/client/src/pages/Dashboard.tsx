import React, { useEffect } from 'react';
import { Server, Wrench, Briefcase, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Card } from '../components/common/Card.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Loading } from '../components/common/Loading.tsx';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}> = ({ title, value, icon: Icon, color, trend }) => (
  <Card hover className="p-6 flex items-start gap-4 group">
    <div className={`p-3 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20 group-hover:scale-110 transition-transform`}>
      <Icon size={24} className={color.replace('bg-', 'text-')} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</h3>
      {trend && (
        <p className="text-xs font-semibold mt-2 text-emerald-500 flex items-center gap-1">
          <Activity size={12} />
          {trend}
        </p>
      )}
    </div>
  </Card>
);

export const Dashboard: React.FC = () => {
  const { servers, tools, isLoading, logs, fetchLogs, projects } = useAppContext();
  const navigate = useNavigate();
  const serverMap = new Map(servers.map((server) => [server.id, server.name]));

  useEffect(() => {
    fetchLogs({ limit: 5 });
  }, [fetchLogs]);

  const recentLogs = logs.slice(0, 5);

  if (isLoading) {
    return <Loading label="Syncing system status..." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Section */}
      <section>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
          System Overview
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Welcome back. Here's what's happening across your MCP network today.
        </p>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Servers" value={servers.filter(s => s.status === 'online').length} icon={Server} color="bg-primary" />
        <StatCard title="Available Tools" value={tools.length} icon={Wrench} color="bg-accent" />
        <StatCard title="Active Projects" value={projects.length} icon={Briefcase} color="bg-emerald-500" />
        <StatCard title="Enabled Tools" value={tools.filter(t => t.enabled).length} icon={CheckCircle2} color="bg-sky-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Servers List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Server size={24} className="text-primary" />
              Connected Servers
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary-dark"
              onClick={() => navigate('/servers')}
            >
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            {servers.map(server => (
              <Card key={server.id} hover className="p-5 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    server.status === 'online' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }`}>
                    <Server size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{server.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono text-[10px] tracking-tight">{server.transport.toUpperCase()} • {server.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={server.status === 'online' ? 'success' : 'secondary'} size="md">
                    {server.status}
                  </Badge>
                  <div className={`w-2.5 h-2.5 rounded-full ${server.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Activity size={24} className="text-accent" />
            Recent Activity
          </h2>
          <Card className="overflow-hidden">
            <div className="p-6 space-y-6">
              {recentLogs.length > 0 ? (
                recentLogs.map((log, i) => {
                  const Icon = Number(log.success) === 1 ? CheckCircle2 : AlertCircle;
                  const color = Number(log.success) === 1 ? 'text-emerald-500' : 'text-rose-500';
                  const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={log.id} className="flex gap-4 relative">
                      {i < recentLogs.length - 1 && <div className="absolute left-2.5 top-6 bottom-[-1.5rem] w-px bg-slate-200 dark:bg-slate-800" />}
                      <div className={`z-10 bg-white dark:bg-slate-900 rounded-full p-0.5`}>
                        <Icon size={20} className={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={log.tool_name}>
                          {log.tool_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {time} • {serverMap.get(log.server_id) || log.server_id.substring(0, 8)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No recent activity found.
                </div>
              )}
            </div>
            <button 
              onClick={() => navigate('/logs')}
              className="w-full py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-primary transition-colors"
            >
              View Audit Log
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
};
