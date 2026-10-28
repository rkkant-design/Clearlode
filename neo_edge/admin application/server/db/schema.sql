-- Supabase Database Schema for YouTube Video Analyzer

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT UNIQUE NOT NULL,
  video_url TEXT NOT NULL,
  title TEXT,
  channel_title TEXT,
  description TEXT,
  thumbnail TEXT,
  duration_seconds INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  source_type TEXT,
  recorded_at TIMESTAMPTZ,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  transcript_text TEXT NOT NULL,
  transcript_excerpt TEXT,
  extraction JSONB,
  embedding vector(1536),
  confidence NUMERIC,
  status TEXT DEFAULT 'new',
  recorded_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  extracted_at TIMESTAMPTZ
);

-- Transcript chunks table for chunked embeddings
CREATE TABLE IF NOT EXISTS transcript_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  char_start INTEGER,
  char_end INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- To Approve Videos table for video extraction feature
CREATE TABLE IF NOT EXISTS to_approve_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT UNIQUE NOT NULL,
  video_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  thumbnail TEXT,
  channel_title TEXT,
  channel_id TEXT,
  duration_seconds INTEGER DEFAULT 0,
  view_count BIGINT DEFAULT 0,
  published_at TIMESTAMPTZ,
  score NUMERIC(3, 1) NOT NULL CHECK (score >= 1 AND score <= 10),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'yes', 'no')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_video_id ON videos(video_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_extraction ON transcripts USING GIN(extraction);
CREATE INDEX IF NOT EXISTS idx_transcripts_embedding ON transcripts USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chunks_transcript_id ON transcript_chunks(transcript_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON transcript_chunks USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_to_approve_videos_video_id ON to_approve_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_to_approve_videos_score ON to_approve_videos(score);
CREATE INDEX IF NOT EXISTS idx_to_approve_videos_approval_status ON to_approve_videos(approval_status);
CREATE INDEX IF NOT EXISTS idx_to_approve_videos_created_at ON to_approve_videos(created_at);

-- Enable vector extension (if not already enabled)
-- This is usually done at the database level in Supabase
-- CREATE EXTENSION IF NOT EXISTS vector;

