import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getFeedVideos, getVideos, getSpotlightVideo, getVideoDetails, getUniqueVendors, getTrendingKeywords, getPublishedTopVendors, getPublishedTrendingTags, getPublishedFeedVendors, getBenchmarks } from './db/supabase.js';
import { getVideoKeyInsights } from './db/supabase-video-details.js';
import { getTrendingTags, getTopVendors, closeDriver, getUseCaseIndustries, getUseCases, getUseCaseChains } from './db/neo4j.js';
import { chatWithRAG } from './services/chatService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS Configuration
const customOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3000',
    ...customOrigins,
    /\.netlify\.app$/,  // Allow all Netlify preview deploys
    /\.vercel\.app$/    // Allow Vercel if needed
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return origin === allowedOrigin;
            }
            if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Latest Page Backend is running' });
});

// Latest Page Endpoints

// Videos endpoint - for /latest page (actual video cards)
app.get('/api/videos', async (req, res) => {
    try {
        const { page, limit, vendor, function: func, days, sort, tag, company } = req.query;
        const result = await getVideos({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 12,
            vendor,
            function: func,
            days,
            sort,
            tag,
            company
        });
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch videos',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Feed endpoint - for /feed page (social media style posts)
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
        // FieldNote: derive from PUBLISHED records (Supabase), not Neo4j
        const result = await getPublishedTrendingTags(limit ? parseInt(limit) : 10);
        res.json({ success: true, data: result });
    } catch (error) {
        console.warn('⚠️  Trending tags unavailable:', error.message || error);
        res.json({ success: true, data: [] });
    }
});

app.get('/api/stats/vendors', async (req, res) => {
    try {
        const { limit } = req.query;
        // FieldNote: derive from PUBLISHED records (Supabase), not Neo4j
        const result = await getPublishedTopVendors(limit ? parseInt(limit) : 5);
        res.json({ success: true, data: result });
    } catch (error) {
        console.warn('⚠️  Top vendors unavailable:', error.message || error);
        res.json({ success: true, data: [] });
    }
});

// FieldNote: every deploying company in the library (Company Explorer)
app.get('/api/companies', async (req, res) => {
    try {
        const result = await getPublishedTopVendors(500);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch companies' });
    }
});

// FieldNote: cross-corpus synthesis (Benchmarks)
app.get('/api/benchmarks', async (req, res) => {
    try {
        const result = await getBenchmarks();
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error fetching benchmarks:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch benchmarks' });
    }
});

// Filter Options Endpoints
app.get('/api/filters/vendors', async (req, res) => {
    try {
        // FieldNote: list the vendors present in the published feed (feeds.vendor)
        const result = await getPublishedFeedVendors();
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error fetching unique vendors:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch unique vendors',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/api/filters/trending-keywords', async (req, res) => {
    try {
        const { limit } = req.query;
        const result = await getTrendingKeywords(limit ? parseInt(limit) : 5);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error fetching trending keywords:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch trending keywords',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Use Case Explorer Endpoints
app.get('/api/use-case-explorer/industries', async (_req, res) => {
    try {
        const industries = await getUseCaseIndustries();
        res.json({ success: true, data: industries });
    } catch (error) {
        console.error('Error fetching use case industries:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch industries',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/api/use-case-explorer/use-cases', async (req, res) => {
    try {
        const { industry } = req.query;
        const useCases = await getUseCases(industry || null);
        res.json({ success: true, data: useCases });
    } catch (error) {
        console.error('Error fetching use cases:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch use cases',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/api/use-case-explorer/use-cases/:id/chains', async (req, res) => {
    try {
        const { id } = req.params;
        const chains = await getUseCaseChains(id);
        if (!chains) {
            return res.status(404).json({ error: 'Use case not found' });
        }
        res.json({ success: true, data: chains });
    } catch (error) {
        console.error('Error fetching use case chains:', error);

        res.status(500).json({
            error: error.message || 'Failed to fetch use case chains',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Video Details Endpoints
app.get('/api/video/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getVideoDetails(id);
    if (!result) {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching video details:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch video details',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/video/:id/insights', async (req, res) => {
  try {
    const { id } = req.params;
    const insights = await getVideoKeyInsights(id);
    if (!insights) {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error fetching video insights:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch video insights',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Chat / Ask Neo Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { question, conversationHistory } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Question is required and must be a non-empty string'
      });
    }

    // Validate conversation history format if provided (limit to last 10 messages)
    const history = Array.isArray(conversationHistory) 
      ? conversationHistory.slice(-10).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content || ''
        }))
      : [];

    // Use simple RAG chat - semantic search + OpenAI
    const result = await chatWithRAG(question.trim(), history);

    res.json({
      success: true,
      data: {
        answer: result.answer || 'I could not generate a response.'
      }
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate chat response',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Latest Page Backend running on http://localhost:${PORT}`);
    console.log(`📊 API Endpoints:`);
    console.log(`   GET /api/videos`);
    console.log(`   GET /api/feed`);
    console.log(`   GET /api/spotlight`);
    console.log(`   GET /api/stats/trending`);
    console.log(`   GET /api/stats/vendors`);
    console.log(`   GET /api/filters/vendors`);
    console.log(`   GET /api/filters/trending-keywords`);
    console.log(`   GET /api/video/:id`);
    console.log(`   GET /api/video/:id/insights`);
    console.log(`   POST /api/chat\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await closeDriver();
    process.exit(0);
});
