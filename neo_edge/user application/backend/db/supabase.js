import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized');
} else {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in environment variables');
}

export { supabase };

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
    // FieldNote: only published records (selected='yes') reach the consumer feed
    .eq('videos.selected', 'yes')
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
      highlights: highlights,
      tags: tags,
      trendingLabel: feed.trending_label,
      trendingReason: feed.trending_reason,
      timeAgo: feed.time_ago,
      timestamp: feed.posted_at || feed.created_at,
      raw_timestamp: feed.created_at,
      videoUrl: feed.read_more_url || videoMeta.video_url,
      videoId: videoMeta.video_id,
      source: videoMeta.channel_title,
      channel: videoMeta.channel_title,
      channel_title: videoMeta.channel_title,
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
        key_insight,
        metadata
      )
    `)
    .eq('selected', 'yes')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
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
          key_insight,
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

  // data_18d is an object, not an array
  const extraction = data.data_18d || {};
  const insights = extraction.key_insight
    ? (Array.isArray(extraction.key_insight) ? extraction.key_insight : [extraction.key_insight]).slice(0, 3).map(i => typeof i === 'string' ? i : i.quote || i.text || i)
    : [];

  const meta = extraction.metadata || {};
  const operator = Array.isArray(meta.speakers) && meta.speakers.length > 0 ? meta.speakers[0] : null;
  const company = Array.isArray(meta.organizations) && meta.organizations.length > 0
    ? meta.organizations[0]
    : data.channel_title;

  return {
    title: data.title,
    vendor: data.channel_title,
    date: new Date(data.created_at).toLocaleDateString(),
    insights: insights.length > 0 ? insights : ['No insights available'],
    videoId: data.video_id,
    videoUrl: `https://www.youtube.com/watch?v=${data.video_id}`,
    // FieldNote record fields
    evidenceGrade: meta.evidence_grade || null,
    gradeRationale: meta.grade_rationale || null,
    operator,
    company,
    sourceType: meta.source_type || null,
    recordedAt: meta.recorded_at || null
  };
}

/**
 * Get videos (not feeds) with filtering and pagination - for /latest page
 */
export async function getVideos({ page = 1, limit = 12, vendor = null, function: functionName = null, days = null, sort = null, tag = null, company = null }) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // When filtering by tag, company or function we need an inner join so data_18d constrains the parent rows
  const dataJoin = (tag || company || functionName) ? 'data_18d!inner' : 'data_18d';

  let query = supabase
    .from('videos')
    .select(`
      id,
      video_id,
      title,
      channel_title,
      thumbnail,
      video_url,
      created_at,
      ${dataJoin} (
        key_insight,
        key_words,
        metadata
      )
    `, { count: 'exact' })
    // FieldNote: only published records (selected='yes') reach the consumer /latest page
    .eq('selected', 'yes')
    .order('created_at', { ascending: false })
    .range(from, to);

  // Apply filters
  if (vendor) {
    query = query.ilike('channel_title', `%${vendor}%`);
  }

  // FieldNote: filter to records tagged with this keyword (from the trending tags)
  if (tag) {
    query = query.contains('data_18d.key_words', [tag]);
  }

  // FieldNote: filter to records whose deploying company matches (from the companies list)
  if (company) {
    query = query.filter('data_18d.metadata->organizations', 'cs', JSON.stringify([company]));
  }

  // FieldNote: filter to a business function (customer-support, software-engineering, ...)
  if (functionName) {
    query = query.eq('data_18d.metadata->>function', functionName);
  }

  if (days) {
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    query = query.gte('created_at', date.toISOString());
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching videos:', error);
    throw new Error(`Failed to fetch videos: ${error.message}`);
  }

  // Optional sort handling
  let sortedData = Array.isArray(data) ? [...data] : [];

  // "relevance" is a lightweight heuristic (more extracted content = more relevant),
  // with a created_at tiebreaker.
  if (sort === 'relevance') {
    sortedData.sort((a, b) => {
      const aExt = a.data_18d || {};
      const bExt = b.data_18d || {};
      const aInsights = aExt.key_insight ? (Array.isArray(aExt.key_insight) ? aExt.key_insight.length : 1) : 0;
      const bInsights = bExt.key_insight ? (Array.isArray(bExt.key_insight) ? bExt.key_insight.length : 1) : 0;
      const aKw = aExt.key_words ? (Array.isArray(aExt.key_words) ? aExt.key_words.length : 1) : 0;
      const bKw = bExt.key_words ? (Array.isArray(bExt.key_words) ? bExt.key_words.length : 1) : 0;
      const aScore = aInsights * 2 + aKw;
      const bScore = bInsights * 2 + bKw;

      if (bScore !== aScore) return bScore - aScore;

      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }

  // Default "date" sorting is already handled by the DB order(created_at desc)
  // so we only apply if requested explicitly in the future.

  const videos = sortedData.map(video => {
    const extraction = video.data_18d || {};
    const insights = extraction.key_insight
      ? (Array.isArray(extraction.key_insight) ? extraction.key_insight : [extraction.key_insight]).slice(0, 3).map(i => typeof i === 'string' ? i : i.quote || i.text || i)
      : [];
    const keywords = extraction.key_words
      ? (Array.isArray(extraction.key_words) ? extraction.key_words : [extraction.key_words])
      : [];

    // FieldNote: surface the firsthand provenance stored during extraction
    const meta = extraction.metadata || {};
    const operator = Array.isArray(meta.speakers) && meta.speakers.length > 0 ? meta.speakers[0] : null;
    const company = Array.isArray(meta.organizations) && meta.organizations.length > 0
      ? meta.organizations[0]
      : video.channel_title;

    return {
      id: video.video_id,
      title: video.title,
      source: video.channel_title,
      thumbnailUrl: video.thumbnail,
      videoUrl: video.video_url || `https://www.youtube.com/watch?v=${video.video_id}`,
      insights: insights.length > 0 ? insights : ['No insights available yet'],
      tags: keywords,
      timestamp: new Date(video.created_at).toLocaleDateString(),
      // FieldNote record fields
      evidenceGrade: meta.evidence_grade || null,
      gradeRationale: meta.grade_rationale || null,
      operator,
      company,
      sourceType: meta.source_type || null,
      recordedAt: meta.recorded_at || null,
      function: meta.function || null
    };
  });

  return { videos, count };
}

/**
 * Get full video details with 18D extraction
 */
export async function getVideoDetails(videoId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('videos')
    .select(`
      *,
      data_18d (*),
      feeds ( headline, summary, highlights, impact, author_name, author_role, vendor, product )
    `)
    .eq('video_id', videoId)
    .single();

  if (error) {
    console.error('Error fetching video details:', error);
    throw new Error(`Failed to fetch video details: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  console.log('Video data fetched:', {
    video_id: data.video_id,
    title: data.title,
    has_data_18d: !!data.data_18d,
    is_array: Array.isArray(data.data_18d),
    data_18d_keys: data.data_18d ? Object.keys(data.data_18d).slice(0, 5) : 'no data'
  });

  // data_18d is an object, not an array!
  const extraction = data.data_18d || {};
  // feeds is an array; take the first (the FieldNote summary card for this record)
  const feed = Array.isArray(data.feeds) ? data.feeds[0] : (data.feeds || null);

  return {
    ...data,
    extraction,
    feed
  };
}

/**
 * Search transcript chunks using vector similarity
 * @param {Array<number>} queryEmbedding - The embedding vector (1536 dimensions)
 * @param {number} matchThreshold - Similarity threshold (0-1), default 0.7
 * @param {number} matchCount - Number of results to return, default 10
 * @returns {Promise<Array>} Array of matching chunks with similarity scores
 */
export async function searchTranscriptChunks(queryEmbedding, matchThreshold = 0.7, matchCount = 10) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
    throw new Error('Invalid query embedding: must be an array of 1536 numbers');
  }

  try {
    // Use Supabase RPC function if available, otherwise use direct query
    // First, try to use the match_transcripts RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('match_transcripts', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    });

    if (!rpcError && rpcData) {
      // RPC function exists and worked
      return rpcData.map(item => ({
        id: item.id,
        videoId: item.video_id,
        title: item.title,
        videoUrl: item.video_url,
        channelTitle: item.channel_title,
        chunkText: item.transcript_text || item.chunk_text,
        similarity: item.similarity,
        extraction: item.extraction
      }));
    }

    // Fallback: Direct query with manual similarity calculation
    console.log('RPC function not available, using direct query...');
    
    // Get all chunks with embeddings
    const { data: chunks, error: chunksError } = await supabase
      .from('transcript_chunks')
      .select(`
        id,
        chunk_text,
        chunk_index,
        char_start,
        char_end,
        embedding,
        video_id,
        videos!inner (
          id,
          video_id,
          title,
          video_url,
          channel_title
        )
      `)
      .not('embedding', 'is', null)
      .limit(1000); // Limit initial fetch for performance

    if (chunksError) {
      throw new Error(`Failed to fetch chunks: ${chunksError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      return [];
    }

    // Calculate cosine similarity for each chunk
    const similarities = chunks.map(chunk => {
      const chunkEmbedding = parseEmbedding(chunk.embedding);
      if (!chunkEmbedding || !Array.isArray(chunkEmbedding)) {
        return null;
      }

      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      
      // Handle videos relationship - could be object or array depending on Supabase version
      const videoData = Array.isArray(chunk.videos) ? chunk.videos[0] : chunk.videos;
      
      return {
        id: chunk.id,
        videoId: videoData?.video_id || chunk.video_id,
        title: videoData?.title || 'Unknown',
        videoUrl: videoData?.video_url || '',
        channelTitle: videoData?.channel_title || 'Unknown',
        chunkText: chunk.chunk_text,
        chunkIndex: chunk.chunk_index,
        similarity: similarity
      };
    }).filter(item => item !== null && item.similarity >= matchThreshold);

    // Sort by similarity and return top N
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, matchCount);

  } catch (error) {
    console.error('Error searching transcript chunks:', error);
    throw new Error(`Failed to search transcript chunks: ${error.message}`);
  }
}

/**
 * Parse embedding from various formats (array, string, etc.)
 */
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

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Search all chunks across all videos using vector similarity
 * @param {Array<number>} queryEmbedding - The embedding vector (1536 dimensions)
 * @param {number} matchThreshold - Similarity threshold (0-1), default 0.5
 * @param {number} matchCount - Number of results to return, default 10
 * @returns {Promise<Array>} Array of matching chunks with similarity scores
 */
export async function searchAllChunks(queryEmbedding, matchThreshold = 0.5, matchCount = 10) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
    throw new Error('Invalid query embedding: must be an array');
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

  // Calculate cosine similarity for all chunks
  const results = chunks
    .map((chunk) => {
      if (!chunk.embedding) return null;

      const chunkEmbedding = parseEmbedding(chunk.embedding);
      if (!chunkEmbedding || !Array.isArray(chunkEmbedding)) return null;

      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

      // Get video info from joined data
      const videoInfo = Array.isArray(chunk.videos) ? chunk.videos[0] : chunk.videos;

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
 * Get unique vendors/channels from all videos
 */
export async function getUniqueVendors() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('videos')
    .select('channel_title')
    .not('channel_title', 'is', null)
    .order('channel_title', { ascending: true });

  if (error) {
    console.error('Error fetching unique vendors:', error);
    throw new Error(`Failed to fetch unique vendors: ${error.message}`);
  }

  const uniqueVendors = [...new Set(data.map(v => v.channel_title))];
  return uniqueVendors;
}

/**
 * FieldNote: vendors that actually appear in the published feed. Uses feeds.vendor
 * (what getFeedVideos filters on) joined to published videos, so the dropdown
 * values match the records on screen.
 */
export async function getPublishedFeedVendors() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('feeds')
    .select('vendor, videos!inner(selected)')
    .eq('videos.selected', 'yes');

  if (error) {
    console.error('Error fetching published feed vendors:', error);
    throw new Error(`Failed to fetch vendors: ${error.message}`);
  }

  return [...new Set((data || []).map(r => r.vendor).filter(Boolean))].sort();
}

/**
 * Get top trending keywords from all videos
 */
export async function getTrendingKeywords(limit = 5) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('videos')
    .select('data_18d(key_words)')
    // FieldNote: only published records feed the trending list
    .eq('selected', 'yes');

  if (error) {
    console.error('Error fetching trending keywords:', error);
    throw new Error(`Failed to fetch trending keywords: ${error.message}`);
  }

  const keywordCounts = {};

  data.forEach(video => {
    const extraction = video.data_18d || {};
    let keywords = extraction.key_words || [];
    
    if (!Array.isArray(keywords)) {
      keywords = [keywords];
    }

    keywords.forEach(keyword => {
      if (keyword && typeof keyword === 'string' && keyword.trim()) {
        const normalizedKeyword = keyword.trim();
        keywordCounts[normalizedKeyword] = (keywordCounts[normalizedKeyword] || 0) + 1;
      }
    });
  });

  const sortedKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword, count]) => ({ keyword, count }));

  return sortedKeywords;
}

/**
 * FieldNote: top companies among PUBLISHED records (sidebar leaderboard).
 * Groups by the deploying organization from extraction metadata, falling back
 * to the channel. Supabase-only, so it works while Neo4j AuraDB is paused.
 */
export async function getPublishedTopVendors(limit = 5) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('videos')
    .select('channel_title, data_18d(metadata)')
    .eq('selected', 'yes');

  if (error) {
    console.error('Error fetching published vendors:', error);
    throw new Error(`Failed to fetch published vendors: ${error.message}`);
  }

  // Track each company's record count and its best (strongest) evidence grade
  const rank = { A: 4, B: 3, C: 2, D: 1 };
  const agg = {};
  (data || []).forEach(v => {
    const meta = (v.data_18d && v.data_18d.metadata) || {};
    const company = (Array.isArray(meta.organizations) && meta.organizations[0])
      || v.channel_title || 'Unknown';
    const g = (meta.evidence_grade || '').toUpperCase();
    const cur = agg[company] || { count: 0, grade: null };
    cur.count += 1;
    if (g && (!cur.grade || (rank[g] || 0) > (rank[cur.grade] || 0))) cur.grade = g;
    agg[company] = cur;
  });

  // FieldNote: the dot colour encodes the company's best evidence grade
  const gradeColor = (g) => g === 'A' ? 'bg-emerald-500' : g === 'B' ? 'bg-sky-500' : g === 'C' ? 'bg-amber-500' : 'bg-zinc-500';
  return Object.entries(agg)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([name, info]) => ({ name, count: info.count, grade: info.grade || null, color: gradeColor(info.grade) }));
}

/**
 * FieldNote: cross-corpus synthesis for the Benchmarks page. Aggregates all
 * published records: evidence-grade distribution, workflow/tag coverage, and a
 * list of each record's self-reported outcomes.
 */
export async function getBenchmarks() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('videos')
    .select(`
      video_id,
      title,
      created_at,
      data_18d ( metadata, key_words ),
      feeds ( headline, highlights )
    `)
    .eq('selected', 'yes')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching benchmarks:', error);
    throw new Error(`Failed to fetch benchmarks: ${error.message}`);
  }

  const records = (data || []).map(v => {
    const meta = (v.data_18d && v.data_18d.metadata) || {};
    const feed = Array.isArray(v.feeds) ? v.feeds[0] : (v.feeds || {});
    const tags = (v.data_18d && Array.isArray(v.data_18d.key_words)) ? v.data_18d.key_words : [];
    return {
      videoId: v.video_id,
      company: (Array.isArray(meta.organizations) && meta.organizations[0]) || '',
      grade: meta.evidence_grade || null,
      sourceType: meta.source_type || null,
      title: (feed && feed.headline) || v.title,
      outcomes: (feed && Array.isArray(feed.highlights)) ? feed.highlights : [],
      tags: tags.filter(t => typeof t === 'string' && t.trim())
    };
  });

  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0 };
  const tagCounts = {};
  records.forEach(r => {
    const g = (r.grade || '').toUpperCase();
    if (gradeDistribution[g] !== undefined) gradeDistribution[g] += 1;
    r.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
  const tagCoverage = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  return { total: records.length, gradeDistribution, tagCoverage, records };
}

/**
 * FieldNote: trending tags among PUBLISHED records (sidebar). Returns plain
 * strings to match the sidebar component. Supabase-only.
 */
export async function getPublishedTrendingTags(limit = 10) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('videos')
    .select('data_18d(key_words)')
    .eq('selected', 'yes');

  if (error) {
    console.error('Error fetching published trending tags:', error);
    throw new Error(`Failed to fetch published trending tags: ${error.message}`);
  }

  const counts = {};
  (data || []).forEach(v => {
    const ext = v.data_18d || {};
    let kws = ext.key_words || [];
    if (!Array.isArray(kws)) kws = [kws];
    kws.forEach(k => {
      if (k && typeof k === 'string' && k.trim()) {
        const t = k.trim();
        counts[t] = (counts[t] || 0) + 1;
      }
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}
