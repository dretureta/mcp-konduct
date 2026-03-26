import React from 'react';
import { Server, Wrench, Briefcase, Activity, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
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
  const { servers, isLoading } = useAppContext();

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
        <StatCard title="Active Servers" value={servers.filter(s => s.status === 'online').length} icon={Server} color="bg-primary" trend="+2 since yesterday" />
        <StatCard title="Available Tools" value="24" icon={Wrench} color="bg-accent" />
        <StatCard title="Active Projects" value="8" icon={Briefcase} color="bg-emerald-500" trend="1 completed today" />
        <StatCard title="Uptime" value="99.9%" icon={CheckCircle2} color="bg-sky-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Servers List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Server size={24} className="text-primary" />
              Connected Servers
            </h2>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">View All</Button>
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
              {[
                { icon: CheckCircle2, title: 'Server Started', time: '2m ago', color: 'text-emerald-500' },
                { icon: AlertCircle, title: 'Tool Execution Failed', time: '15m ago', color: 'text-rose-500' },
                { icon: Clock, title: 'Scheduled Backup', time: '1h ago', color: 'text-sky-500' },
                { icon: Activity, title: 'Server Registry Updated', time: '3h ago', color: 'text-primary' },
              ].map((activity, i) => (
                <div key={i} className="flex gap-4 relative">
                  {i < 3 && <div className="absolute left-2.5 top-6 bottom-[-1.5rem] w-px bg-slate-200 dark:bg-slate-800" />}
                  <div className={`z-10 bg-white dark:bg-slate-900 rounded-full p-0.5`}>
                    <activity.icon size={20} className={activity.color} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{activity.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-primary transition-colors">
              View Audit Log
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
};
