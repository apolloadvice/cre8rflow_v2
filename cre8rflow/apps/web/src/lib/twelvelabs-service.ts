import type { MediaItem } from '@/stores/media-store';
import type { IndexingStatus } from '@/types/twelvelabs';

interface TwelveLabsIndexResponse {
  indexId: string;
  indexName: string;
}

interface TwelveLabsUploadResponse {
  taskId: string;
  videoId: string;
  status: IndexingStatus;
}

interface TwelveLabsStatusResponse {
  taskId: string;
  videoId: string;
  status: IndexingStatus;
  systemMetadata?: {
    duration?: number;
    filename?: string;
    width?: number;
    height?: number;
  };
  hls?: {
    video_url?: string;
    thumbnail_urls?: string[];
    status?: string;
    updated_at?: string;
  };
  updatedAt: string;
}

class TwelveLabsService {
  private userIndexCache = new Map<string, string>();

  async getUserIndex(): Promise<string> {
    try {
      const response = await fetch('/api/twelvelabs/index');
      
      if (!response.ok) {
        throw new Error(`Failed to get user index: ${response.statusText}`);
      }

      const data: TwelveLabsIndexResponse = await response.json();
      return data.indexId;
    } catch (error) {
      console.error('Failed to get user index:', error);
      throw error;
    }
  }

  async uploadVideoForIndexing(
    videoFile: File,
    projectId: string,
    mediaId: string
  ): Promise<TwelveLabsUploadResponse> {
    try {
      // Get user's index
      const indexId = await this.getUserIndex();

      const formData = new FormData();
      formData.append('video_file', videoFile);
      formData.append('index_id', indexId);
      formData.append('project_id', projectId);
      formData.append('media_id', mediaId);

      const response = await fetch('/api/twelvelabs/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload video for indexing:', error);
      throw error;
    }
  }

  async getTaskStatus(taskId: string, projectId?: string, mediaId?: string): Promise<TwelveLabsStatusResponse> {
    try {
      const params = new URLSearchParams({ task_id: taskId });
      if (projectId) params.set('project_id', projectId);
      if (mediaId) params.set('media_id', mediaId);
      const response = await fetch(`/api/twelvelabs/status?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get task status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get task status:', error);
      throw error;
    }
  }

  async analyzeVideo(videoId: string, prompt?: string) {
    try {
      const response = await fetch('/api/twelvelabs/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'analyze',
          videoId,
          prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze video: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to analyze video:', error);
      throw error;
    }
  }

  async searchVideos(query: string) {
    try {
      const indexId = await this.getUserIndex();
      
      const response = await fetch('/api/twelvelabs/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'search',
          indexId,
          query,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to search videos: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to search videos:', error);
      throw error;
    }
  }

  // Helper to check if a media item should be indexed
  shouldIndexMedia(mediaItem: MediaItem): boolean {
    return (
      mediaItem.type === 'video' &&
      !mediaItem.ephemeral &&
      !mediaItem.twelveLabsTaskId // Don't re-index
    );
  }

  // Helper to start background indexing
  async startBackgroundIndexing(
    mediaItem: MediaItem,
    projectId: string,
    onStatusUpdate?: (status: IndexingStatus, error?: string, videoId?: string, taskId?: string) => void
  ): Promise<void> {
    if (!this.shouldIndexMedia(mediaItem) || !mediaItem.file) {
      return;
    }

    try {
      const uploadResult = await this.uploadVideoForIndexing(
        mediaItem.file,
        projectId,
        mediaItem.id
      );

      // Update the media item with initial indexing info
      if (onStatusUpdate) {
        onStatusUpdate('uploading', undefined, uploadResult.videoId, uploadResult.taskId);
      }

      // Start polling for status updates
      this.pollTaskStatus(uploadResult.taskId, uploadResult.videoId, onStatusUpdate, 10000, projectId, mediaItem.id);

    } catch (error) {
      console.error('Failed to start background indexing:', error);
      if (onStatusUpdate) {
        onStatusUpdate('failed', error instanceof Error ? error.message : 'Unknown error', undefined, undefined);
      }
    }
  }

  // Poll task status until completion
  private async pollTaskStatus(
    taskId: string,
    videoId: string,
    onStatusUpdate?: (status: IndexingStatus, error?: string, videoId?: string, taskId?: string) => void,
    pollInterval = 10000, // 10 seconds
    projectId?: string,
    mediaId?: string
  ): Promise<void> {
    const poll = async () => {
      try {
        const statusResult = await this.getTaskStatus(taskId, projectId, mediaId);
        
        if (onStatusUpdate) {
          onStatusUpdate(statusResult.status, undefined, statusResult.videoId, taskId);
        }

        // Continue polling if not completed
        if (!['ready', 'failed'].includes(statusResult.status)) {
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        console.error('Failed to poll task status:', error);
        if (onStatusUpdate) {
          onStatusUpdate('failed', error instanceof Error ? error.message : 'Status polling failed', undefined, taskId);
        }
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 2000);
  }
}

export const twelveLabsService = new TwelveLabsService();