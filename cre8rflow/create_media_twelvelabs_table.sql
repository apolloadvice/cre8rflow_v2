-- Create the media_twelvelabs table for persistent TwelveLabs storage
-- This should be run in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS media_twelvelabs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  media_id TEXT NOT NULL, -- References MediaItem.id from IndexedDB
  
  -- TwelveLabs identifiers
  index_id TEXT NOT NULL,
  video_id TEXT,
  task_id TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  
  -- TwelveLabs metadata (separate from local file metadata)
  duration TEXT, -- Store as text to handle large numbers
  filename TEXT,
  width TEXT, -- Store as text to handle large numbers
  height TEXT, -- Store as text to handle large numbers
  
  -- HLS streaming URLs from TwelveLabs
  video_url TEXT,
  thumbnail_urls TEXT, -- JSON array as text
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(media_id, project_id) -- One TwelveLabs record per media item
);

-- Enable Row Level Security
ALTER TABLE media_twelvelabs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (adjust based on your auth requirements)
-- Allow users to access only their own TwelveLabs data
CREATE POLICY "Users can manage their own TwelveLabs data" ON media_twelvelabs
FOR ALL USING (user_id = auth.uid());

-- Optional: Create index for performance
CREATE INDEX IF NOT EXISTS idx_media_twelvelabs_project_media 
ON media_twelvelabs(project_id, media_id);

CREATE INDEX IF NOT EXISTS idx_media_twelvelabs_user_project 
ON media_twelvelabs(user_id, project_id);