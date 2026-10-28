import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Warning: Supabase credentials not set in environment variables');
}

export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

async function resolveVideoUuid(videoIdOrUuid) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  if (videoIdOrUuid?.match?.(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return videoIdOrUuid;
  }

  const { data: videoData, error: videoError } = await supabase
    .from('videos')
    .select('id')
    .eq('video_id', videoIdOrUuid)
    .single();

  if (videoError || !videoData) {
    throw new Error(`No video found with video_id: ${videoIdOrUuid}`);
  }

  return videoData.id;
}

/**
 * Insert or update video in Supabase
 */
export async function upsertVideo(videoData) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('videos')
    .upsert({
      video_id: videoData.videoId,
      video_url: videoData.videoUrl,
      title: videoData.title,
      channel_title: videoData.channelTitle,
      description: videoData.description || '',
      thumbnail: videoData.thumbnail || '',
      duration_seconds: videoData.durationSeconds || 0,
      language: videoData.language || 'en',
      transcript_text: videoData.transcriptText || null,
      source_type: videoData.sourceType || null,
      recorded_at: videoData.recordedAt || null,
      status: videoData.status || 'new',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'video_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting video:', error);
    throw new Error(`Failed to save video: ${error.message}`);
  }

  return data;
}

/**
 * Update video with transcript text
 */
export async function updateVideoTranscript(videoId, transcriptText, language = 'en') {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // First get the video UUID
  const { data: videoData, error: videoError } = await supabase
    .from('videos')
    .select('id')
    .eq('video_id', videoId)
    .single();

  if (videoError || !videoData) {
    throw new Error(`No video found with video_id: ${videoId}`);
  }

  const { data, error } = await supabase
    .from('videos')
    .update({
      transcript_text: transcriptText,
      language: language,
      updated_at: new Date().toISOString()
    })
    .eq('id', videoData.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating video transcript:', error);
    throw new Error(`Failed to update video transcript: ${error.message}`);
  }

  return data;
}

/**
 * Insert 18-D extraction data into data_18d table
 */
export async function insert18DExtraction(videoIdOrUuid, extraction, modelUsed = 'gpt-4.1', tokensUsed = null, confidence = null) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const videoUuid = await resolveVideoUuid(videoIdOrUuid);
  const feedsArray = Array.isArray(extraction.feeds) ? extraction.feeds : [];

  // Map extraction to data_18d columns
  const data18d = {
    video_id: videoUuid,
    metadata: extraction.metadata || {},
    personas_roles_context: Array.isArray(extraction.personas_roles_context) ? extraction.personas_roles_context : [],
    core_definition_of_agentic_ai: extraction.core_definition_of_agentic_ai || {},
    problem_statement: extraction.problem_statement ? [extraction.problem_statement] : [],
    use_cases_applications: Array.isArray(extraction.use_cases_applications) ? extraction.use_cases_applications : [],
    business_value_narrative: extraction.business_value_narrative || {},
    quantitative_or_qualitative_impact: Array.isArray(extraction.quantitative_or_qualitative_impact) ? extraction.quantitative_or_qualitative_impact : [],
    risks_constraints: Array.isArray(extraction.risks_constraints) ? extraction.risks_constraints : [],
    enabling_technologies: Array.isArray(extraction.enabling_technologies) ? extraction.enabling_technologies : [],
    organizational_implications: extraction.organizational_implications || {},
    industry_context_and_analogues: Array.isArray(extraction.industry_context_and_analogues) ? extraction.industry_context_and_analogues : [],
    customer_experience_dimension: extraction.customer_experience_dimension || {},
    trust_ethics_narrative: extraction.trust_ethics_narrative || {},
    future_vision_trend_indicators: Array.isArray(extraction.future_vision_trend_indicators) ? extraction.future_vision_trend_indicators : [],
    quotable_insights: Array.isArray(extraction.quotable_insights) ? extraction.quotable_insights : [],
    sentiment_and_tone: extraction.sentiment_and_tone || {},
    cross_references_brands_examples: Array.isArray(extraction.cross_references_brands_examples) ? extraction.cross_references_brands_examples : [],
    structural_narrative_segments: Array.isArray(extraction.structural_narrative_segments) ? extraction.structural_narrative_segments : [],
    provenance: extraction.provenance || {},
    feeds: feedsArray,
    key_words: Array.isArray(extraction.key_words) ? extraction.key_words : (typeof extraction.key_words === 'string' ? [extraction.key_words] : []),
    key_insight: Array.isArray(extraction.key_insight) ? extraction.key_insight : (typeof extraction.key_insight === 'string' ? [extraction.key_insight] : []),
    confidence: confidence,
    model_used: modelUsed,
    tokens_used: tokensUsed,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('data_18d')
    .upsert(data18d, {
      onConflict: 'video_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting 18-D extraction:', error);
    throw new Error(`Failed to save 18-D extraction: ${error.message}`);
  }

  return data;
}

/**
 * Replace all feed entries for a video
 */
export async function replaceVideoFeeds(videoIdOrUuid, feeds = [], videoContext = {}) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const videoUuid = await resolveVideoUuid(videoIdOrUuid);

  // Remove previous feeds
  await supabase.from('feeds').delete().eq('video_id', videoUuid);

  if (!feeds || feeds.length === 0) {
    return [];
  }

  const safeFeeds = feeds
    .filter(feed => feed && (feed.headline || feed.summary))
    .slice(0, 4)
    .map((feed, index) => {
      const feedId = feed.feed_id || crypto.createHash('sha256')
        .update(`${videoUuid}-${index}-${feed.headline || feed.summary || ''}`)
        .digest('hex');

      return {
        feed_id: feedId,
        video_id: videoUuid,
        author_name: feed.author_name || feed.author || null,
        author_handle: feed.author_handle || null,
        author_role: feed.author_role || null,
        vendor: feed.vendor || videoContext?.videoDetails?.channelTitle || null,
        product: feed.product || null,
        impact: feed.impact || feed.impact_level || null,
        headline: feed.headline || feed.title || '',
        summary: feed.summary || '',
        highlights: Array.isArray(feed.highlights) ? feed.highlights : [],
        tags: Array.isArray(feed.tags) ? feed.tags : [],
        trending_label: feed.trending_label || null,
        trending_reason: feed.trending_reason || null,
        read_more_url: feed.read_more_url || videoContext.videoUrl || null,
        time_ago: feed.time_ago || null,
        posted_at: feed.timestamp || null,
        video_reference: feed.video_reference || { video_id: videoContext.videoId || null }
      };
    });

  if (safeFeeds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('feeds')
    .insert(safeFeeds)
    .select();

  if (error) {
    console.error('Error inserting feeds:', error);
    throw new Error(`Failed to save feeds: ${error.message}`);
  }

  return data;
}

/**
 * Get 18-D extraction by video ID
 */
export async function get18DExtraction(videoId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // First get the video UUID
  const { data: videoData, error: videoError } = await supabase
    .from('videos')
    .select('id')
    .eq('video_id', videoId)
    .single();

  if (videoError || !videoData) {
    throw new Error(`No video found with video_id: ${videoId}`);
  }

  const { data, error } = await supabase
    .from('data_18d')
    .select('*')
    .eq('video_id', videoData.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching 18-D extraction:', error);
    throw new Error(`Failed to fetch 18-D extraction: ${error.message}`);
  }

  return data;
}

/**
 * Update video selected status
 */
export async function updateVideoSelected(videoId, selected = 'yes') {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('videos')
    .update({
      selected: selected,
      updated_at: new Date().toISOString()
    })
    .eq('video_id', videoId)
    .select()
    .single();

  if (error) {
    console.error('Error updating video selected status:', error);
    throw new Error(`Failed to update video selected status: ${error.message}`);
  }

  return data;
}

/**
 * Get all videos from Supabase
 */
/**
 * Extract video ID from YouTube URL
 */
export function extractVideoIdFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Delete video and all related data from Supabase
 * This will cascade delete related records due to foreign key constraints
 */
export async function deleteVideoByVideoId(videoId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // First, get the video UUID
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('id')
      .eq('video_id', videoId)
      .single();

    if (videoError || !videoData) {
      return {
        success: false,
        message: `Video not found: ${videoId}`,
        videoId: videoId
      };
    }

    const videoUuid = videoData.id;

    // Delete from to_approve_videos (approval queue)
    await supabase.from('to_approve_videos').delete().eq('video_id', videoId);

    // Delete from feeds table
    await supabase.from('feeds').delete().eq('video_id', videoUuid);

    // Delete from data_18d table
    await supabase.from('data_18d').delete().eq('video_id', videoUuid);

    // Delete from transcript_chunks table
    await supabase.from('transcript_chunks').delete().eq('video_id', videoUuid);

    // Delete from transcripts table
    await supabase.from('transcripts').delete().eq('video_id', videoUuid);

    // Finally, delete the video from videos table
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoUuid);

    if (deleteError) {
      throw new Error(`Failed to delete video: ${deleteError.message}`);
    }

    return {
      success: true,
      message: `Video deleted successfully: ${videoId}`,
      videoId: videoId,
      videoUuid: videoUuid
    };
  } catch (error) {
    console.error(`Error deleting video ${videoId}:`, error);
    return {
      success: false,
      message: error.message || `Failed to delete video: ${videoId}`,
      videoId: videoId
    };
  }
}

/**
 * Delete multiple videos by their video IDs
 */
export async function deleteVideosByVideoIds(videoIds) {
  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    videoIds.map(videoId => deleteVideoByVideoId(videoId))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        success: false,
        message: result.reason?.message || 'Unknown error',
        videoId: videoIds[index]
      };
    }
  });
}

export async function getAllVideos() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('videos')
    .select('id, video_id, video_url, title, channel_title, description, thumbnail, duration_seconds, created_at, selected')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching videos:', error);
    throw new Error(`Failed to fetch videos: ${error.message}`);
  }

  const videos = data || [];
  if (videos.length === 0) return videos;

  const videoIds = videos.map((v) => v.video_id);
  const { data: toApprove } = await supabase
    .from('to_approve_videos')
    .select('video_id, score')
    .in('video_id', videoIds);

  const scoreMap = Object.fromEntries((toApprove || []).map((r) => [r.video_id, r.score]));

  return videos.map((v) => ({
    ...v,
    score: scoreMap[v.video_id] ?? null
  }));
}

/**
 * Insert transcript chunk with embedding (now uses video_id)
 */
export async function insertTranscriptChunk(chunkData) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // If videoId is provided as string, convert to UUID
  let videoUuid = chunkData.videoId;
  if (typeof videoUuid === 'string' && !videoUuid.includes('-')) {
    // It's a video_id string, need to get UUID
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('id')
      .eq('video_id', videoUuid)
      .single();

    if (videoError || !videoData) {
      throw new Error(`No video found with video_id: ${videoUuid}`);
    }
    videoUuid = videoData.id;
  }

  const { data, error } = await supabase
    .from('transcript_chunks')
    .insert({
      video_id: videoUuid,
      chunk_index: chunkData.chunkIndex,
      chunk_text: chunkData.chunkText,
      embedding: chunkData.embedding,
      char_start: chunkData.charStart,
      char_end: chunkData.charEnd
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting transcript chunk:', error);
    throw new Error(`Failed to save transcript chunk: ${error.message}`);
  }

  return data;
}

/**
 * Search transcript chunks by video ID using vector similarity
 */
export async function searchChunksByVideoId(videoId, queryEmbedding, matchThreshold = 0.5, matchCount = 3) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // First get the video record to get its UUID
  const { data: videoData, error: videoError } = await supabase
    .from('videos')
    .select('id')
    .eq('video_id', videoId)
    .single();

  if (videoError || !videoData) {
    throw new Error(`No video found with video_id: ${videoId}`);
  }

  const videoUuid = videoData.id;

  // Search chunks directly by video_id
  return await searchChunksByVideoUuid(videoUuid, queryEmbedding, matchThreshold, matchCount);
}

/**
 * Search all chunks across all videos using vector similarity
 */
export async function searchAllChunks(queryEmbedding, matchThreshold = 0.5, matchCount = 10) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  console.log(`Searching all chunks across all videos with threshold ${matchThreshold}`);

  // Get all chunks with video information
  const { data: chunks, error: queryError } = await supabase
    .from('transcript_chunks')
    .select('id, chunk_text, chunk_index, char_start, char_end, embedding, video_id, videos(id, video_id, title, video_url, channel_title)')
    .not('embedding', 'is', null);

  if (queryError) {
    throw new Error(`Failed to search chunks: ${queryError.message}`);
  }

  if (!chunks || chunks.length === 0) {
    console.log('No chunks found across all videos');
    return [];
  }

  console.log(`Found ${chunks.length} chunks across all videos, calculating similarities...`);

  // Helper function to parse embedding
  function parseEmbedding(embedding) {
    if (!embedding) return null;
    if (Array.isArray(embedding)) return embedding;
    if (typeof embedding === 'string') {
      try {
        const parsed = JSON.parse(embedding);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        const cleaned = embedding.replace(/[\[\]]/g, '').trim();
        if (cleaned) {
          const values = cleaned.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
          if (values.length > 0) return values;
        }
      }
    }
    return null;
  }

  // Ensure queryEmbedding is an array
  const queryEmbeddingArray = Array.isArray(queryEmbedding) ? queryEmbedding : parseEmbedding(queryEmbedding);
  if (!queryEmbeddingArray || !Array.isArray(queryEmbeddingArray)) {
    throw new Error('Query embedding is not a valid array');
  }

  // Calculate cosine similarity for all chunks
  const results = chunks
    .map((chunk, idx) => {
      if (!chunk.embedding) return null;

      const chunkEmbedding = parseEmbedding(chunk.embedding);
      if (!chunkEmbedding || !Array.isArray(chunkEmbedding)) return null;

      const similarity = cosineSimilarity(queryEmbeddingArray, chunkEmbedding);

      // Get video info from joined data
      const videoInfo = chunk.videos;

      return {
        id: chunk.id,
        chunk_text: chunk.chunk_text,
        chunk_index: chunk.chunk_index,
        char_start: chunk.char_start,
        char_end: chunk.char_end,
        similarity: similarity,
        video_id: videoInfo?.video_id || null,
        video_title: videoInfo?.title || null,
        video_url: videoInfo?.video_url || null,
        channel_title: videoInfo?.channel_title || null
      };
    })
    .filter(item => item !== null)
    .sort((a, b) => b.similarity - a.similarity);

  console.log(`Similarity scores (top 5): ${results.slice(0, 5).map(r => r.similarity.toFixed(3)).join(', ')}`);

  // Filter by threshold and return top N
  let effectiveThreshold = matchThreshold;
  let filtered = results
    .filter(item => item.similarity >= effectiveThreshold)
    .slice(0, matchCount);

  // If no results, try lower threshold
  if (filtered.length === 0 && results.length > 0) {
    console.log(`No results above threshold ${matchThreshold}, trying with lower threshold 0.3...`);
    effectiveThreshold = 0.3;
    filtered = results
      .filter(item => item.similarity >= effectiveThreshold)
      .slice(0, matchCount);
  }

  // If still no results, return top N regardless
  if (filtered.length === 0 && results.length > 0) {
    console.log(`No results above threshold ${effectiveThreshold}, returning top ${matchCount} chunks regardless of threshold...`);
    filtered = results.slice(0, matchCount);
  }

  console.log(`Returning ${filtered.length} chunks from ${new Set(filtered.map(r => r.video_id)).size} videos (threshold used: ${effectiveThreshold})`);

  return filtered;
}

/**
 * Search chunks by video UUID (helper function)
 */
async function searchChunksByVideoUuid(videoUuid, queryEmbedding, matchThreshold = 0.5, matchCount = 3) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  console.log(`Searching chunks for video ${videoUuid} with threshold ${matchThreshold}`);

  // Direct query with manual similarity calculation (more reliable than RPC)
  const { data: chunks, error: queryError } = await supabase
    .from('transcript_chunks')
    .select('id, chunk_text, chunk_index, char_start, char_end, embedding')
    .eq('video_id', videoUuid)
    .not('embedding', 'is', null);

  if (queryError) {
    throw new Error(`Failed to search chunks: ${queryError.message}`);
  }

  if (!chunks || chunks.length === 0) {
    console.log(`No chunks found for video ${videoUuid}`);
    return [];
  }

  console.log(`Found ${chunks.length} chunks for video ${videoUuid}, calculating similarities...`);

  // Helper function to parse embedding (Supabase vector type might be string or array)
  function parseEmbedding(embedding) {
    if (!embedding) return null;
    if (Array.isArray(embedding)) return embedding;
    if (typeof embedding === 'string') {
      try {
        // Try parsing as JSON array string
        const parsed = JSON.parse(embedding);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // If not JSON, might be comma-separated or bracket format
        // Remove brackets and split by comma
        const cleaned = embedding.replace(/[\[\]]/g, '').trim();
        if (cleaned) {
          const values = cleaned.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
          if (values.length > 0) return values;
        }
      }
    }
    return null;
  }

  // Ensure queryEmbedding is an array
  const queryEmbeddingArray = Array.isArray(queryEmbedding) ? queryEmbedding : parseEmbedding(queryEmbedding);
  if (!queryEmbeddingArray || !Array.isArray(queryEmbeddingArray)) {
    throw new Error('Query embedding is not a valid array');
  }

  console.log(`Query embedding type: ${typeof queryEmbedding}, length: ${queryEmbeddingArray.length}`);

  // Calculate cosine similarity manually for all chunks
  const results = chunks
    .map((chunk, idx) => {
      if (!chunk.embedding) {
        console.log(`Chunk ${idx} has no embedding`);
        return null;
      }

      // Parse chunk embedding
      const chunkEmbedding = parseEmbedding(chunk.embedding);
      if (!chunkEmbedding || !Array.isArray(chunkEmbedding)) {
        console.log(`Chunk ${idx} embedding type: ${typeof chunk.embedding}, parsed: ${chunkEmbedding ? 'array' : 'null'}`);
        return null;
      }

      const similarity = cosineSimilarity(queryEmbeddingArray, chunkEmbedding);

      if (idx < 2) {
        console.log(`Chunk ${idx} similarity: ${similarity.toFixed(4)}, embedding length: ${chunkEmbedding.length}`);
      }

      return {
        id: chunk.id,
        chunk_text: chunk.chunk_text,
        chunk_index: chunk.chunk_index,
        char_start: chunk.char_start,
        char_end: chunk.char_end,
        similarity: similarity
      };
    })
    .filter(item => item !== null)
    .sort((a, b) => b.similarity - a.similarity);

  console.log(`Similarity scores (top 5): ${results.slice(0, 5).map(r => r.similarity.toFixed(3)).join(', ')}`);

  // If no results above threshold, lower it temporarily to see what we get
  let effectiveThreshold = matchThreshold;
  let filtered = results
    .filter(item => item.similarity >= effectiveThreshold)
    .slice(0, matchCount);

  // If no results, try with lower threshold (0.3) to see if we get anything
  if (filtered.length === 0 && results.length > 0) {
    console.log(`No results above threshold ${matchThreshold}, trying with lower threshold 0.3...`);
    effectiveThreshold = 0.3;
    filtered = results
      .filter(item => item.similarity >= effectiveThreshold)
      .slice(0, matchCount);
  }

  // If still no results, return top 3 regardless of threshold (for debugging)
  if (filtered.length === 0 && results.length > 0) {
    console.log(`No results above threshold ${effectiveThreshold}, returning top ${matchCount} chunks regardless of threshold...`);
    filtered = results.slice(0, matchCount);
  }

  console.log(`Returning ${filtered.length} chunks (threshold used: ${effectiveThreshold})`);

  return filtered;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Insert or update video in to_approve_videos table
 */
export async function upsertToApproveVideo(videoData) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('to_approve_videos')
    .upsert({
      video_id: videoData.video_id,
      video_url: videoData.video_url,
      title: videoData.title,
      description: videoData.description,
      thumbnail: videoData.thumbnail,
      channel_title: videoData.channel_title,
      channel_id: videoData.channel_id,
      duration_seconds: videoData.duration_seconds || 0,
      view_count: videoData.view_count || 0,
      published_at: videoData.published_at || null,
      score: videoData.score,
      approval_status: videoData.approval_status || 'pending',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'video_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting to_approve_video:', error);
    throw new Error(`Failed to save video to approve: ${error.message}`);
  }

  return data;
}

/**
 * Get all videos from to_approve_videos table
 */
// FieldNote queue quarantine: hide everything queued before the source-first
// gate went live (2026-10-14). Pre-FieldNote rows were scored by the old
// keyword rubric and are off-scope. Nothing is deleted; change or remove this
// cutoff to bring the old backlog back into the review queue.
const FIELDNOTE_QUEUE_CUTOFF = '2026-10-14T00:00:00Z';

export async function getToApproveVideos(approvalStatus = null) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('to_approve_videos')
    .select('*')
    .gte('created_at', FIELDNOTE_QUEUE_CUTOFF)
    .order('created_at', { ascending: false });

  if (approvalStatus) {
    query = query.eq('approval_status', approvalStatus);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching to_approve_videos:', error);
    throw new Error(`Failed to fetch videos: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single to_approve video by video_id
 */
export async function getToApproveVideoByVideoId(videoId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('to_approve_videos')
    .select('*')
    .eq('video_id', videoId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Update approval status of a video
 */
export async function updateVideoApprovalStatus(videoId, approvalStatus) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  if (!['yes', 'no', 'pending'].includes(approvalStatus)) {
    throw new Error('Invalid approval status. Must be "yes", "no", or "pending"');
  }

  const { data, error } = await supabase
    .from('to_approve_videos')
    .update({
      approval_status: approvalStatus,
      updated_at: new Date().toISOString()
    })
    .eq('video_id', videoId)
    .select()
    .single();

  if (error) {
    console.error('Error updating approval status:', error);
    throw new Error(`Failed to update approval status: ${error.message}`);
  }

  return data;
}


/**
 * Get feed videos with filtering and pagination
 */
export async function getFeedVideos({ page = 1, limit = 12, vendor = null, function: functionName = null, days = null }) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('feeds')
    .select(`
      id,
      feed_id,
      author_name,
      author_handle,
      author_role,
      vendor,
      product,
      impact,
      headline,
      summary,
      highlights,
      tags,
      trending_label,
      trending_reason,
      read_more_url,
      time_ago,
      posted_at,
      created_at,
      videos!inner (
      video_id,
        video_url,
      title,
      channel_title,
      thumbnail,
        created_at
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  // Apply filters
  if (vendor) {
    query = query.ilike('vendor', `%${vendor}%`);
  }

  if (days) {
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    query = query.gte('created_at', date.toISOString());
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching feed videos:', error);
    throw new Error(`Failed to fetch feed videos: ${error.message}`);
  }

  // Transform data for frontend
  const videos = data.map(feed => {
    const highlights = Array.isArray(feed.highlights) ? feed.highlights : [];
    const tags = Array.isArray(feed.tags) ? feed.tags : [];
    const videoMeta = feed.videos || {};

    return {
      id: feed.feed_id,
      title: feed.headline,
      summary: feed.summary,
      author: feed.author_name,
      handle: feed.author_handle,
      vendor: feed.vendor,
      product: feed.product,
      impact: feed.impact,
      highlights,
      tags,
      trendingLabel: feed.trending_label,
      trendingReason: feed.trending_reason,
      timeAgo: feed.time_ago,
      timestamp: feed.posted_at || feed.created_at,
      raw_timestamp: feed.created_at,
      videoUrl: feed.read_more_url || videoMeta.video_url,
      videoId: videoMeta.video_id,
      source: videoMeta.channel_title,
      thumbnailUrl: videoMeta.thumbnail
    };
  });

  return { videos, count };
}

/**
 * Get spotlight video (most recent selected or high scoring)
 */
export async function getSpotlightVideo() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Try to get a 'selected' video first
  let { data, error } = await supabase
    .from('videos')
    .select(`
      id,
      video_id,
      title,
      channel_title,
      created_at,
      data_18d (
        quotable_insights,
        metadata
      )
    `)
    .eq('selected', 'yes')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is not found
    console.error('Error fetching spotlight video:', error);
  }

  // If no selected video, get the most recent one
  if (!data) {
    const result = await supabase
      .from('videos')
      .select(`
        id,
        video_id,
        title,
        channel_title,
        created_at,
        data_18d (
          quotable_insights,
          metadata
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    data = result.data;
    error = result.error;
  }

  if (error || !data) {
    return null;
  }

  const extraction = data.data_18d?.[0] || {};
  const insights = extraction.quotable_insights
    ? extraction.quotable_insights.slice(0, 3).map(i => typeof i === 'string' ? i : i.quote || i.text)
    : [];

  return {
    title: data.title,
    vendor: data.channel_title,
    date: new Date(data.created_at).toLocaleDateString(),
    insights: insights.length > 0 ? insights : ['No insights available'],
    videoId: data.video_id,
    videoUrl: `https://www.youtube.com/watch?v=${data.video_id}`
  };
}
