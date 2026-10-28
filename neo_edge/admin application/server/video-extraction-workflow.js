import { StateGraph, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import https from 'https';
import dotenv from 'dotenv';
import { upsertToApproveVideo } from './db/supabase.js';

dotenv.config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/** Parse duration from various formats to seconds */
function parseDurationToSeconds(value) {
  if (!value) return 0;
  if (typeof value === 'number' && !isNaN(value)) return Math.round(value);
  const str = String(value).trim();
  // ISO 8601: PT1H30M45S, PT15M33S
  const isoMatch = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (isoMatch) {
    const h = parseInt(isoMatch[1] || 0);
    const m = parseInt(isoMatch[2] || 0);
    const s = parseInt(isoMatch[3] || 0);
    return h * 3600 + m * 60 + s;
  }
  // Human format: "12:34", "1:23:45"
  const parts = str.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

/** Extract thumbnail URL from various API response structures */
function extractThumbnailUrl(item, videoId) {
  const fallback = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  let thumb = item?.thumbnail || item?.video?.thumbnail;
  if (typeof thumb === 'string' && thumb.startsWith('http')) return thumb;
  if (thumb && typeof thumb === 'object' && thumb.url) return thumb.url;
  const thumbs = item?.thumbnails ?? item?.video?.thumbnails;
  if (thumbs) {
    if (Array.isArray(thumbs) && thumbs[0]?.url) return thumbs[0].url;
    if (typeof thumbs === 'object') {
      const url = thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || thumbs.maxres?.url;
      if (url) return url;
    }
  }
  return fallback;
}

/**
 * Fetch videos from RapidAPI YouTube search
 */
// Generic GET against the yt-api RapidAPI host.
function ytGet(pathWithQuery) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: 'yt-api.p.rapidapi.com',
      port: null,
      path: pathWithQuery,
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'yt-api.p.rapidapi.com'
      }
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });
    req.on('error', (error) => reject(new Error(`API request failed: ${error.message}`)));
    req.end();
  });
}

// Search for videos matching a source-targeted FieldNote query.
async function fetchVideosFromRapidAPI(searchQuery) {
  const q = encodeURIComponent(searchQuery);
  return ytGet(`/search?query=${q}&lang=en&type=video&upload_date=month`);
}

// Crawl a channel's recent uploads (true source-first). Endpoint per the yt-api RapidAPI plan.
async function fetchChannelVideos(channelId) {
  return ytGet(`/channel/videos?id=${encodeURIComponent(channelId)}`);
}

// ---- FieldNote source-first discovery config ----
// 1) Tier-A channels: crawl their recent uploads (true source-first).
//    Paste verified YouTube channel IDs (they start with "UC..."). Leave empty to rely on the
//    source-targeted queries below until the IDs are added (run resolve/lookup, then paste here).
const FIELDNOTE_CHANNELS = [
  { name: 'AI Engineer',                     id: 'UCLKPca3kwwd-B59HNr-_lvA' },
  { name: 'AWS Events (re:Invent)',          id: 'UCdoadna9HFHsxXWhafhNvKw' },
  { name: 'InfoQ / QCon',                    id: 'UCkQX1tChV7Z7l1LFF4L9j_g' },
  { name: 'Sequoia Capital (Training Data)', id: 'UCWrF0oN6unbXrWsTN7RctTw' },
  { name: 'Intercom',                        id: 'UCylCYIzgaURHueT51ClWn8g' },
  // CX / vendor channels that host firsthand customer-support deployment talks
  { name: 'Google Cloud',                    id: 'UCTMRxtyHoE3LPcrl-kT4AQQ' },
  { name: 'Google Workspace',                id: 'UCBmwzQnSoj9b6HzNmFrg_yw' },
  { name: 'Salesforce',                      id: 'UCUpquzY878NEaZm5bc7m2sQ' },
  { name: 'Salesforce ANZ',                  id: 'UC2KfazyiuLraWm31BGjX2IQ' },
  { name: 'Zendesk',                         id: 'UCEsBG5HS3yodOTc30QWsW_A' },
  { name: 'Twilio',                          id: 'UCWh3G9LZmZ3q_xWOyPpn8ag' },
  { name: 'NICE',                            id: 'UCzxnWLrGtM4HZQHaMKDkXZQ' },
  { name: 'a16z',                            id: 'UC9cn0TuPq4dnbTY-CBsm8XA' },
];
// 2) Source-targeted searches that bias toward firsthand operator talks. These search
//    across all of YouTube, so they are the main lever for finding new companies.
const FIELDNOTE_QUERIES = [
  'head of customer support AI agent results',
  'VP customer experience AI deployment results',
  'customer support AI agent case study conference talk',
  'contact center AI automation lessons learned',
  'we deployed AI customer support results',
  'customer service chatbot deployment results COO',
  'enterprise AI customer service deployment case study',
  'how we built our AI support agent production',
  'AI deflection rate customer support results',
  'Salesforce Agentforce customer deployment story',
  'Zendesk AI agents customer story results',
  'Intercom Fin deployment results',
  'Google Cloud contact center AI customer story',
  'AI ticket resolution automation enterprise results',
  'voice AI agent customer service deployment',
  'customer support automation ROI enterprise talk',
  'agentic AI customer service rollout lessons learned',
  'reduced support costs with AI customer case study',
  // Software engineering (second function)
  'how we deployed AI coding agents engineering team',
  'AI code review automation production results',
  'engineering team AI developer productivity case study',
  'we rolled out AI agents for software development results',
  'automated engineering workflows with LLM agents talk',
  'AI pair programming adoption enterprise lessons learned',
];
const PER_SOURCE = 4;    // take the N most recent items per source, so more sources contribute
const MAX_FETCH = 120;   // cap total raw candidates per run (protects API + scoring cost)

// Agent 1: Fetch Videos (source-first: channel whitelist + targeted queries)
async function fetchVideos(state) {
  try {
    if (!RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY is not configured');
    }

    console.log(`Agent 1: Source-first discovery across ${FIELDNOTE_CHANNELS.length} channel(s) + ${FIELDNOTE_QUERIES.length} query(ies)...`);

    let rawList = [];
    const pushFrom = (response, label) => {
      let items = [];
      if (Array.isArray(response)) items = response;
      else if (response && Array.isArray(response.data)) items = response.data;
      else if (response && Array.isArray(response.items)) items = response.items;
      else if (response && Array.isArray(response.results)) items = response.results;
      else if (response && Array.isArray(response.contents)) items = response.contents;
      else { console.warn(`Agent 1: ${label} returned no recognizable list`); return; }
      items = items.slice(0, PER_SOURCE);
      rawList.push(...items);
      console.log(`Agent 1: ${label} -> ${items.length} (raw total ${rawList.length})`);
    };

    // 1) Source-targeted searches first (best lever for finding new companies)
    for (const q of FIELDNOTE_QUERIES) {
      if (rawList.length >= MAX_FETCH) break;
      try { pushFrom(await fetchVideosFromRapidAPI(q), `query "${q}"`); }
      catch (e) { console.error(`Agent 1: query "${q}" failed: ${e.message}`); }
    }
    // 2) Tier-A / vendor channels (source-first)
    for (const ch of FIELDNOTE_CHANNELS) {
      if (rawList.length >= MAX_FETCH) break;
      try { pushFrom(await fetchChannelVideos(ch.id), `channel ${ch.name}`); }
      catch (e) { console.error(`Agent 1: channel ${ch.name} failed: ${e.message}`); }
    }

    if (rawList.length === 0) {
      console.error('Agent 1: No videos returned from any FieldNote source');
      throw new Error('No videos returned from any FieldNote source');
    }

    // Flatten nested video objects (e.g. { video: { videoId, title, ... } })
    const videoList = rawList.map((el) => (el.video ? { ...el.video, channelTitle: el.channelTitle || el.video.channelTitle } : el));

    if (videoList.length === 0) {
      console.log('Agent 1: No videos found in API response');
      return {
        ...state,
        fetchedVideos: []
      };
    }

    const mappedVideos = videoList.map((item) => {
      const videoId = item.videoId || item.id || item.video?.id || '';
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const durationVal = item.lengthSeconds ?? item.length_seconds ?? item.lengthSeconds ?? item.duration ?? item.lengthText ?? item.contentDetails?.duration;
      return {
        video_id: videoId,
        video_url: videoUrl,
        title: item.title || item.video?.title || '',
        description: item.description || item.video?.description || '',
        thumbnail: extractThumbnailUrl(item, videoId),
        channel_title: item.channelTitle || item.channel?.name || item.channel?.title || '',
        channel_id: item.channelId || item.channel?.id || '',
        duration_seconds: parseDurationToSeconds(durationVal),
        view_count: parseInt(item.viewCount || item.view_count || item.views || 0),
        like_count: parseInt(item.likeCount || item.like_count || item.likes || 0),
        comment_count: parseInt(item.commentCount || item.comment_count || item.comments || 0),
        published_at: item.publishedAt || item.published_at || item.publishedTime || null
      };
    });

    // Dedupe across sources by video_id
    const videos = [];
    const seenIds = new Set();
    for (const v of mappedVideos) {
      if (v.video_id && !seenIds.has(v.video_id)) { seenIds.add(v.video_id); videos.push(v); }
    }
    console.log(`Agent 1: ${videos.length} unique videos after dedupe (from ${mappedVideos.length})`);

    // Enrich videos with missing duration/thumbnail via video/info API
    const toEnrich = videos.filter((v) => !v.duration_seconds || v.duration_seconds === 0);
    if (toEnrich.length > 0 && RAPIDAPI_KEY) {
      console.log(`Agent 1: Enriching ${toEnrich.length} videos with missing duration...`);
      for (let i = 0; i < toEnrich.length; i++) {
        try {
          const res = await fetch(`https://yt-api.p.rapidapi.com/video/info?id=${toEnrich[i].video_id}`, {
            headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': 'yt-api.p.rapidapi.com' }
          });
          const info = await res.json();
          if (info && !info.message) {
            const secs = parseDurationToSeconds(info.lengthSeconds ?? info.length_seconds ?? info.lengthInSeconds);
            let thumb = info.thumbnail;
            if (thumb && typeof thumb === 'object') thumb = thumb.url || thumb.high?.url || thumb.medium?.url || thumb.default?.url;
            if (secs > 0) toEnrich[i].duration_seconds = secs;
            if (typeof thumb === 'string' && thumb.startsWith('http')) toEnrich[i].thumbnail = thumb;
          }
        } catch (_) { /* skip on enrich error */ }
        if (i < toEnrich.length - 1) await new Promise((r) => setTimeout(r, 200));
      }
    }

    console.log(`Agent 1: Fetched ${videos.length} videos from RapidAPI`);

    return {
      ...state,
      fetchedVideos: videos
    };
  } catch (error) {
    console.error('Error in Agent 1 (fetchVideos):', error);
    throw new Error(`Failed to fetch videos: ${error.message}`);
  }
}

// Agent 2: Score Videos based on Value
async function scoreVideos(state) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!state.fetchedVideos || state.fetchedVideos.length === 0) {
      return {
        ...state,
        scoredVideos: []
      };
    }

    const llm = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.3,
      openAIApiKey: OPENAI_API_KEY,
    });

    console.log(`Agent 2: Scoring ${state.fetchedVideos.length} videos...`);

    const scoredVideos = [];

    // Score videos in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < state.fetchedVideos.length; i += batchSize) {
      const batch = state.fetchedVideos.slice(i, i + batchSize);
      
      const scoringPromises = batch.map(async (video) => {
        try {
          const prompt = `You are the FieldNote intake gate. FieldNote only accepts FIRSTHAND enterprise AI deployment records in a covered business function (currently CUSTOMER SUPPORT or SOFTWARE ENGINEERING): a NAMED person from a NAMED company describing THEIR OWN deployment, in their own public words. Score each video for how well it fits that bar, from metadata only. Do NOT rely on full transcript analysis.

Input Data:
- Video title: "${video.title}"
- Video description: "${video.description?.substring(0, 1200) || 'No description'}"
- Channel name: "${video.channel_title || 'Unknown'}"
- Video duration: ${video.duration_seconds ? `${Math.floor(video.duration_seconds / 60)} min` : 'Unknown'}
- View count: ${video.view_count ?? 'Unknown'}
- Publish date: ${video.published_at || 'Unknown'}

Score HIGH (7 to 10) only if ALL of these look true from the metadata:
1. Firsthand: a named operator (a Head of CX, VP Support, COO, support or CX lead, or an engineer) or the company itself is speaking, in their own talk, interview, podcast, or on the company's own channel. NOT a journalist, analyst, or any third party narrating them.
2. Named company: a specific company's own deployment, not a generic or hypothetical one.
3. Covered function: the deployment is in one of FieldNote's covered functions — CUSTOMER SUPPORT (tier-1 deflection, chatbots or voicebots, agent assist or copilots, disputes) OR SOFTWARE ENGINEERING (AI coding agents, automated code review, developer-workflow automation, engineering copilots). Not AI in general.
4. Substance: the title or description points to what they did and ideally some result, not just an opinion about AI.

Score LOW (1 to 4) and effectively reject if the video is any of these, even if it is high quality:
- News or journalist coverage, panels, debates, or commentary ABOUT AI.
- Vendor marketing, product demos, or testimonials (the vendor talking, not the customer).
- Influencer explainers, reaction videos, tutorials, full courses, or "what is AI" content.
- General AI hype, doom, policy, or opinion with no named company's own support deployment.

When you are unsure whether it is firsthand, or unsure whether it is about customer support, score LOW. Precision beats volume: it is better to reject a maybe than to admit a non firsthand video.

Return ONLY a JSON object with this exact format:
{
  "score": 7.5,
  "reasoning": "1-2 sentences: name the company and the speaker if firsthand, or say why it was rejected (e.g. news coverage, vendor marketing, not customer support)."
}

Score range: 1 (no fit) to 10 (a clear firsthand customer-support deployment from a named company).`;

          const response = await llm.invoke(prompt);
          let scoreData = response.content.trim();

          // Extract JSON from response
          if (typeof scoreData === 'string') {
            const jsonMatch = scoreData.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              scoreData = jsonMatch[0];
            }
            scoreData = JSON.parse(scoreData);
          }

          const score = parseFloat(scoreData.score) || 0;
          const reasoning = scoreData.reasoning || '';

          console.log(`Agent 2: Scored "${video.title.substring(0, 50)}..." - Score: ${score}`);

          return {
            ...video,
            score: score,
            score_reasoning: reasoning
          };
        } catch (error) {
          console.error(`Error scoring video ${video.video_id}:`, error);
          // Default to low score if scoring fails
          return {
            ...video,
            score: 3.0,
            score_reasoning: 'Scoring failed - default low score'
          };
        }
      });

      const batchResults = await Promise.all(scoringPromises);
      scoredVideos.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < state.fetchedVideos.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Agent 2: Scored ${scoredVideos.length} videos`);

    return {
      ...state,
      scoredVideos: scoredVideos
    };
  } catch (error) {
    console.error('Error in Agent 2 (scoreVideos):', error);
    throw new Error(`Failed to score videos: ${error.message}`);
  }
}

// Agent 3: Filter to firsthand customer-support fit (score >= 7) into the REVIEW queue.
// A human SCRUB still approves before publish. FieldNote never auto-publishes.
async function filterVideos(state) {
  try {
    if (!state.scoredVideos || state.scoredVideos.length === 0) {
      return {
        ...state,
        filteredVideos: []
      };
    }

    const filteredVideos = state.scoredVideos.filter(video => video.score >= 7);

    console.log(`Agent 3: Filtered ${filteredVideos.length} videos with score >= 7 out of ${state.scoredVideos.length} total`);

    return {
      ...state,
      filteredVideos: filteredVideos
    };
  } catch (error) {
    console.error('Error in Agent 3 (filterVideos):', error);
    throw new Error(`Failed to filter videos: ${error.message}`);
  }
}

// Agent 4: Store Videos in Database
async function storeVideos(state) {
  try {
    if (!state.filteredVideos || state.filteredVideos.length === 0) {
      console.log('Agent 4: No videos to store');
      return {
        ...state,
        storedCount: 0
      };
    }

    console.log(`Agent 4: Storing ${state.filteredVideos.length} videos in database...`);

    let storedCount = 0;
    let errorCount = 0;

    for (const video of state.filteredVideos) {
      try {
        await upsertToApproveVideo({
          video_id: video.video_id,
          video_url: video.video_url,
          title: video.title,
          description: video.description,
          thumbnail: video.thumbnail,
          channel_title: video.channel_title,
          channel_id: video.channel_id,
          duration_seconds: video.duration_seconds,
          view_count: video.view_count,
          published_at: video.published_at,
          score: video.score,
          approval_status: 'pending'
        });
        storedCount++;
      } catch (error) {
        console.error(`Error storing video ${video.video_id}:`, error);
        errorCount++;
      }
    }

    console.log(`Agent 4: Stored ${storedCount} videos, ${errorCount} errors`);

    return {
      ...state,
      storedCount: storedCount,
      errorCount: errorCount
    };
  } catch (error) {
    console.error('Error in Agent 4 (storeVideos):', error);
    throw new Error(`Failed to store videos: ${error.message}`);
  }
}

/**
 * Main video extraction workflow
 */
export async function extractVideos() {
  try {
    const workflow = new StateGraph({
      channels: {
        fetchedVideos: {
          reducer: (x, y) => y ?? x,
        },
        scoredVideos: {
          reducer: (x, y) => y ?? x,
        },
        filteredVideos: {
          reducer: (x, y) => y ?? x,
        },
        storedCount: {
          reducer: (x, y) => y ?? x,
        },
        errorCount: {
          reducer: (x, y) => y ?? x,
        },
      },
    })
      .addNode('fetchVideos', fetchVideos)
      .addNode('scoreVideos', scoreVideos)
      .addNode('filterVideos', filterVideos)
      .addNode('storeVideos', storeVideos)
      .addEdge('fetchVideos', 'scoreVideos')
      .addEdge('scoreVideos', 'filterVideos')
      .addEdge('filterVideos', 'storeVideos')
      .addEdge('storeVideos', END)
      .setEntryPoint('fetchVideos');

    const app = workflow.compile();
    const result = await app.invoke({});

    return {
      success: true,
      fetched: result.fetchedVideos?.length || 0,
      scored: result.scoredVideos?.length || 0,
      filtered: result.filteredVideos?.length || 0,
      stored: result.storedCount || 0,
      errors: result.errorCount || 0
    };
  } catch (error) {
    console.error('Error in video extraction workflow:', error);
    return {
      success: false,
      error: error.message,
      fetched: 0,
      scored: 0,
      filtered: 0,
      stored: 0,
      errors: 0
    };
  }
}

