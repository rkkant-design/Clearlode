-- Supabase Vector Search Function for Query Router
-- Run this in your Supabase SQL Editor to enable efficient vector similarity search

-- Function to match transcripts by embedding similarity
CREATE OR REPLACE FUNCTION match_transcripts(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  video_id uuid,
  title text,
  video_url text,
  channel_title text,
  transcript_text text,
  extraction jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    v.id as video_id,
    v.title,
    v.video_url,
    v.channel_title,
    t.transcript_text,
    t.extraction,
    1 - (t.embedding <=> query_embedding) as similarity
  FROM transcripts t
  JOIN videos v ON t.video_id = v.id
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index on embedding if not exists (for better performance)
-- Note: This should already exist from your schema, but adding for completeness
CREATE INDEX IF NOT EXISTS idx_transcripts_embedding ON transcripts 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

