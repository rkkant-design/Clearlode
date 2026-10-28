/**
 * API integration layer - re-exports backend API helpers and provides
 * transformers from backend data to Neoadminconsole UI format.
 */
import {
  getVideos,
  getToApproveVideos,
  updateVideoApproval,
  approveAndAnalyzeVideo,
  publishVideo,
  extractVideos,
  analyzeVideo,
  analyzeVideosBulk,
  getSchedulerStatus,
  startScheduler,
  stopScheduler,
  runSchedulerNow,
  type Video as BackendVideo,
  type ToApproveVideo,
  type SchedulerStatus,
} from '../utils/api';

export {
  getVideos,
  getToApproveVideos,
  updateVideoApproval,
  approveAndAnalyzeVideo,
  publishVideo,
  extractVideos,
  analyzeVideo,
  analyzeVideosBulk,
  getSchedulerStatus,
  startScheduler,
  stopScheduler,
  runSchedulerNow,
};
export type { SchedulerStatus };

export interface Video {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  publishedAt: Date;
  fetchedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'held' | 'published' | 'unpublished';
  source: 'automated' | 'manual';
  qualityScore: number;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    subscribers: number;
    engagementRate: number;
  };
  topics: string[];
  videoUrl?: string;
  description?: string;
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function isValidThumbnailUrl(url: unknown): url is string {
  return typeof url === 'string' && url.startsWith('http') && url.length > 10;
}

export function extractVideoIdFromUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function toApproveVideoToUI(v: ToApproveVideo): Video {
  const thumb = isValidThumbnailUrl(v.thumbnail) ? v.thumbnail : getYouTubeThumbnail(v.video_id);
  return {
    id: v.video_id,
    title: v.title ?? 'Untitled',
    channel: v.channel_title ?? '',
    thumbnail: thumb,
    duration: formatDuration(v.duration_seconds ?? 0),
    publishedAt: v.published_at ? new Date(v.published_at) : new Date(v.created_at),
    fetchedAt: new Date(v.created_at),
    status: v.approval_status === 'yes' ? 'approved' : v.approval_status === 'no' ? 'rejected' : 'pending',
    source: 'automated',
    qualityScore: v.score ?? 0,
    metrics: {
      views: v.view_count ?? 0,
      likes: 0,
      comments: 0,
      subscribers: 0,
      engagementRate: 0,
    },
    topics: [],
  };
}

export function backendVideoToUI(v: BackendVideo & { score?: number | null }): Video {
  const secs = v.duration_seconds;
  const thumb = isValidThumbnailUrl(v.thumbnail) ? v.thumbnail : getYouTubeThumbnail(v.video_id);
  return {
    id: v.video_id,
    title: v.title ?? 'Untitled',
    channel: v.channel_title ?? '',
    thumbnail: thumb,
    duration: formatDuration(secs),
    publishedAt: new Date(v.created_at),
    fetchedAt: new Date(v.created_at),
    status: v.selected ? 'published' : 'approved',
    source: 'automated',
    qualityScore: v.score ?? 0,
    metrics: { views: 0, likes: 0, comments: 0, subscribers: 0, engagementRate: 0 },
    topics: [],
    videoUrl: v.video_url,
    description: v.description ?? undefined,
  };
}
