import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button, cn } from '../components/ui/Shared';
import { getVideos, backendVideoToUI, type Video } from '../lib/api';
import { deleteVideos } from '../utils/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Search, Filter, MoreHorizontal, FileText, Mic, BarChart2, MonitorPlay, Loader2, AlertCircle, Trash2, Download, ChevronDown, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { format } from 'date-fns';

type StatusFilter = 'all' | 'approved' | 'published';

export const Repository = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVideos();
      const data = (res?.data ?? []).map(backendVideoToUI);
      setVideos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const filteredVideos = useMemo(() => {
    let result = videos;
    if (statusFilter !== 'all') {
      result = result.filter((v) => v.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.channel.toLowerCase().includes(q) ||
          v.id.toLowerCase().includes(q) ||
          (v.description && v.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [videos, searchQuery, statusFilter]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Channel', 'Duration', 'Score', 'Status', 'Video URL', 'Description'];
    const rows = filteredVideos.map((v) => [
      v.id,
      `"${(v.title || '').replace(/"/g, '""')}"`,
      `"${(v.channel || '').replace(/"/g, '""')}"`,
      v.duration,
      v.qualityScore?.toFixed(1) ?? '',
      v.status,
      v.videoUrl || `https://www.youtube.com/watch?v=${v.id}`,
      `"${(v.description || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repository-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (video: Video) => {
    const url = video.videoUrl || `https://www.youtube.com/watch?v=${video.id}`;
    if (!window.confirm(`Delete "${video.title}" from repository? This will remove all transcript, 18D, and graph data.`)) return;
    setDeletingId(video.id);
    try {
      await deleteVideos([url]);
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete video');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] py-12">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] py-12 gap-4">
        <AlertCircle className="w-12 h-12 text-rose-400" />
        <p className="text-zinc-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
         <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, channel, or ID..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
         </div>
         <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="md">
                  <Filter size={16} className="mr-2" /> Filter
                  {statusFilter !== 'all' && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs">{statusFilter}</span>
                  )}
                  <ChevronDown size={14} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem onSelect={() => setStatusFilter('all')} className={cn(statusFilter === 'all' && 'bg-cyan-900/30')}>
                  {statusFilter === 'all' ? <Check size={14} className="mr-2 shrink-0" /> : <span className="w-[14px] mr-2 inline-block" />}
                  All ({videos.length})
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setStatusFilter('approved')} className={cn(statusFilter === 'approved' && 'bg-cyan-900/30')}>
                  {statusFilter === 'approved' ? <Check size={14} className="mr-2 shrink-0" /> : <span className="w-[14px] mr-2 inline-block" />}
                  Approved ({videos.filter((v) => v.status === 'approved').length})
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setStatusFilter('published')} className={cn(statusFilter === 'published' && 'bg-cyan-900/30')}>
                  {statusFilter === 'published' ? <Check size={14} className="mr-2 shrink-0" /> : <span className="w-[14px] mr-2 inline-block" />}
                  Published ({videos.filter((v) => v.status === 'published').length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="secondary" size="md" onClick={handleExportCSV} disabled={filteredVideos.length === 0}>
              <Download size={16} className="mr-2" /> Export CSV
            </Button>
         </div>
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-x-auto bg-zinc-900/30 backdrop-blur-sm">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500 font-medium">
              <th className="p-4 font-medium">Video Details</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Score</th>
              <th className="p-4 font-medium">Processing Pipeline</th>
              <th className="p-4 font-medium text-right whitespace-nowrap sticky right-0 bg-zinc-900/95 backdrop-blur-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVideos.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-zinc-500">
                  {videos.length === 0 ? 'No videos in repository yet.' : 'No videos match your search or filter.'}
                </td>
              </tr>
            ) : (
              filteredVideos.map((video) => (
                <tr key={video.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors group">
                  <td className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-14 shrink-0 rounded overflow-hidden bg-zinc-900">
                        <ImageWithFallback
                          src={video.thumbnail}
                          fallbackSrc={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      </div>
                      <div className="min-w-0 max-w-sm">
                        <div className="text-zinc-200 font-medium truncate mb-1">{video.title}</div>
                        <div className="text-zinc-500 text-xs flex flex-wrap gap-x-2 gap-y-0.5">
                          <span>{video.channel}</span>
                          <span>•</span>
                          <span>{video.duration}</span>
                          <span>•</span>
                          <span className="font-mono">{video.id}</span>
                        </div>
                        {video.description && (
                          <p className="text-zinc-600 text-xs mt-1 line-clamp-2">{video.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize",
                      video.status === 'published' ? "bg-emerald-900/30 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                    )}>
                      {video.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className={cn("inline-flex items-center px-2 py-1 rounded text-xs font-bold",
                      video.qualityScore >= 8 ? "text-emerald-400 bg-emerald-500/10" :
                      video.qualityScore >= 7 ? "text-cyan-400 bg-cyan-500/10" :
                      "text-zinc-400 bg-zinc-500/10"
                    )}>
                      {video.qualityScore ? video.qualityScore.toFixed(1) : '—'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <PipelineStep icon={FileText} status="complete" tooltip="Transcript" />
                      <div className="w-2 h-px bg-zinc-800" />
                      <PipelineStep icon={Mic} status="complete" tooltip="Audio" />
                      <div className="w-2 h-px bg-zinc-800" />
                      <PipelineStep icon={BarChart2} status="complete" tooltip="Analysis" />
                      <div className="w-2 h-px bg-zinc-800" />
                      <PipelineStep icon={MonitorPlay} status={video.status === 'published' ? 'complete' : 'pending'} tooltip="Published" />
                    </div>
                  </td>
                  <td className="p-4 text-right sticky right-0 bg-zinc-900/80 backdrop-blur-sm">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 border border-transparent hover:border-zinc-700">
                          <MoreHorizontal size={18} />
                          <span className="text-xs font-medium">Actions</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                        <DropdownMenuItem
                          onClick={() => handleDelete(video)}
                          disabled={deletingId === video.id}
                          className="text-rose-400 focus:text-rose-400 focus:bg-rose-900/20"
                        >
                          {deletingId === video.id ? <Loader2 size={14} className="animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />}
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PipelineStep = ({ icon: Icon, status, tooltip }: { icon: any, status: 'complete' | 'processing' | 'pending', tooltip: string }) => {
  return (
    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border transition-all",
      status === 'complete' ? "bg-emerald-900/20 border-emerald-900/50 text-emerald-500" :
      status === 'processing' ? "bg-amber-900/20 border-amber-900/50 text-amber-500 animate-pulse" :
      "bg-zinc-900 border-zinc-800 text-zinc-700"
    )} title={tooltip}>
      <Icon size={14} />
    </div>
  );
};
