import React, { useEffect } from 'react';
import { Server, Wrench, Briefcase, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Card } from '../components/common/Card.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Loading } from '../components/common/Loading.tsx';
import { parseLogTimestamp } from '../utils/time';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}> = ({ title, value, icon: Icon, color, trend }) => (
  <Card hover className="p-6 flex items-start gap-4 group">
    <div className={`rounded-2xl p-3 transition-transform group-hover:scale-110 ${color}`}>
      <Icon size={24} className={color.replace('bg-', 'text-')} />
    </div>
    <div>
      <p className="mb-1 text-sm font-medium text-foreground-muted">{title}</p>
      <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
      {trend && (
        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
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
        <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground">
          System Overview
        </h1>
        <p className="font-medium text-foreground-muted">
          Welcome back. Here's what's happening across your MCP network today.
        </p>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Servers" value={servers.filter(s => s.status === 'online').length} icon={Server} color="bg-primary/12" />
        <StatCard title="Available Tools" value={tools.length} icon={Wrench} color="bg-accent/12" />
        <StatCard title="Active Projects" value={projects.length} icon={Briefcase} color="bg-success-soft" />
        <StatCard title="Enabled Tools" value={tools.filter(t => t.enabled).length} icon={CheckCircle2} color="bg-info-soft" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Servers List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground">
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
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    server.status === 'online' ? 'bg-success-soft text-success' : 'bg-muted text-foreground-muted'
                  }`}>
                    <Server size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{server.name}</h4>
                    <p className="font-mono text-[10px] tracking-tight text-foreground-muted">{server.transport.toUpperCase()} • {server.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={server.status === 'online' ? 'success' : 'secondary'} size="md">
                    {server.status}
                  </Badge>
                  <div className={`h-2.5 w-2.5 rounded-full ${server.status === 'online' ? 'bg-success animate-pulse' : 'bg-border-strong'}`} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <Activity size={24} className="text-accent" />
            Recent Activity
          </h2>
          <Card className="overflow-hidden">
            <div className="p-6 space-y-6">
              {recentLogs.length > 0 ? (
                recentLogs.map((log, i) => {
                  const Icon = Number(log.success) === 1 ? CheckCircle2 : AlertCircle;
                  const color = Number(log.success) === 1 ? 'text-success' : 'text-error';
                  const time = parseLogTimestamp(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={log.id} className="flex gap-4 relative">
                      {i < recentLogs.length - 1 && <div className="absolute bottom-[-1.5rem] left-2.5 top-6 w-px bg-border" />}
                      <div className="z-10 rounded-full bg-surface p-0.5">
                        <Icon size={20} className={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-foreground" title={log.tool_name}>
                          {log.tool_name}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {time} • {serverMap.get(log.server_id) || log.server_id.substring(0, 8)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-sm text-foreground-muted">
                  No recent activity found.
                </div>
              )}
            </div>
            <button 
              onClick={() => navigate('/logs')}
              className="w-full border-t border-border bg-background-subtle py-4 text-sm font-bold text-foreground-muted transition-colors hover:text-primary"
            >
              View Audit Log
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
};
