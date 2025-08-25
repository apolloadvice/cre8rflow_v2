export type IndexingStatus = 
  | 'pending'
  | 'uploading' 
  | 'validating'
  | 'queued'
  | 'indexing'
  | 'ready'
  | 'failed';

export interface TwelveLabsIndex {
  id: string;
  name: string;
  models: Array<{
    model_name: string;
    model_options: string[];
  }>;
  created_at: string;
  updated_at: string;
}

export interface TwelveLabsTask {
  id: string;
  video_id: string;
  index_id: string;
  status: IndexingStatus;
  created_at: string;
  updated_at: string;
  system_metadata?: {
    duration?: number;
    filename?: string;
    width?: number;
    height?: number;
  };
  hls?: {
    video_url?: string;
    thumbnail_urls?: string[];
    status?: 'PROCESSING' | 'COMPLETE' | 'CANCELED' | 'ERROR';
    updated_at?: string;
  };
}

export interface TwelveLabsVideoMetadata {
  videoId: string;
  taskId: string;
  indexId: string;
  status: IndexingStatus;
  error?: string;
  projectId: string;
  mediaId: string;
  uploadedAt: string;
}

export interface UserIndexMapping {
  id: string;
  userId: string;
  indexId: string;
  indexName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  video_id: string;
  score: number;
  start: number;
  end: number;
  confidence: 'high' | 'medium' | 'low';
  metadata?: any;
}

export interface AnalysisResult {
  title?: string;
  topics?: string[];
  hashtags?: string[];
  summary?: string;
  chapters?: Array<{
    chapter_title: string;
    chapter_summary: string;
    start: number;
    end: number;
  }>;
  highlights?: Array<{
    highlight: string;
    start: number;
    end: number;
  }>;
}