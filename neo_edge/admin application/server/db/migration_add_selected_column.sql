-- Migration: Add selected column to videos table
-- Run this in your Supabase SQL editor

ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS selected TEXT DEFAULT 'no';



