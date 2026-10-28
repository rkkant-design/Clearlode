import { API_CONFIG } from '../config/api';

export interface ApiError {
  error: string;
  details?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error: Failed to connect to server');
  }
}

export async function analyzeVideo(url: string) {
  return apiRequest(API_CONFIG.ENDPOINTS.ANALYZE, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export interface BulkAnalyzeResult {
  url: string;
  index: number;
  status: 'success' | 'error';
  data?: any;
  error?: string;
  details?: string;
  published?: boolean;
}

export interface BulkAnalyzeResponse {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: BulkAnalyzeResult[];
}

export async function analyzeVideosBulk(urls: string[]): Promise<BulkAnalyzeResponse> {
  return apiRequest<BulkAnalyzeResponse>(API_CONFIG.ENDPOINTS.ANALYZE_BULK, {
    method: 'POST',
    body: JSON.stringify({ urls }),
  });
}

export interface DeleteVideoResult {
  videoId: string;
  url: string;
  supabase: {
    success: boolean;
    message: string;
  };
  neo4j: {
    success: boolean;
    message: string;
  };
  overallSuccess: boolean;
}

export interface DeleteVideosResponse {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: DeleteVideoResult[];
}

export async function deleteVideos(urls: string[]): Promise<DeleteVideosResponse> {
  return apiRequest<DeleteVideosResponse>(API_CONFIG.ENDPOINTS.DELETE_VIDEOS, {
    method: 'POST',
    body: JSON.stringify({ urls }),
  });
}

export async function queryKnowledgeBase(query: string, videoId: string | null) {
  return apiRequest(API_CONFIG.ENDPOINTS.QUERY, {
    method: 'POST',
    body: JSON.stringify({ query, videoId }),
  });
}

export async function checkHealth() {
  return apiRequest(API_CONFIG.ENDPOINTS.HEALTH);
}

export async function publishVideo(videoId: string) {
  return apiRequest<{ success: boolean; data: any }>(API_CONFIG.ENDPOINTS.PUBLISH, {
    method: 'POST',
    body: JSON.stringify({ videoId }),
  });
}

export interface Video {
  id: string;
  video_id: string;
  video_url: string;
  title: string | null;
  channel_title: string | null;
  duration_seconds: number | null;
  created_at: string;
  selected: string | null;
}

export async function getVideos() {
  return apiRequest<{ success: boolean; data: Video[] }>(API_CONFIG.ENDPOINTS.VIDEOS);
}

export interface ToApproveVideo {
  id: string;
  video_id: string;
  video_url: string;
  title: string | null;
  description: string | null;
  thumbnail: string | null;
  channel_title: string | null;
  channel_id: string | null;
  duration_seconds: number;
  view_count: number;
  published_at: string | null;
  score: number;
  approval_status: 'pending' | 'yes' | 'no';
  created_at: string;
  updated_at: string;
}

export async function extractVideos() {
  return apiRequest<{ success: boolean; fetched: number; scored: number; filtered: number; stored: number; errors: number }>(API_CONFIG.ENDPOINTS.EXTRACT_VIDEOS, {
    method: 'POST',
  });
}

export async function getToApproveVideos(approvalStatus?: string) {
  const url = approvalStatus 
    ? `${API_CONFIG.ENDPOINTS.TO_APPROVE_VIDEOS}?approval_status=${approvalStatus}`
    : API_CONFIG.ENDPOINTS.TO_APPROVE_VIDEOS;
  return apiRequest<{ success: boolean; data: ToApproveVideo[] }>(url);
}

export async function updateVideoApproval(videoId: string, approvalStatus: 'yes' | 'no' | 'pending') {
  return apiRequest<{ success: boolean; data: ToApproveVideo }>(API_CONFIG.ENDPOINTS.UPDATE_APPROVAL, {
    method: 'POST',
    body: JSON.stringify({ videoId, approvalStatus }),
  });
}

export async function approveAndAnalyzeVideo(videoId: string) {
  return apiRequest<{ success: boolean; message: string }>(API_CONFIG.ENDPOINTS.APPROVE_AND_ANALYZE, {
    method: 'POST',
    body: JSON.stringify({ videoId }),
  });
}

export interface ChainNode {
  id: string;
  type: 'problem' | 'useCase' | 'benefit' | 'metric';
  label: string;
  description: string;
  text?: string;
  quote?: string;
  industries: string[];
  metrics?: string[];
  principles?: string[];
  trends?: string[];
  confidence?: number;
  videoCount?: number;
  // UseCase specific
  actions?: string[];
  channels?: string[];
  tools_apis?: string[];
  // Metric specific
  metric_name?: string;
  value_or_description?: string;
  unit?: string;
  timeframe?: string;
}

export interface Chain {
  id: string;
  title: string;
  industry: string;
  problem: ChainNode;
  useCase: ChainNode;
  benefit: ChainNode;
  metric: ChainNode;
  occurrenceCount: number;
  similarityScore?: number;
}

export async function getInsightChains(industry?: string) {
  const url = industry 
    ? `${API_CONFIG.ENDPOINTS.INSIGHT_CHAINS}?industry=${encodeURIComponent(industry)}`
    : API_CONFIG.ENDPOINTS.INSIGHT_CHAINS;
  return apiRequest<{ success: boolean; data: Chain[] }>(url);
}

export async function getChainDetail(chainId: string) {
  return apiRequest<{ success: boolean; data: Chain }>(`${API_CONFIG.ENDPOINTS.INSIGHT_CHAIN_DETAIL}/${chainId}`);
}

export async function getRelatedChains(chainId: string, limit: number = 5) {
  return apiRequest<{ success: boolean; data: Chain[] }>(`${API_CONFIG.ENDPOINTS.INSIGHT_CHAIN_RELATED}/${chainId}/related?limit=${limit}`);
}

export async function getIndustries() {
  return apiRequest<{ success: boolean; data: string[] }>(API_CONFIG.ENDPOINTS.INSIGHT_CHAINS_INDUSTRIES);
}

export interface SchedulerStatus {
  enabled: boolean;
  running: boolean;
  intervalMs: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastResult: any;
}

export async function getSchedulerStatus() {
  return apiRequest<{ success: boolean; data: SchedulerStatus }>(API_CONFIG.ENDPOINTS.SCHEDULER_STATUS);
}

export async function startScheduler() {
  return apiRequest<{ success: boolean; started: boolean; data: SchedulerStatus }>(API_CONFIG.ENDPOINTS.SCHEDULER_START, {
    method: 'POST',
  });
}

export async function stopScheduler() {
  return apiRequest<{ success: boolean; stopped: boolean; data: SchedulerStatus }>(API_CONFIG.ENDPOINTS.SCHEDULER_STOP, {
    method: 'POST',
  });
}

export async function runSchedulerNow() {
  return apiRequest<{ success: boolean; message: string; data: SchedulerStatus }>(API_CONFIG.ENDPOINTS.SCHEDULER_RUN_NOW, {
    method: 'POST',
  });
}

