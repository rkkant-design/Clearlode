import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Card, Badge, Button, cn } from '../components/ui/Shared';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../components/ui/collapsible';
import { ScoreRing } from '../components/ScoreRing';
import {
  getToApproveVideos,
  updateVideoApproval,
  approveAndAnalyzeVideo,
  publishVideo,
  extractVideos,
  analyzeVideo,
  analyzeVideosBulk,
  toApproveVideoToUI,
  extractVideoIdFromUrl,
  getSchedulerStatus,
  startScheduler,
  stopScheduler,
  type Video,
  type SchedulerStatus,
} from '../lib/api';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Play, Pause, Check, X, Youtube, RefreshCw, FileText, Link as LinkIcon, Share2, AlertCircle, ChevronDown, ChevronRight, Info, Layers, Clock, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Ingestion = () => {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
  const [manualMode, setManualMode] = useState<'single' | 'bulk'>('single');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingVideos, setProcessingVideos] = useState<{ id: string; title: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [batchResult, setBatchResult] = useState<{
    processed: Video[];
    approvedCount: number;
    results?: { url: string; status: string; error?: string; data?: { videoDetails?: any; transcript?: string; extraction?: any } }[];
  } | null>(null);
  const [singleUrlInput, setSingleUrlInput] = useState('');
  const [bulkUrlInput, setBulkUrlInput] = useState('');

  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [schedulerBusy, setSchedulerBusy] = useState(false);

  const refreshSchedulerStatus = useCallback(async () => {
    try {
      const res = await getSchedulerStatus();
      setScheduler(res.data);
    } catch {
      // status endpoint unreachable (e.g. backend down) — leave as unknown
      setScheduler(null);
    }
  }, []);

  useEffect(() => {
    refreshSchedulerStatus();
    const id = setInterval(refreshSchedulerStatus, 30000);
    return () => clearInterval(id);
  }, [refreshSchedulerStatus]);

  const toggleScheduler = async () => {
    setSchedulerBusy(true);
    setError(null);
    try {
      const res = scheduler?.enabled ? await stopScheduler() : await startScheduler();
      setScheduler(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change auto-fetch state');
    } finally {
      setSchedulerBusy(false);
    }
  };

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getToApproveVideos();
      const data = (res?.data ?? []).map(toApproveVideoToUI);
      setVideos(data.filter((v) => v.status === 'pending'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'auto') fetchVideos();
  }, [activeTab, fetchVideos]);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'hold' | 'publish') => {
    if (action === 'approve') {
      const video = videos.find((v) => v.id === id);
      if (!video) return;
      setError(null);
      setProcessingVideos((prev) => [...prev, { id, title: video.title }]);
      approveAndAnalyzeVideo(id)
        .then(() => {
          setVideos((prev) => prev.filter((v) => v.id !== id));
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Analysis failed');
        })
        .finally(() => {
          setProcessingVideos((prev) => prev.filter((p) => p.id !== id));
        });
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      if (action === 'publish') {
        await publishVideo(id);
        setVideos((prev) => prev.filter((v) => v.id !== id));
        if (batchResult) {
          setBatchResult((prev) =>
            prev ? { ...prev, processed: prev.processed.filter((v) => v.id !== id), approvedCount: Math.max(0, (prev.approvedCount ?? 0) - 1) } : null
          );
        }
      } else {
        const status = action === 'reject' ? 'no' : 'pending';
        await updateVideoApproval(id, status);
        if (action === 'reject') {
          setVideos((prev) => prev.filter((v) => v.id !== id));
        } else {
          setVideos((prev) =>
            prev.map((v) => (v.id === id ? { ...v, status: 'held' as const } : v))
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleFetch = async () => {
    setProcessing(true);
    setError(null);
    try {
      await extractVideos();
      await fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extract failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (manualMode === 'single' && !singleUrlInput.trim()) return;
    if (manualMode === 'bulk' && !bulkUrlInput.trim()) return;

    setProcessing(true);
    setError(null);
    setBatchResult(null);

    try {
      if (manualMode === 'single') {
        const url = singleUrlInput.trim();
        const result = await analyzeVideo(url);
        setBatchResult({
          processed: [],
          approvedCount: 0,
          results: [{ url, status: 'success', data: result }],
        });
        setSingleUrlInput('');
      } else {
        const urls = bulkUrlInput.split('\n').map((l) => l.trim()).filter(Boolean);
        if (urls.length === 0) return;
        const bulkRes = await analyzeVideosBulk(urls);
        const results = (bulkRes?.results ?? []).map((r) => ({
          url: r.url,
          status: r.status,
          error: r.error,
          data: r.data,
        }));
        setBatchResult({
          processed: [],
          approvedCount: 0,
          results,
        });
        setBulkUrlInput('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handlePublishBatch = async () => {
    if (!batchResult) return;
    const approvedIds = batchResult.processed.filter((v) => v.status === 'approved').map((v) => v.id);
    setProcessing(true);
    try {
      for (const id of approvedIds) {
        await publishVideo(id);
      }
      setVideos((prev) => prev.map((v) => (approvedIds.includes(v.id) ? { ...v, status: 'published' as const } : v)));
      setBatchResult((prev) =>
        prev ? { ...prev, processed: prev.processed.map((v) => (v.status === 'approved' ? { ...v, status: 'published' as const } : v)), approvedCount: 0 } : null
      );
      await fetchVideos();
    } catch (err) {
      console.error('Publish batch failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const resetManualForm = () => {
    setBatchResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 w-fit">
          <button
            onClick={() => setActiveTab('auto')}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'auto' ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200")}
          >
            Automated Feed
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'manual' ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200")}
          >
            Manual Submission
          </button>
        </div>

        {activeTab === 'auto' && (
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Button
              variant={scheduler?.enabled ? 'danger' : 'success'}
              onClick={toggleScheduler}
              disabled={schedulerBusy || scheduler === null}
              className="w-full md:w-auto"
            >
              {schedulerBusy ? (
                <RefreshCw className="animate-spin mr-2" size={16} />
              ) : scheduler?.enabled ? (
                <Pause className="mr-2" size={16} />
              ) : (
                <Play className="mr-2" size={16} />
              )}
              {scheduler === null
                ? 'Auto-Fetch'
                : scheduler.enabled
                ? 'Stop Auto-Fetch'
                : 'Start Auto-Fetch'}
            </Button>
            <Button variant="primary" onClick={handleFetch} disabled={processing} className="w-full md:w-auto">
              {processing ? <RefreshCw className="animate-spin mr-2" size={16} /> : <RefreshCw className="mr-2" size={16} />}
              {processing ? 'Fetching...' : 'Force Refresh Feed'}
            </Button>
          </div>
        )}
      </div>

      {activeTab === 'auto' && scheduler && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 px-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs">
          <span className="flex items-center gap-2">
            <Power size={14} className={scheduler.enabled ? 'text-emerald-400' : 'text-zinc-500'} />
            <span className="text-zinc-400">Auto-fetch:</span>
            <span className={scheduler.enabled ? 'text-emerald-400 font-medium' : 'text-zinc-400 font-medium'}>
              {scheduler.enabled ? 'Running' : 'Stopped'}
            </span>
          </span>
          {scheduler.running && (
            <span className="flex items-center gap-2 text-cyan-400">
              <RefreshCw size={14} className="animate-spin" /> Fetching now…
            </span>
          )}
          <span className="flex items-center gap-2 text-zinc-500">
            <Clock size={14} />
            Every {Math.round(scheduler.intervalMs / 60000)} min
          </span>
          {scheduler.lastRunAt && (
            <span className="text-zinc-500">
              Last run: {format(new Date(scheduler.lastRunAt), 'MMM d, HH:mm')}
            </span>
          )}
          {scheduler.enabled && scheduler.nextRunAt && (
            <span className="text-zinc-500">
              Next run: {format(new Date(scheduler.nextRunAt), 'MMM d, HH:mm')}
            </span>
          )}
        </div>
      )}

      {processingVideos.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-cyan-900/20 border border-cyan-900/50 rounded-lg text-cyan-400">
          <RefreshCw className="animate-spin shrink-0" size={18} />
          <span>
            Processing: {processingVideos.length === 1
              ? (processingVideos[0].title.length > 60 ? processingVideos[0].title.slice(0, 60) + '…' : processingVideos[0].title)
              : processingVideos.slice(0, 2).map((p) => (p.title.length > 40 ? p.title.slice(0, 40) + '…' : p.title)).join(', ') +
                (processingVideos.length > 2 ? ` and ${processingVideos.length - 2} more` : '')}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-900/20 border border-rose-900/50 rounded-lg text-rose-400">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'auto' ? (
          <motion.div key="auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                <p>No pending videos.</p>
              </div>
            ) : (
              videos.map((video) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  onAction={handleAction}
                  processing={processing}
                  processingIds={processingVideos.map((p) => p.id)}
                />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="p-8 max-w-4xl mx-auto">
              {!batchResult ? (
                <>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Youtube size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-100">Manual Video Ingestion</h2>
                    <p className="text-zinc-400 mt-2 text-sm">Submit specific URLs for immediate scoring and quality assessment.</p>
                  </div>

                  <div className="flex justify-center mb-8">
                    <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
                      <button
                        onClick={() => setManualMode('single')}
                        className={cn("px-4 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-all", manualMode === 'single' ? "bg-zinc-800 text-cyan-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        <LinkIcon size={14} />
                        Single URL
                      </button>
                      <button
                        onClick={() => setManualMode('bulk')}
                        className={cn("px-4 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-all", manualMode === 'bulk' ? "bg-zinc-800 text-cyan-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        <FileText size={14} />
                        Bulk Upload
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {manualMode === 'single' ? (
                      <motion.div key="single" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">YouTube URL</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={singleUrlInput}
                            onChange={(e) => setSingleUrlInput(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-zinc-700"
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="bulk" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Bulk URLs (One per line)</label>
                          <textarea
                            rows={6}
                            value={bulkUrlInput}
                            onChange={(e) => setBulkUrlInput(e.target.value)}
                            placeholder={"https://youtube.com/watch?v=...\nhttps://youtube.com/watch?v=..."}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-zinc-700 resize-none font-mono text-xs leading-relaxed"
                          />
                        </div>
                      </motion.div>
                    )}

                    <div className="pt-4 border-t border-zinc-800 flex justify-end">
                      <Button variant="primary" className="w-full md:w-auto" onClick={handleManualSubmit} disabled={processing}>
                        {processing ? (
                          <span className="flex items-center">
                            <RefreshCw className="animate-spin mr-2" size={14} /> Processing...
                          </span>
                        ) : manualMode === 'single' ? (
                          'Ingest & Assess'
                        ) : (
                          'Process Bulk Batch'
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-cyan-900/20 text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-100">Processing Complete</h2>
                    <p className="text-zinc-400 mt-2 text-sm">
                      {batchResult.results && batchResult.results.length > 0 ? (
                        <>
                          {batchResult.results.length === 1 && batchResult.results[0].status === 'success' ? (
                            'Video analyzed and added to Repository.'
                          ) : (
                            <>
                              <span className="text-emerald-400 font-medium">
                                {batchResult.results.filter((r) => r.status === 'success').length} succeeded
                              </span>
                              {batchResult.results.some((r) => r.status === 'error') && (
                                <span className="text-rose-400 font-medium ml-2">
                                  {batchResult.results.filter((r) => r.status === 'error').length} failed
                                </span>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <>Processed {batchResult.processed.length} video{batchResult.processed.length !== 1 ? 's' : ''}.</>
                      )}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-zinc-950/50 rounded-lg border border-zinc-800 max-h-[200px] overflow-y-auto">
                      {batchResult.results?.map((r, i) => (
                        <div key={i} className="p-3 border-b border-zinc-800/50 last:border-0 flex items-center gap-3">
                          <span className={r.status === 'error' ? 'text-rose-400' : 'text-emerald-400'}>{r.status === 'error' ? <X size={16} /> : <Check size={16} />}</span>
                          <span className="text-xs text-zinc-400 truncate flex-1 font-mono">{r.url}</span>
                          {r.status === 'error' ? (
                            <span className="text-xs text-rose-400 shrink-0">{r.error}</span>
                          ) : (
                            <Badge variant="outline" className="text-emerald-400 border-emerald-900/30 shrink-0">Success</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    {batchResult.results?.some((r) => r.status === 'success' && r.data) && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Preview</p>
                        {batchResult.results
                          ?.filter((r) => r.status === 'success' && r.data)
                          .map((r, i) => (
                            <UploadPreviewCard
                              key={i}
                              url={r.url}
                              data={r.data!}
                              defaultOpen={batchResult.results!.length === 1}
                            />
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-zinc-800">
                    <Button variant="ghost" onClick={resetManualForm}>Submit More</Button>
                    {batchResult.approvedCount > 0 && (
                      <Button variant="primary" onClick={handlePublishBatch} disabled={processing}>
                        <Share2 size={16} className="mr-2" />
                        Publish {batchResult.approvedCount} Approved
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function UploadPreviewCard({
  url,
  data,
  defaultOpen = false,
}: {
  url: string;
  data: { videoDetails?: any; transcript?: string; extraction?: any };
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const details = data?.videoDetails ?? {};
  const transcript = data?.transcript ?? '';
  const extraction = data?.extraction ?? {};
  const meta = extraction?.metadata ?? {};
  const problem = extraction?.problem_statement ?? {};
  const useCases = extraction?.use_cases_applications ?? [];
  const feeds = extraction?.feeds ?? [];
  const keyWords = extraction?.key_words ?? [];
  const keyInsight = extraction?.key_insight ?? [];
  const transcriptPreview = transcript.length > 500 ? transcript.slice(0, 500) : transcript;
  const hasMoreTranscript = transcript.length > 500;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-zinc-800 rounded-lg overflow-hidden">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-2 p-3 text-left hover:bg-zinc-800/30 transition-colors text-zinc-300"
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="text-sm font-medium truncate flex-1">
            {details?.title || url}
          </span>
          <Badge variant="outline" className="text-emerald-400 border-emerald-900/30 shrink-0">View Preview</Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 pt-0 border-t border-zinc-800 bg-zinc-950/30">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="bg-zinc-900 border border-zinc-800 mb-4 w-full justify-start">
              <TabsTrigger value="details" className="gap-1.5">
                <Info size={14} /> Details
              </TabsTrigger>
              <TabsTrigger value="transcript" className="gap-1.5">
                <FileText size={14} /> Transcript
              </TabsTrigger>
              <TabsTrigger value="18d" className="gap-1.5">
                <Layers size={14} /> 18D
              </TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-3 mt-0">
              <div className="flex gap-4">
                {details?.thumbnail && (
                  <img src={details.thumbnail} alt="" className="w-32 h-20 object-cover rounded bg-zinc-800 shrink-0" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium text-zinc-100">{details?.title || '—'}</p>
                  <p className="text-xs text-zinc-500">{details?.channelTitle || '—'}</p>
                  <p className="text-xs text-zinc-500">{details?.durationMin != null ? `${details.durationMin} min` : '—'}</p>
                </div>
              </div>
              {details?.description && (
                <p className="text-xs text-zinc-400 line-clamp-3">{details.description}</p>
              )}
            </TabsContent>
            <TabsContent value="transcript" className="mt-0">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 max-h-48 overflow-y-auto">
                {transcript ? (
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap">
                    {showFullTranscript ? transcript : transcriptPreview}
                    {hasMoreTranscript && !showFullTranscript && '…'}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No transcript available</p>
                )}
              </div>
              {hasMoreTranscript && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowFullTranscript((v) => !v)}
                >
                  {showFullTranscript ? 'Show less' : 'Show more'}
                </Button>
              )}
            </TabsContent>
            <TabsContent value="18d" className="mt-0 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400 uppercase">Metadata</p>
                <div className="text-xs text-zinc-300 space-y-1">
                  <p><span className="text-zinc-500">Source:</span> {meta?.source_type || '—'}</p>
                  <p><span className="text-zinc-500">Speakers:</span> {(meta?.speakers ?? []).join(', ') || '—'}</p>
                  <p><span className="text-zinc-500">Organizations:</span> {(meta?.organizations ?? []).join(', ') || '—'}</p>
                </div>
              </div>
              {problem?.text && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400 uppercase">Problem Statement</p>
                  <p className="text-xs text-zinc-300">{problem.label && <span className="text-cyan-400">{problem.label}: </span>}{problem.text}</p>
                  {problem.quote && <p className="text-xs text-zinc-500 italic">"{problem.quote}"</p>}
                </div>
              )}
              {useCases.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400 uppercase">Use Cases</p>
                  <div className="space-y-2">
                    {useCases.map((uc: any, i: number) => (
                      <div key={i} className="text-xs text-zinc-300 border-l-2 border-cyan-900/50 pl-2">
                        <p className="font-medium text-zinc-200">{uc.name || '—'}</p>
                        <p>{uc.description || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {feeds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400 uppercase">Feeds</p>
                  <div className="space-y-2">
                    {feeds.slice(0, 3).map((f: any, i: number) => (
                      <div key={i} className="text-xs text-zinc-300 border border-zinc-800 rounded p-2">
                        <p className="font-medium text-zinc-200">{f.headline || '—'}</p>
                        <p>{f.summary || '—'}</p>
                        {Array.isArray(f.tags) && f.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {f.tags.map((t: string, j: number) => (
                              <span key={j} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[10px]">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(keyWords.length > 0 || keyInsight.length > 0) && (
                <div className="space-y-2">
                  {keyWords.length > 0 && (
                    <p className="text-xs"><span className="text-zinc-500">Keywords:</span> {keyWords.join(', ')}</p>
                  )}
                  {keyInsight.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-400 uppercase mb-1">Key Insights</p>
                      <ul className="text-xs text-zinc-300 list-disc list-inside space-y-0.5">
                        {keyInsight.map((k: string, i: number) => <li key={i}>{k}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const VideoRow = ({
  video,
  onAction,
  processing,
  processingIds,
}: {
  video: Video;
  onAction: (id: string, action: 'approve' | 'reject' | 'hold' | 'publish') => void;
  processing: boolean;
  processingIds: string[];
}) => {
  const isThisProcessing = processingIds.includes(video.id);
  return (
    <Card className="p-4 flex flex-col md:flex-row gap-6 items-start md:items-center group hover:border-zinc-700 transition-colors">
      <div className="relative w-full md:w-48 aspect-video rounded-lg overflow-hidden shrink-0 bg-zinc-950">
        <ImageWithFallback
            src={video.thumbnail}
            alt={video.title}
            fallbackSrc={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">{video.duration}</div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <Play className="text-white drop-shadow-lg" size={32} fill="white" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[10px]">{video.source}</Badge>
          <span className="text-zinc-500 text-xs">• {format(video.fetchedAt, 'MMM d, HH:mm')}</span>
        </div>
        <h3 className="text-zinc-100 font-semibold truncate pr-4 text-base mb-1 group-hover:text-cyan-400 transition-colors">{video.title}</h3>
        <p className="text-zinc-400 text-xs mb-3 flex items-center gap-2">
          <span className="font-medium text-zinc-300">{video.channel}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
          <span>{video.metrics.views.toLocaleString()} views</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {video.topics.map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0 px-4 border-l border-zinc-800/50">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Quality</span>
        <ScoreRing score={video.qualityScore} size={48} strokeWidth={4} />
      </div>

      <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto justify-end md:justify-center border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-4">
        {video.status === 'pending' ? (
          <>
            <Button size="sm" variant="success" onClick={() => onAction(video.id, 'approve')} className="w-full" disabled={processing || isThisProcessing}>
              {isThisProcessing ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : <Check size={14} className="mr-1.5" />}
              {isThisProcessing ? 'Processing…' : 'Approve'}
            </Button>
            <Button size="sm" variant="danger" onClick={() => onAction(video.id, 'reject')} className="w-full" disabled={processing || isThisProcessing}>
              <X size={14} className="mr-1.5" /> Reject
            </Button>
          </>
        ) : video.status === 'approved' ? (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white w-full shadow-emerald-900/20 shadow-lg" onClick={() => onAction(video.id, 'publish')} disabled={processing}>
            <Share2 size={14} className="mr-1.5" /> Publish
          </Button>
        ) : video.status === 'published' ? (
          <div className="text-sm font-medium flex items-center justify-center h-full px-4 py-2 rounded-lg border bg-cyan-900/10 border-cyan-900/30 text-cyan-400">Published</div>
        ) : (
          <div className="text-sm font-medium flex items-center justify-center h-full px-4 py-2 rounded-lg border bg-rose-900/10 border-rose-900/30 text-rose-400">Rejected</div>
        )}
      </div>
    </Card>
  );
};
