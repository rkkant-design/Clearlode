import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { analyzeVideo } from './workflow.js';
import { queryRouter } from './query-router.js';
import { createCrossVideoRelationships, backfillComprehensiveRelationships, getInsightChains, getChainDetail, getRelatedChains, getIndustries, updateIndustryCategories, insertMockData, testMockData, getTrendingTags, getTopVendors, deleteVideosFromNeo4j } from './db/neo4j.js';
import { updateVideoSelected, getAllVideos, getToApproveVideos, getToApproveVideoByVideoId, updateVideoApprovalStatus, getFeedVideos, getSpotlightVideo, deleteVideosByVideoIds, extractVideoIdFromUrl } from './db/supabase.js';
import { extractVideos } from './video-extraction-workflow.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    console.log('Analyzing video:', url);
    const result = await analyzeVideo(url);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing video:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to analyze video',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/analyze-bulk', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    if (urls.length === 0) {
      return res.status(400).json({ error: 'At least one URL is required' });
    }

    if (urls.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 URLs allowed per bulk request' });
    }

    // Validate all URLs are strings and not empty
    const validUrls = urls.filter(url => typeof url === 'string' && url.trim().length > 0);
    if (validUrls.length === 0) {
      return res.status(400).json({ error: 'No valid URLs provided' });
    }

    console.log(`Starting bulk analysis for ${validUrls.length} videos...`);

    // Process all videos concurrently (up to 5)
    // Using Promise.allSettled to handle partial failures
    const results = await Promise.allSettled(
      validUrls.map(async (url, index) => {
        try {
          console.log(`[${index + 1}/${validUrls.length}] Analyzing: ${url}`);
          const result = await analyzeVideo(url.trim());
          return {
            url: url.trim(),
            index: index,
            status: 'success',
            data: result
          };
        } catch (error) {
          console.error(`[${index + 1}/${validUrls.length}] Error analyzing ${url}:`, error.message);
          return {
            url: url.trim(),
            index: index,
            status: 'error',
            error: error.message || 'Failed to analyze video',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
          };
        }
      })
    );

    // Transform results to a cleaner format
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: validUrls[index] || 'Unknown',
          index: index,
          status: 'error',
          error: result.reason?.message || 'Unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? result.reason?.stack : undefined
        };
      }
    });

    // Count successes and failures
    const successCount = processedResults.filter(r => r.status === 'success').length;
    const errorCount = processedResults.filter(r => r.status === 'error').length;

    console.log(`Bulk analysis complete: ${successCount} succeeded, ${errorCount} failed`);

    res.json({
      success: true,
      total: validUrls.length,
      succeeded: successCount,
      failed: errorCount,
      results: processedResults
    });

  } catch (error) {
    console.error('Error in bulk analyze:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to process bulk analysis',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/delete-videos', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    if (urls.length === 0) {
      return res.status(400).json({ error: 'At least one URL is required' });
    }

    if (urls.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 URLs allowed per delete request' });
    }

    // Validate all URLs are strings and not empty
    const validUrls = urls.filter(url => typeof url === 'string' && url.trim().length > 0);
    if (validUrls.length === 0) {
      return res.status(400).json({ error: 'No valid URLs provided' });
    }

    // Extract video IDs from URLs
    const videoIds = validUrls.map(url => extractVideoIdFromUrl(url.trim())).filter(id => id !== null);
    
    if (videoIds.length === 0) {
      return res.status(400).json({ error: 'No valid YouTube video IDs found in URLs' });
    }

    console.log(`Starting bulk deletion for ${videoIds.length} videos...`);
    console.log('Video IDs:', videoIds);

    // Delete from Supabase
    console.log('Deleting from Supabase...');
    const supabaseResults = await deleteVideosByVideoIds(videoIds);

    // Delete from Neo4j
    console.log('Deleting from Neo4j...');
    const neo4jResults = await deleteVideosFromNeo4j(videoIds);

    // Combine results
    const combinedResults = videoIds.map((videoId, index) => {
      const supabaseResult = supabaseResults.find(r => r.videoId === videoId) || { success: false, message: 'Not processed' };
      const neo4jResult = neo4jResults.find(r => r.videoId === videoId) || { success: false, message: 'Not processed' };

      const overallSuccess = supabaseResult.success && (neo4jResult.success || neo4jResult.message.includes('not found'));

      return {
        videoId: videoId,
        url: validUrls[index] || '',
        supabase: {
          success: supabaseResult.success,
          message: supabaseResult.message
        },
        neo4j: {
          success: neo4jResult.success || neo4jResult.message.includes('not found'),
          message: neo4jResult.message
        },
        overallSuccess: overallSuccess
      };
    });

    const successCount = combinedResults.filter(r => r.overallSuccess).length;
    const failureCount = combinedResults.filter(r => !r.overallSuccess).length;

    console.log(`Bulk deletion complete: ${successCount} succeeded, ${failureCount} failed`);

    res.json({
      success: true,
      total: videoIds.length,
      succeeded: successCount,
      failed: failureCount,
      results: combinedResults
    });

  } catch (error) {
    console.error('Error in bulk delete:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to delete videos',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const { query, videoId } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    // videoId is now optional - if not provided, search all videos

    console.log('Processing query:', query, videoId ? `for video: ${videoId}` : 'across all videos');
    const result = await queryRouter(query, videoId || null);
    res.json(result);
  } catch (error) {
    console.error('Error processing query:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to process query',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/create-cross-video-relationships', async (req, res) => {
  try {
    console.log('Creating cross-video relationships...');
    const result = await createCrossVideoRelationships();
    res.json(result);
  } catch (error) {
    console.error('Error creating cross-video relationships:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to create cross-video relationships',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/backfill-relationships', async (req, res) => {
  try {
    console.log('Starting backfill of comprehensive relationships for existing data...');
    const result = await backfillComprehensiveRelationships();
    res.json(result);
  } catch (error) {
    console.error('Error backfilling relationships:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to backfill relationships',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/publish', async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    console.log('Publishing video:', videoId);
    const result = await updateVideoSelected(videoId, 'yes');
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error publishing video:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to publish video',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/videos', async (req, res) => {
  try {
    console.log('Fetching all videos...');
    const videos = await getAllVideos();
    res.json({ success: true, data: videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to fetch videos',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Video Extraction Endpoints
app.post('/api/extract-videos', async (req, res) => {
  try {
    console.log('Starting video extraction workflow...');
    const result = await extractVideos();
    res.json(result);
  } catch (error) {
    console.error('Error extracting videos:', error);
    res.status(500).json({
      error: error.message || 'Failed to extract videos',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/to-approve-videos', async (req, res) => {
  try {
    const { approval_status } = req.query;
    const videos = await getToApproveVideos(approval_status || null);
    res.json({ success: true, data: videos });
  } catch (error) {
    console.error('Error fetching to-approve videos:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch videos',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/update-video-approval', async (req, res) => {
  try {
    const { videoId, approvalStatus } = req.body;
    if (!videoId || !approvalStatus) {
      return res.status(400).json({ error: 'videoId and approvalStatus are required' });
    }
    if (!['yes', 'no', 'pending'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'approvalStatus must be "yes", "no", or "pending"' });
    }

    const result = await updateVideoApprovalStatus(videoId, approvalStatus);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating approval status:', error);
    res.status(500).json({
      error: error.message || 'Failed to update approval status',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/approve-and-analyze', async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    const toApprove = await getToApproveVideoByVideoId(videoId);
    if (!toApprove || !toApprove.video_url) {
      return res.status(404).json({ error: 'Video not found in approval queue' });
    }

    console.log('Running 18D analysis for approved video:', videoId);
    await analyzeVideo(toApprove.video_url);
    await updateVideoApprovalStatus(videoId, 'yes');

    res.json({ success: true, message: 'Video analyzed and approved' });
  } catch (error) {
    console.error('Error in approve-and-analyze:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze and approve video',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Insight Chains Endpoints
app.get('/api/insight-chains', async (req, res) => {
  try {
    const { industry } = req.query;
    const chains = await getInsightChains(industry || null);
    res.json({ success: true, data: chains });
  } catch (error) {
    console.error('Error fetching insight chains:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch insight chains',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/insight-chains/:chainId', async (req, res) => {
  try {
    const { chainId } = req.params;
    const chain = await getChainDetail(chainId);
    res.json({ success: true, data: chain });
  } catch (error) {
    console.error('Error fetching chain detail:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch chain detail',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/insight-chains/:chainId/related', async (req, res) => {
  try {
    const { chainId } = req.params;
    const { limit } = req.query;
    const relatedChains = await getRelatedChains(chainId, limit ? parseInt(limit) : 5);
    res.json({ success: true, data: relatedChains });
  } catch (error) {
    console.error('Error fetching related chains:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch related chains',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/insight-chains/industries/list', async (req, res) => {
  try {
    const industries = await getIndustries();
    res.json({ success: true, data: industries });
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch industries',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/update-industry-categories', async (req, res) => {
  try {
    console.log('Starting industry category update...');
    const result = await updateIndustryCategories();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating industry categories:', error);
    res.status(500).json({
      error: error.message || 'Failed to update industry categories',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/insert-mock-data', async (req, res) => {
  try {
    console.log('Starting mock data insertion...');
    const result = await insertMockData();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error inserting mock data:', error);
    res.status(500).json({
      error: error.message || 'Failed to insert mock data',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/test-mock-data', async (req, res) => {
  try {
    const result = await testMockData();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error testing mock data:', error);
    res.status(500).json({
      error: error.message || 'Failed to test mock data',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// Latest Page Endpoints

app.get('/api/feed', async (req, res) => {
  try {
    const { page, limit, vendor, function: func, days } = req.query;
    const result = await getFeedVideos({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 12,
      vendor,
      function: func,
      days
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch feed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/spotlight', async (req, res) => {
  try {
    const result = await getSpotlightVideo();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching spotlight:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch spotlight',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/stats/trending', async (req, res) => {
  try {
    const { limit } = req.query;
    const result = await getTrendingTags(limit ? parseInt(limit) : 10);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching trending tags:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch trending tags',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/stats/vendors', async (req, res) => {
  try {
    const { limit } = req.query;
    const result = await getTopVendors(limit ? parseInt(limit) : 5);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching top vendors:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch top vendors',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ─── Scheduled video extraction (auto-fetch) control ───────────────────
const EXTRACTION_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
let extractionInterval = null;   // setInterval handle (null = scheduler off)
let extractionRunning = false;   // true while a fetch is actively executing
let lastRunAt = null;            // ISO timestamp of the last completed run
let nextRunAt = null;            // ISO timestamp of the next scheduled run
let lastResult = null;           // result (or error) of the last run

async function runExtractionOnce() {
  if (extractionRunning) {
    console.log('Extraction already running, skipping this tick.');
    return;
  }
  extractionRunning = true;
  try {
    console.log('Running scheduled video extraction...');
    lastResult = await extractVideos();
    console.log('Scheduled extraction complete:', lastResult);
  } catch (error) {
    lastResult = { error: error.message };
    console.error('Scheduled extraction failed:', error);
  } finally {
    lastRunAt = new Date().toISOString();
    extractionRunning = false;
    if (extractionInterval) {
      nextRunAt = new Date(Date.now() + EXTRACTION_INTERVAL_MS).toISOString();
    }
  }
}

function startScheduledExtraction() {
  if (extractionInterval) return false; // already scheduled
  extractionInterval = setInterval(runExtractionOnce, EXTRACTION_INTERVAL_MS);
  nextRunAt = new Date(Date.now() + EXTRACTION_INTERVAL_MS).toISOString();
  console.log('Video extraction scheduled (runs every 2 hours)');
  return true;
}

function stopScheduledExtraction() {
  if (!extractionInterval) return false; // already stopped
  clearInterval(extractionInterval);
  extractionInterval = null;
  nextRunAt = null;
  console.log('Video extraction schedule stopped');
  return true;
}

function schedulerStatus() {
  return {
    enabled: extractionInterval !== null,
    running: extractionRunning,
    intervalMs: EXTRACTION_INTERVAL_MS,
    lastRunAt,
    nextRunAt,
    lastResult,
  };
}

app.get('/api/scheduler/status', (req, res) => {
  res.json({ success: true, data: schedulerStatus() });
});

app.post('/api/scheduler/start', (req, res) => {
  const started = startScheduledExtraction();
  res.json({ success: true, started, data: schedulerStatus() });
});

app.post('/api/scheduler/stop', (req, res) => {
  const stopped = stopScheduledExtraction();
  res.json({ success: true, stopped, data: schedulerStatus() });
});

// Trigger one extraction immediately without waiting for the next tick
app.post('/api/scheduler/run-now', (req, res) => {
  if (extractionRunning) {
    return res.status(409).json({ success: false, error: 'An extraction is already running', data: schedulerStatus() });
  }
  runExtractionOnce(); // fire-and-forget; status endpoint reflects progress
  res.json({ success: true, message: 'Extraction triggered', data: schedulerStatus() });
});

// Serve static frontend in production (Railway deployment)
const buildPath = path.join(__dirname, '../build');
if (existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(buildPath, 'index.html'));
  });
  console.log('Serving static frontend from build/');
}

// Auto-start on boot disabled — start manually via POST /api/scheduler/start
// startScheduledExtraction();
console.log('Video extraction scheduler is OFF (start it via POST /api/scheduler/start)');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

