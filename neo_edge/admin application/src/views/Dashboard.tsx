import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, cn } from '../components/ui/Shared';
import { MOCK_LOGS } from '../lib/mockData';
import { Activity, Clock, CheckCircle, TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { getVideos, getToApproveVideos, toApproveVideoToUI, backendVideoToUI } from '../lib/api';

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <Card className="p-6 relative overflow-hidden group">
    <div className={cn("absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20", color)}>
      <Icon size={80} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className={cn(color)} />
        <span className="text-zinc-400 text-sm font-medium">{title}</span>
      </div>
      <div className="text-3xl font-bold text-zinc-100 tracking-tight">{value}</div>
      <div className={cn("text-xs mt-2 font-medium flex items-center gap-1", change?.startsWith('+') ? "text-emerald-400" : change?.startsWith('-') ? "text-rose-400" : "text-zinc-500")}>
        {change ?? '—'} {change && <span className="text-zinc-500">vs last 24h</span>}
      </div>
    </div>
  </Card>
);

export const Dashboard = () => {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 0,
    pendingReview: 0,
    readyToPublish: 0,
    avgScore: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      setLoading(true);
      try {
        const [videosRes, toApproveRes] = await Promise.all([
          getVideos(),
          getToApproveVideos(),
        ]);
        if (cancelled) return;
        const allVideos = (videosRes?.data ?? []).map(backendVideoToUI);
        const toApprove = (toApproveRes?.data ?? []).map(toApproveVideoToUI);
        const pending = toApprove.filter((v) => v.status === 'pending').length;
        const approved = toApprove.filter((v) => v.status === 'approved').length;
        const published = allVideos.filter((v) => v.status === 'published').length;
        const readyToPublish = approved + published;
        const scores = toApprove.map((v) => v.qualityScore).filter((s) => s > 0);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        setStats({
          totalVideos: allVideos.length + toApprove.length,
          pendingReview: pending,
          readyToPublish,
          avgScore: Math.round(avgScore * 10) / 10,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const chartData = [
    { name: '00:00', value: 45 },
    { name: '04:00', value: 52 },
    { name: '08:00', value: 38 },
    { name: '12:00', value: 65 },
    { name: '16:00', value: 78 },
    { name: '20:00', value: 59 },
    { name: '23:59', value: 48 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Videos Fetched" value={stats.totalVideos.toLocaleString()} change="+12%" icon={Activity} color="text-cyan-500" />
        <StatCard title="Pending Review" value={stats.pendingReview} change="+5%" icon={Clock} color="text-amber-500" />
        <StatCard title="Ready to Publish" value={stats.readyToPublish} change="-2%" icon={CheckCircle} color="text-emerald-500" />
        <StatCard title="Avg Quality Score" value={stats.avgScore || '—'} change={stats.avgScore ? '+1.2%' : undefined} icon={TrendingUp} color="text-violet-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 min-h-[400px]">
          <h3 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-400" />
            Ingestion Volume & Quality Trends
          </h3>
          <div ref={containerRef} className="h-[300px] w-full min-w-0 relative" style={{ height: 300 }}>
            {dimensions.width > 0 && dimensions.height > 0 ? (
              <AreaChart width={dimensions.width} height={dimensions.height} data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <Activity className="animate-pulse" />
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center gap-2">
            <Activity size={18} className="text-violet-400" />
            Recent Activity
          </h3>
          <div className="space-y-6">
            {MOCK_LOGS.map((log) => (
              <div key={log.id} className="flex gap-4 items-start relative">
                <div className="w-px h-full bg-zinc-800 absolute left-[9px] top-6 bottom-0 last:hidden"></div>
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10",
                  log.action === 'Published' ? "bg-emerald-500/20 text-emerald-500" :
                  log.action === 'Rejected' ? "bg-rose-500/20 text-rose-500" :
                  "bg-zinc-800 text-zinc-400"
                )}>
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-200">
                    <span className="text-zinc-400">{log.admin}</span> {log.action}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 mb-1">{log.target}</div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wide">{format(log.timestamp, 'HH:mm')}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
