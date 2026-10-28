import { StateGraph, END } from '@langchain/langgraph';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import axios from 'axios';
import dotenv from 'dotenv';
import {
  upsertVideo,
  updateVideoTranscript,
  insert18DExtraction,
  insertTranscriptChunk,
  replaceVideoFeeds,
  updateVideoSelected
} from './db/supabase.js';
import { pushGraphFacts, initNeo4j, createCrossVideoRelationships } from './db/neo4j.js';

dotenv.config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!RAPIDAPI_KEY) {
  console.warn('Warning: RAPIDAPI_KEY not set in environment variables');
} else {
  console.log('Using RAPIDAPI_KEY:', RAPIDAPI_KEY.substring(0, 20) + '...');
}
if (!OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set in environment variables');
}

// Initialize Neo4j on module load
initNeo4j();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000, isTranscript = false) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const status = error.response?.status;

      // Don't retry on authentication errors
      if (status === 403) {
        throw error;
      }

      // Handle rate limiting
      if (status === 429) {
        const delay = initialDelay * Math.pow(2, attempt);
        const retryAfter = error.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;

        if (attempt < maxRetries - 1) {
          console.log(`Rate limited. Retrying in ${waitTime / 1000} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }
      }

      // Handle gateway timeout (504) - common for transcript API
      if (status === 504 || status === 503 || error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        const delay = isTranscript ? initialDelay * Math.pow(3, attempt) : initialDelay * Math.pow(2, attempt);

        if (attempt < maxRetries - 1) {
          console.log(`Gateway timeout or connection timeout. Retrying in ${delay / 1000} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        } else {
          throw new Error(`Gateway timeout: The API took too long to respond. This video's transcript may be unavailable or the API is experiencing high load. Please try again later.`);
        }
      }

      // For other errors, throw immediately if it's the last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Otherwise, wait and retry
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Request failed. Retrying in ${delay / 1000} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return url;
}

// Agent 1: Fetch Video Details
async function fetchVideoDetails(state) {
  try {
    if (!RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY is not configured');
    }

    const videoId = extractVideoId(state.videoUrl);

    const response = await retryWithBackoff(async () => {
      return await axios.get(
        `https://yt-api.p.rapidapi.com/video/info?id=${videoId}`,
        {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'yt-api.p.rapidapi.com'
          }
        }
      );
    });

    const data = response.data;

    console.log('Agent 1: Video Details API Response received');

    if (!data || data.message) {
      throw new Error(data.message || 'Invalid response from API');
    }

    let thumbnail = '';

    if (data.thumbnail) {
      thumbnail = typeof data.thumbnail === 'string'
        ? data.thumbnail
        : data.thumbnail.url || data.thumbnail.high?.url || data.thumbnail.medium?.url || data.thumbnail.default?.url || '';
    } else if (data.thumbnails && Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
      const thumb = data.thumbnails[0];
      thumbnail = typeof thumb === 'string' ? thumb : thumb.url || thumb.high?.url || thumb.medium?.url || '';
    } else if (data.thumbnails && typeof data.thumbnails === 'object') {
      thumbnail = data.thumbnails.high?.url || data.thumbnails.medium?.url || data.thumbnails.default?.url || data.thumbnails.url || '';
    }

    if (!thumbnail && videoId) {
      thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    const durationSeconds = parseInt(data.lengthSeconds || data.length_seconds || data.lengthInSeconds || 0);
    const durationMin = Math.floor(durationSeconds / 60);

    // Save to Supabase
    const videoRecord = await upsertVideo({
      videoId: videoId,
      videoUrl: state.videoUrl,
      title: data.title || '',
      channelTitle: data.channelTitle || data.channel?.name || data.channel?.title || '',
      description: data.description || '',
      thumbnail: thumbnail,
      durationSeconds: durationSeconds,
      language: 'en',
      sourceType: null, // Will be determined in 18-D extraction
      recordedAt: null, // Will be determined in 18-D extraction
      status: 'processing'
    });

    console.log('Agent 1: Video saved to Supabase with ID:', videoRecord.id);

    const result = {
      ...state,
      videoDetails: {
        id: data.id || videoId,
        title: data.title || '',
        lengthSeconds: durationSeconds,
        durationMin: durationMin,
        channelTitle: data.channelTitle || data.channel?.name || data.channel?.title || '',
        description: data.description || '',
        thumbnail: thumbnail
      },
      videoRecordId: videoRecord.id,
      videoId: videoId
    };

    console.log('Agent 1: Video details fetched.');

    return result;
  } catch (error) {
    console.error('Error in Agent 1 (fetchVideoDetails):', error);

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 403) {
        throw new Error(`API Access Denied: ${errorData?.message || 'You may need to subscribe to this API on RapidAPI or check your API key'}`);
      } else if (status === 429) {
        throw new Error('Rate limit exceeded. The free tier has limited requests. Please wait a few minutes before trying again, or upgrade your RapidAPI plan.');
      } else if (status === 404) {
        throw new Error('Video not found. Please check the YouTube URL.');
      }
    }

    throw new Error(`Failed to fetch video details: ${error.message}`);
  }
}

// Agent 2: Fetch Transcript - supports multiple APIs (youtube-transcript3 + youtube-transcriptor fallback)
const TRANSCRIPT_API_HOST = 'youtube-transcript3.p.rapidapi.com';
const TRANSCRIPT_API_HOST_LEGACY = 'youtube-transcriptor.p.rapidapi.com';

function parseTranscriptResponseV3(data) {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();
  if (data.success === false && data.error) return null;
  if (data.transcript) {
    if (typeof data.transcript === 'string') return data.transcript.trim();
    if (Array.isArray(data.transcript)) {
      return data.transcript
        .map((item) => (typeof item === 'string' ? item : item.text || ''))
        .join(' ')
        .trim();
    }
  }
  return '';
}

function parseTranscriptResponseLegacy(data) {
  if (!data) return '';
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    const text = first.transcriptionAsText || first.transcript || first.text || '';
    if (text) return text;
    return data.map((item) => item.transcriptionAsText || item.transcript || item.text || '').join(' ').trim();
  }
  if (data && typeof data === 'object') {
    return data.transcriptionAsText || data.transcript || data.text || '';
  }
  if (typeof data === 'string') return data;
  return '';
}

// FieldNote: fetch timestamped transcript segments ({offset seconds, text}) for quote grounding
async function fetchTranscriptSegments(videoId) {
  if (!RAPIDAPI_KEY || !videoId) return [];
  const resp = await axios.get(
    `https://${TRANSCRIPT_API_HOST}/api/transcript?videoId=${videoId}&lang=en`,
    { headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': TRANSCRIPT_API_HOST } }
  );
  const arr = Array.isArray(resp.data?.transcript) ? resp.data.transcript : [];
  return arr
    .map((s) => ({ offset: parseFloat(s.offset), text: typeof s === 'string' ? s : (s.text || '') }))
    .filter((s) => !Number.isNaN(s.offset));
}

const normalizeForMatch = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// FieldNote: set timestamp_seconds on each quote by matching it back to the transcript segments
function assignQuoteTimestamps(quotes, segments) {
  if (!Array.isArray(quotes) || quotes.length === 0 || !segments || segments.length === 0) return;
  const idx = [];
  for (const seg of segments) {
    for (const w of normalizeForMatch(seg.text).split(' ')) {
      if (w) idx.push({ w, off: seg.offset });
    }
  }
  const findOffset = (quoteText) => {
    const qw = normalizeForMatch(quoteText).split(' ').filter(Boolean);
    if (!qw.length) return null;
    for (const n of [8, 6, 4, 3]) {
      const needle = qw.slice(0, Math.min(n, qw.length));
      for (let i = 0; i + needle.length <= idx.length; i++) {
        let ok = true;
        for (let j = 0; j < needle.length; j++) if (idx[i + j].w !== needle[j]) { ok = false; break; }
        if (ok) return idx[i].off;
      }
    }
    const dist = [...qw].sort((a, b) => b.length - a.length).find((w) => w.length >= 8);
    if (dist) { const hit = idx.find((x) => x.w === dist); if (hit) return hit.off; }
    return null;
  };
  for (const q of quotes) {
    if (!q || typeof q !== 'object') continue;
    const off = findOffset(q.quote);
    if (off != null) q.timestamp_seconds = Math.max(0, Math.floor(off));
  }
}

const ENRICHMENT_PROVENANCE = 'FieldNote analyst layer: market context, cost/ROI framework, readiness and metric definitions, compiled from the record plus general category knowledge. Not the deployer words unless quoted.';

// FieldNote: add an analyst layer (alternatives, cost, ROI, readiness, metric
// definitions) and identify the deploying company. Runs AFTER extraction and is
// clearly separated from the firsthand record. Best effort and non-fatal.
async function enrichRecord(extraction) {
  try {
    if (!OPENAI_API_KEY || !extraction || !extraction.metadata) return;
    const meta = extraction.metadata;
    const uc = (Array.isArray(extraction.use_cases_applications) && extraction.use_cases_applications[0]) || {};
    const stack = Array.isArray(uc.tools_apis) ? uc.tools_apis : [];
    const outcomes = Array.isArray(extraction.quantitative_or_qualitative_impact)
      ? extraction.quantitative_or_qualitative_impact.map(o => o && (o.value_or_description || o.metric_name || o.benefit_label)).filter(Boolean)
      : [];

    const input = {
      organizations: meta.organizations || [],
      speakers: meta.speakers || [],
      source_type: meta.source_type || '',
      solution: uc.name || '',
      stack,
      claimed_outcomes: outcomes
    };

    const llm = new ChatOpenAI({ temperature: 0.2, modelName: 'gpt-4.1', openAIApiKey: OPENAI_API_KEY });
    const prompt = `You are a FieldNote analyst. Produce a decision-support layer for an enterprise buyer, kept STRICTLY separate from what the speaker claimed. Use only the record below plus well-known general category knowledge.

RECORD:
${JSON.stringify(input, null, 2)}

Return ONLY this JSON:
{
  "deployer": "the organisation that actually DEPLOYED the AI (the customer), not the vendor, host or event",
  "function": "the business function this deployment is in: one of customer-support | software-engineering | other",
  "time_to_value": "time to results if the record states it, else 'Not disclosed'",
  "prerequisites": ["3-5 practical readiness items a team would need before starting, implied by the stack and good practice"],
  "alternatives": [{"used": "<a tool from the stack>", "category": "<its category>", "options": ["2-5 well-known real competing products"]}],
  "cost": {"disclosed": false, "note": "<'<deployer> did not disclose spend.' unless the record states cost>", "drivers": ["2-4 cost drivers: platform licensing/usage, integration build, ongoing operations"]},
  "roi": {"claimed_benefit": "<the outcome the record claims, or 'No quantified outcome disclosed'>", "missing": "<which inputs are missing to compute true ROI>", "formula": "ROI = (value of the outcome) - (platform usage + integration build + ongoing ops)"},
  "metric_definitions": [{"metric": "<a claimed metric>", "means": "<plain definition plus a hygiene caveat: deflection != resolution != containment; efficiency != quality; experience != volume. If there is no quantified outcome, say so and advise asking for deflection/resolution/CSAT.>"}]
}

HARD RULES:
- NEVER invent cost figures, ROI percentages, or outcome numbers. If a number is not in the record, it is "not disclosed".
- alternatives must be real, well-known products in the SAME category as the tool used; if unsure, return fewer or none.
- metric_definitions must define the metrics the record actually claims and flag the hygiene trap.
- Return ONLY the JSON object.`;

    const resp = await llm.invoke(prompt);
    const text = typeof resp.content === 'string' ? resp.content : '';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return;
    const enr = JSON.parse(m[0]);
    enr.provenance = ENRICHMENT_PROVENANCE;
    extraction.metadata.enrichment = enr;

    // FieldNote: record the business function as a first-class field (used for filtering)
    const fnKnown = ['customer-support', 'software-engineering'];
    extraction.metadata.function = fnKnown.includes((enr.function || '').trim()) ? enr.function.trim() : 'customer-support';

    // Put the deploying company (not the vendor/host) first in organizations and speakers
    const deployer = (enr.deployer || '').trim().toLowerCase();
    if (deployer) {
      if (Array.isArray(meta.organizations)) {
        const i = meta.organizations.findIndex(o => o && (String(o).toLowerCase().includes(deployer) || deployer.includes(String(o).toLowerCase())));
        if (i > 0) { const [d] = meta.organizations.splice(i, 1); meta.organizations.unshift(d); }
      }
      if (Array.isArray(meta.speakers)) {
        const si = meta.speakers.findIndex(s => String(s).toLowerCase().includes(deployer));
        if (si > 0) { const [sp] = meta.speakers.splice(si, 1); meta.speakers.unshift(sp); }
      }
    }
    console.log('Agent 3: analyst enrichment added');
  } catch (enrErr) {
    console.warn('Agent 3: enrichment skipped:', enrErr.message);
  }
}

async function fetchTranscript(state) {
  try {
    if (!RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY is not configured');
    }

    if (!state.videoId) {
      throw new Error('Video ID is missing from state');
    }

    const videoId = state.videoId;
    const videoUrl = state.videoUrl || `https://www.youtube.com/watch?v=${videoId}`;
    let transcript = '';
    let lastError = null;

    // Strategy 1: youtube-transcript3 - transcript-with-url (matches RapidAPI reference)
    try {
      console.log('Agent 2: Fetching transcript (transcript-with-url)...');
      const response = await retryWithBackoff(async () => {
        return await axios.get(
          `https://${TRANSCRIPT_API_HOST}/api/transcript-with-url?url=${encodeURIComponent(videoUrl)}&flat_text=true&lang=en`,
          {
            headers: {
              'x-rapidapi-key': RAPIDAPI_KEY,
              'x-rapidapi-host': TRANSCRIPT_API_HOST
            }
          }
        );
      }, 2, 1000, true);

      transcript = parseTranscriptResponseV3(response.data);
      if (transcript && transcript.trim().length > 0) {
        console.log('Agent 2: Successfully fetched transcript via URL');
      } else if (response.data && response.data.success === false && response.data.error) {
        lastError = new Error(response.data.error);
      } else if (response.data) {
        lastError = new Error('API returned empty transcript');
      }
    } catch (error) {
      lastError = error;
      console.log('Agent 2: transcript-with-url failed, trying videoId...');
    }

    // Strategy 2: youtube-transcript3 - by videoId (matches RapidAPI reference)
    if (!transcript || transcript.trim().length === 0) {
      try {
        const response = await retryWithBackoff(async () => {
          return await axios.get(
            `https://${TRANSCRIPT_API_HOST}/api/transcript?videoId=${videoId}&flat_text=true&lang=en`,
            {
              headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': TRANSCRIPT_API_HOST
              }
            }
          );
        }, 2, 1000, true);

        transcript = parseTranscriptResponseV3(response.data);
        if (transcript && transcript.trim().length > 0) {
          console.log('Agent 2: Successfully fetched transcript by videoId');
        } else if (response.data && response.data.success === false && response.data.error) {
          lastError = new Error(response.data.error);
        }
      } catch (error) {
        lastError = error;
      }
    }

    // Strategy 3: youtube-transcript3 - videoId without lang
    if (!transcript || transcript.trim().length === 0) {
      try {
        const response = await retryWithBackoff(async () => {
          return await axios.get(
            `https://${TRANSCRIPT_API_HOST}/api/transcript?videoId=${videoId}`,
            {
              headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': TRANSCRIPT_API_HOST
              }
            }
          );
        }, 2, 1000, true);

        transcript = parseTranscriptResponseV3(response.data);
        if (transcript && transcript.trim().length > 0) {
          console.log('Agent 2: Successfully fetched transcript (any lang)');
        }
      } catch (error) {
        lastError = error;
      }
    }

    // Strategy 4: Fallback to youtube-transcriptor
    if (!transcript || transcript.trim().length === 0) {
      try {
        console.log('Agent 2: Trying youtube-transcriptor API...');
        const response = await retryWithBackoff(async () => {
          return await axios.get(
            `https://${TRANSCRIPT_API_HOST_LEGACY}/transcript?video_id=${videoId}&lang=en`,
            {
              headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': TRANSCRIPT_API_HOST_LEGACY
              }
            }
          );
        }, 2, 1000, true);

        transcript = parseTranscriptResponseLegacy(response.data);
        if (transcript && transcript.trim().length > 0) {
          console.log('Agent 2: Successfully fetched transcript (youtube-transcriptor)');
        }
      } catch (error) {
        lastError = error;
      }
    }

    // Strategy 5: youtube-transcriptor without lang
    if (!transcript || transcript.trim().length === 0) {
      try {
        const response = await retryWithBackoff(async () => {
          return await axios.get(
            `https://${TRANSCRIPT_API_HOST_LEGACY}/transcript?video_id=${videoId}`,
            {
              headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': TRANSCRIPT_API_HOST_LEGACY
              }
            }
          );
        }, 2, 1000, true);

        transcript = parseTranscriptResponseLegacy(response.data);
        if (transcript && transcript.trim().length > 0) {
          console.log('Agent 2: Successfully fetched transcript (youtube-transcriptor, any lang)');
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (!transcript || transcript.trim().length === 0) {
      const errMsg = lastError?.response?.data?.error || lastError?.message || '';
      throw new Error(
        errMsg && (errMsg.includes('transcript') || errMsg.includes('subtitles'))
          ? errMsg
          : 'No transcript available. Ensure the video has captions (CC) and you are subscribed to a transcript API on RapidAPI (youtube-transcript3 or youtube-transcriptor).'
      );
    }

    // Save transcript to videos table
    await updateVideoTranscript(state.videoId, transcript, 'en');

    console.log('Agent 2: Transcript saved to videos table');

    const result = {
      ...state,
      transcript: transcript
    };

    console.log('Agent 2: Transcript fetched. Waiting 2 seconds before 18-D extraction...');
    await sleep(2000);

    return result;
  } catch (error) {
    console.error('Error in Agent 2 (fetchTranscript):', error);

    // Transcript is stored in videos table, no separate status to update

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 403) {
        throw new Error(`API Access Denied: Subscribe to Youtube Transcript API at https://rapidapi.com/solid-api-solid-api-default/api/youtube-transcript3`);
      } else if (status === 400) {
        throw new Error(errorData?.error || errorData?.message || 'Invalid video ID or API request');
      } else if (status === 429) {
        throw new Error('Rate limit exceeded. Free tier: 100 requests/month. Please wait or upgrade your RapidAPI plan.');
      } else if (status === 504) {
        throw new Error(`Gateway Timeout: The transcript API took too long. Please try again later.`);
      } else if (status === 503) {
        throw new Error(`Service Unavailable: The transcript API is temporarily unavailable.`);
      }
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error(`Request Timeout: The transcript API request timed out. This video's transcript may be unavailable or the API is experiencing high load. Please try again later.`);
    }

    throw new Error(`Failed to fetch transcript: ${error.message}`);
  }
}

// Agent 3: 18-D Extraction
async function extract18D(state) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!state.transcript || state.transcript.trim().length === 0) {
      throw new Error('Transcript is empty or missing');
    }

    const llm = new ChatOpenAI({
      modelName: 'gpt-4.1',
      temperature: 0,
      openAIApiKey: OPENAI_API_KEY,
    });

    const prompt = `You are given the following transcript:

<<<TRANSCRIPT_START>>>
${state.transcript}
<<<TRANSCRIPT_END>>>

Extract it into this JSON schema:
 
{
  "metadata": {
    "video_title": "",
    "video_url": "",
    "source_type": "podcast|interview|panel|keynote|paper",
    "speakers": ["Name (Role, Org)"],
    "organizations": ["Org A", "Org B"],
    "event": "",
    "recorded_at": "",
    "duration_min": 0,
    "language": "en",
    "evidence_grade": "A|B|C|D",
    "grade_rationale": ""
  },
  "personas_roles_context": [],
  "core_definition_of_agentic_ai": {
    "text": "",
    "confidence": 0.0,
    "quote": ""
  },
  "problem_statement": {
    "label": "",
    "text": "",
    "confidence": 0.0,
    "quote": ""
  },
  "use_cases_applications": [
    {
      "name": "",
      "description": "",
      "actions": [],
      "channels": [],
      "tools_apis": [],
      "confidence": 0.0,
      "quote": ""
    }
  ],
  "business_value_narrative": {
    "label": "",
    "text": "",
    "confidence": 0.0,
    "quote": ""
  },
  "quantitative_or_qualitative_impact": [
    {
      "benefit_label": "",
      "benefit_text": "",
      "metric_label": "",
      "metric_name": "",
      "value_or_description": "",
      "unit": "",
      "timeframe": "",
      "confidence": 0.0,
      "quote": ""
    }
  ],
  "risks_constraints": [],
  "enabling_technologies": [],
  "organizational_implications": {
    "text": "",
    "confidence": 0.0,
    "quote": ""
  },
  "industry_context_and_analogues": [],
  "customer_experience_dimension": {
    "text": "",
    "confidence": 0.0,
    "quote": ""
  },
  "trust_ethics_narrative": {
    "text": "",
    "confidence": 0.0,
    "quote": ""
  },
  "future_vision_trend_indicators": [],
  "quotable_insights": [],
  "sentiment_and_tone": {
    "sentiment": "positive|neutral|negative",
    "description": "",
    "confidence": 0.0
  },
  "cross_references_brands_examples": [],
  "structural_narrative_segments": [],
  "provenance": {
    "video_id": "",
    "snippets": [],
    "extracted_at": ""
  },
"key_words": ["", "", ""],
"key_insight": ["", "", ""],
"feeds": [
  {
    "author_name": "",
    "author_handle": "",
    "author_role": "",
    "vendor": "",
    "product": "",
    "impact": "high|medium|low",
    "headline": "",
    "summary": "",
    "highlights": ["", "", ""],
    "tags": ["", "", ""],
    "time_ago": "",
    "timestamp": "",
    "trending_label": "",
    "trending_reason": "",
    "read_more_url": "",
    "video_reference": {
      "video_id": "",
      "timecode": ""
    }
  }
]
}
 
CRITICAL RULES - ALL FIELDS ARE MANDATORY:

1. MANDATORY FIELD COMPLETION:
   - EVERY SINGLE FIELD in the schema MUST be filled with meaningful content
   - DO NOT use null, empty strings "", or empty arrays [] 
   - You MUST extract information for ALL 18 dimensions from the transcript
   - If information is not explicitly stated, you MUST infer from context, implications, or related statements
   - Use your analytical capabilities to derive insights even when not directly stated

2. FIELD-SPECIFIC REQUIREMENTS:
   - key_words: EXACTLY 3 single words (MANDATORY - extract from transcript)
   - key_insight: MINIMUM 3 insights (MANDATORY - derive key takeaways)
   - personas_roles_context: MINIMUM 1 entry (MANDATORY - identify who is involved)
   - use_cases_applications: MINIMUM 1 use case (MANDATORY - identify applications)
   - quantitative_or_qualitative_impact: MINIMUM 1 impact (MANDATORY - identify benefits/metrics)
   - risks_constraints: MINIMUM 1 risk or constraint (MANDATORY - identify challenges)
   - enabling_technologies: MINIMUM 1 technology (MANDATORY - identify tech mentioned)
   - industry_context_and_analogues: MINIMUM 1 context (MANDATORY - identify industry context)
   - future_vision_trend_indicators: MINIMUM 1 trend (MANDATORY - identify future trends)
   - quotable_insights: MINIMUM 2 quotes (MANDATORY - extract notable quotes)
   - cross_references_brands_examples: MINIMUM 1 reference (MANDATORY - identify brands/examples)
   - structural_narrative_segments: MINIMUM 2 segments (MANDATORY - identify narrative structure)
   - feeds: MINIMUM 1 feed entry (MANDATORY - create at least one social update)

3. OBJECT FIELD REQUIREMENTS (ALL must have content):
   - core_definition_of_agentic_ai: MUST have text, quote, and confidence > 0
   - problem_statement: MUST have label, text, quote, and confidence > 0
   - business_value_narrative: MUST have label, text, quote, and confidence > 0
   - organizational_implications: MUST have text, quote, and confidence > 0
   - customer_experience_dimension: MUST have text, quote, and confidence > 0
   - trust_ethics_narrative: MUST have text, quote, and confidence > 0
   - sentiment_and_tone: MUST have sentiment, description, and confidence > 0

4. METADATA REQUIREMENTS:
   - All metadata fields MUST be filled
   - speakers: MINIMUM 1 speaker (MANDATORY - identify who speaks)
   - organizations: MINIMUM 1 organization (MANDATORY - identify companies/orgs)
   - source_type: MUST be one of: podcast|interview|panel|keynote|paper|demo|webinar|presentation
   - event: MUST identify the event name or context
   - recorded_at: Use ISO 8601 format (YYYY-MM-DD). If unclear, infer from context or use a reasonable date based on video metadata
   - evidence_grade: grade the strength of the firsthand evidence, one of A|B|C|D:
       A = independent, third-party or audited production evidence (verified numbers not supplied by the deploying vendor)
       B = first-party operator describing their own production deployment WITH specific quantified outcomes
       C = first-party account that is qualitative or has no hard metrics, or a vendor case-study / marketing talk
       D = demo, tutorial, prediction, or unverified / second-hand claim
     Grade conservatively; when unsure between two grades, choose the LOWER one.
   - grade_rationale: one short sentence (under 20 words) justifying the grade from what the transcript actually shows

5. GENERAL GUIDELINES:
   - Keep all labels (problem_label, use case name, benefit_label, metric_label) to at most 8–10 words
   - Use full sentences in the \`text\` and \`benefit_text\` / \`value_or_description\` fields
   - Extract facts explicitly stated AND strongly implied by the transcript
   - Use inference and analytical reasoning to fill fields when direct information is not available
   - For feeds: Create 1-4 premium social-style updates. Keep summaries under 35 words, highlights under 12 words, ensure author_handle starts with "@". Use ISO 8601 timestamps

6. QUALITY STANDARDS:
   - Confidence scores MUST be between 0.0 and 1.0 (use 0.5+ for inferred content, 0.8+ for explicit content)
   - Quotes MUST be actual transcript excerpts (use exact wording when possible)
   - All text fields MUST contain substantive content (minimum 10 words for main text fields)

REMEMBER: This is a COMPREHENSIVE extraction. Your goal is to extract MAXIMUM information from the transcript. If a field seems empty, look deeper, infer from context, analyze implications, and extract related information. ALL 18 DIMENSIONS MUST BE POPULATED.

Return ONLY the JSON object, no explanations or comments.`;

    console.log('Agent 3: Calling OpenAI GPT-4 for 18-D extraction...');
    const response = await llm.invoke(prompt);
    let extractionText = response.content;

    if (typeof extractionText === 'string') {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonText = extractionText.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        const lines = jsonText.split('\n');
        const startIndex = lines.findIndex(line => line.trim().startsWith('```'));
        const endIndex = lines.findIndex((line, idx) => idx > startIndex && line.trim().startsWith('```'));
        if (startIndex >= 0 && endIndex > startIndex) {
          jsonText = lines.slice(startIndex + 1, endIndex).join('\n');
        }
      }

      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      try {
        const extraction = JSON.parse(jsonText);

        // Validate required fields
        if (!extraction.metadata) {
          extraction.metadata = {};
        }
        if (!extraction.problem_statement) {
          extraction.problem_statement = { label: '', text: '', confidence: 0.0, quote: '' };
        }
        if (!Array.isArray(extraction.use_cases_applications)) {
          extraction.use_cases_applications = [];
        }

        // Add provenance
        extraction.provenance = {
          video_id: state.videoId,
          snippets: [], // Can be enhanced to extract specific quotes
          extracted_at: new Date().toISOString()
        };

        // Update metadata with actual video data
        extraction.metadata.video_title = state.videoDetails.title;
        extraction.metadata.video_url = state.videoUrl;
        extraction.metadata.duration_min = state.videoDetails.durationMin || 0;
        extraction.metadata.language = 'en';

        // FieldNote: ground each quote with a transcript timestamp (best effort, non-fatal)
        try {
          const segments = await fetchTranscriptSegments(state.videoId);
          assignQuoteTimestamps(extraction.quotable_insights, segments);
          console.log('Agent 3: quote timestamps assigned where matched');
        } catch (tsErr) {
          console.warn('Agent 3: quote timestamping skipped:', tsErr.message);
        }

        // FieldNote: add the analyst enrichment layer (alternatives, cost, ROI,
        // readiness, metric definitions) and put the deployer ahead of the vendor
        await enrichRecord(extraction);

        // Save to data_18d table (use videoRecordId UUID directly)
        await insert18DExtraction(state.videoRecordId, extraction, 'gpt-4.1', null, null);
        await replaceVideoFeeds(state.videoRecordId, extraction.feeds || [], {
          videoUrl: state.videoUrl,
          videoDetails: state.videoDetails,
          videoId: state.videoId
        });

        // FieldNote: a human-approved (or manually submitted) record goes live
        // immediately. Approve in the Ingestion Hub is the publish decision, so
        // mark the video selected='yes' once its record is saved.
        try {
          await updateVideoSelected(state.videoId, 'yes');
          console.log('Agent 3: record published (selected=yes)');
        } catch (pubErr) {
          console.warn('Agent 3: auto-publish failed:', pubErr.message);
        }

        console.log('Agent 3: 18-D extraction completed and saved to data_18d');

        return {
          ...state,
          extraction: extraction
        };
      } catch (parseError) {
        console.error('Failed to parse 18-D extraction JSON:', parseError.message);
        console.error('Raw response (first 500 chars):', extractionText.substring(0, 500));
        throw new Error(`Failed to parse 18-D extraction from AI response: ${parseError.message}`);
      }
    }

    throw new Error('Invalid response format from AI');
  } catch (error) {
    console.error('Error in Agent 3 (extract18D):', error);
    throw new Error(`Failed to extract 18-D metadata: ${error.message}`);
  }
}

// Agent 4: Compute Embeddings
async function computeEmbeddings(state) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!state.transcript || state.transcript.trim().length === 0) {
      throw new Error('Transcript is empty or missing');
    }

    console.log('Agent 4: Computing embeddings for transcript...');

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002'
    });

    // Get transcript text and use LangChain's RecursiveCharacterTextSplitter
    const transcriptText = state.transcript;

    // Initialize LangChain's text splitter
    // 7000 tokens ≈ 21,000-28,000 characters (1 token ≈ 3-4 chars)
    // Using 24,000 characters to approximate 7000 tokens
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 24000, // Approximates 7000 tokens
      chunkOverlap: 600, // Approximates 200 tokens overlap
      separators: ['\n\n', '\n', '. ', ' ', ''] // Split by paragraphs, sentences, words
    });

    // Split transcript into chunks (simple LangChain method!)
    const chunks = await splitter.splitText(transcriptText);

    const totalChunks = chunks.length;
    console.log(`Agent 4: Transcript split into ${totalChunks} chunks (~7000 tokens each, parallel processing)`);

    // Create chunk metadata with character positions
    const chunkMetadata = [];
    let charStart = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const charEnd = charStart + chunkText.length;

      chunkMetadata.push({
        index: i,
        charStart: charStart,
        charEnd: charEnd,
        text: chunkText
      });

      // Move start position forward (accounting for overlap)
      charStart = charEnd - 600; // Approximate overlap
      if (charStart < 0) charStart = 0;
    }

    // Process chunks in parallel with concurrency limit (5 at a time)
    const concurrencyLimit = 5;
    let processedChunks = 0;

    async function processChunk(chunkMeta) {
      try {
        console.log(`Agent 4: Embedding chunk ${chunkMeta.index + 1}/${totalChunks}...`);

        // Generate embedding for this chunk
        const embeddingVector = await embeddings.embedQuery(chunkMeta.text);

        if (!embeddingVector || embeddingVector.length !== 1536) {
          throw new Error(`Invalid embedding dimension: expected 1536, got ${embeddingVector?.length || 0}`);
        }

        // Store chunk with embedding immediately (using video_id)
        await insertTranscriptChunk({
          videoId: state.videoRecordId,
          chunkIndex: chunkMeta.index,
          chunkText: chunkMeta.text,
          embedding: embeddingVector,
          charStart: chunkMeta.charStart,
          charEnd: chunkMeta.charEnd
        });

        processedChunks++;
        return { success: true, index: chunkMeta.index };
      } catch (chunkError) {
        console.error(`Error embedding chunk ${chunkMeta.index + 1}:`, chunkError);
        throw new Error(`Failed to embed chunk ${chunkMeta.index + 1}: ${chunkError.message}`);
      }
    }

    // Process chunks in parallel batches
    for (let i = 0; i < chunkMetadata.length; i += concurrencyLimit) {
      const batch = chunkMetadata.slice(i, i + concurrencyLimit);
      console.log(`Agent 4: Processing batch ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(chunkMetadata.length / concurrencyLimit)} (${batch.length} chunks in parallel)`);

      // Process batch in parallel
      await Promise.all(batch.map(chunkMeta => processChunk(chunkMeta)));

      // Clear batch from memory
      batch.length = 0;
    }

    // Clear chunk metadata
    chunkMetadata.length = 0;

    // Clear transcript from state to free memory (it's already saved in database)
    state.transcript = null;

    console.log(`Agent 4: Embeddings computed and saved to Supabase (${processedChunks} chunks)`);

    return {
      ...state,
      chunkCount: processedChunks
    };
  } catch (error) {
    console.error('Error in Agent 4 (computeEmbeddings):', error);
    throw new Error(`Failed to compute embeddings: ${error.message}`);
  }
}

// Agent 5: Push Graph Facts to Neo4j
async function pushToNeo4j(state) {
  try {
    if (!state.extraction) {
      throw new Error('18-D extraction is missing from state');
    }

    console.log('Agent 5: Pushing graph facts to Neo4j...');

    const result = await pushGraphFacts(
      state.extraction,
      state.videoId,
      state.videoUrl,
      state.videoRecordId
    );

    if (result.success) {
      console.log('Agent 5: Graph facts pushed successfully to AuraDB');

      // PAUSED: Automatically create cross-video relationships
      // Uncomment below to re-enable cross-video relationship creation
      /*
      try {
        console.log('Agent 5: Creating cross-video relationships...');
        const crossVideoResult = await createCrossVideoRelationships();
        if (crossVideoResult.success) {
          console.log('Agent 5: Cross-video relationships created successfully');
          if (crossVideoResult.stats) {
            console.log(`  - UseCase links: ${crossVideoResult.stats.useCaseLinks}`);
            console.log(`  - Technology links: ${crossVideoResult.stats.techLinks}`);
            console.log(`  - Organization links: ${crossVideoResult.stats.orgLinks}`);
          }
        }
      } catch (crossVideoError) {
        // Don't fail the workflow if cross-video relationships fail
        console.warn('Agent 5: Cross-video relationships creation failed (non-critical):', crossVideoError.message);
      }
      */
    } else {
      console.warn('Agent 5: Neo4j push skipped:', result.message);
      // Still mark as completed if Neo4j is not configured
      await updateTranscriptStatus(state.transcriptId, 'completed');
    }

    return {
      ...state,
      neo4jSynced: result.success
    };
  } catch (error) {
    console.error('Error in Agent 5 (pushToNeo4j):', error);

    // Update transcript status to failed
    if (state.transcriptId) {
      try {
        await updateTranscriptStatus(state.transcriptId, 'failed');
      } catch (updateError) {
        console.error('Failed to update transcript status:', updateError);
      }
    }

    // Don't fail the entire workflow if Neo4j fails
    console.warn('Continuing despite Neo4j error');
    return {
      ...state,
      neo4jSynced: false
    };
  }
}

export async function analyzeVideo(videoUrl) {
  try {
    let state = { videoUrl };

    try {
      const workflow = new StateGraph({
        channels: {
          videoUrl: {
            reducer: (x, y) => y ?? x,
          },
          videoDetails: {
            reducer: (x, y) => y ?? x,
          },
          videoRecordId: {
            reducer: (x, y) => y ?? x,
          },
          videoId: {
            reducer: (x, y) => y ?? x,
          },
          transcript: {
            reducer: (x, y) => y ?? x,
          },
          transcriptId: {
            reducer: (x, y) => y ?? x,
          },
          extraction: {
            reducer: (x, y) => y ?? x,
          },
          embedding: {
            reducer: (x, y) => y ?? x,
          },
          neo4jSynced: {
            reducer: (x, y) => y ?? x,
          },
        },
      })
        .addNode('fetchVideoDetails', fetchVideoDetails)
        .addNode('fetchTranscript', fetchTranscript)
        .addNode('extract18D', extract18D)
        .addNode('computeEmbeddings', computeEmbeddings)
        .addNode('pushToNeo4j', pushToNeo4j)
        .addEdge('fetchVideoDetails', 'fetchTranscript')
        .addEdge('fetchTranscript', 'extract18D')
        .addEdge('extract18D', 'computeEmbeddings')
        .addEdge('computeEmbeddings', 'pushToNeo4j')
        .addEdge('pushToNeo4j', END)
        .setEntryPoint('fetchVideoDetails');

      const app = workflow.compile();
      const result = await app.invoke(state);

      return {
        videoDetails: result.videoDetails,
        transcript: result.transcript,
        extraction: result.extraction,
        status: 'completed',
        neo4jSynced: result.neo4jSynced || false
      };
    } catch (langGraphError) {
      console.warn('LangGraph workflow failed, using sequential approach:', langGraphError.message);

      state = await fetchVideoDetails(state);
      state = await fetchTranscript(state);
      state = await extract18D(state);
      state = await computeEmbeddings(state);
      state = await pushToNeo4j(state);

      return {
        videoDetails: state.videoDetails,
        transcript: state.transcript,
        extraction: state.extraction,
        status: 'completed',
        neo4jSynced: state.neo4jSynced || false
      };
    }
  } catch (error) {
    console.error('Error in analyzeVideo:', error);
    throw error;
  }
}
