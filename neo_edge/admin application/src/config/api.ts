const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:5000');

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    ANALYZE: `${API_BASE_URL}/api/analyze`,
    ANALYZE_BULK: `${API_BASE_URL}/api/analyze-bulk`,
    DELETE_VIDEOS: `${API_BASE_URL}/api/delete-videos`,
    QUERY: `${API_BASE_URL}/api/query`,
    HEALTH: `${API_BASE_URL}/api/health`,
    PUBLISH: `${API_BASE_URL}/api/publish`,
    VIDEOS: `${API_BASE_URL}/api/videos`,
    EXTRACT_VIDEOS: `${API_BASE_URL}/api/extract-videos`,
    TO_APPROVE_VIDEOS: `${API_BASE_URL}/api/to-approve-videos`,
    UPDATE_APPROVAL: `${API_BASE_URL}/api/update-video-approval`,
    APPROVE_AND_ANALYZE: `${API_BASE_URL}/api/approve-and-analyze`,
    INSIGHT_CHAINS: `${API_BASE_URL}/api/insight-chains`,
    INSIGHT_CHAIN_DETAIL: `${API_BASE_URL}/api/insight-chains`,
    INSIGHT_CHAIN_RELATED: `${API_BASE_URL}/api/insight-chains`,
    INSIGHT_CHAINS_INDUSTRIES: `${API_BASE_URL}/api/insight-chains/industries/list`,
    SCHEDULER_STATUS: `${API_BASE_URL}/api/scheduler/status`,
    SCHEDULER_START: `${API_BASE_URL}/api/scheduler/start`,
    SCHEDULER_STOP: `${API_BASE_URL}/api/scheduler/stop`,
    SCHEDULER_RUN_NOW: `${API_BASE_URL}/api/scheduler/run-now`,
  },
};

