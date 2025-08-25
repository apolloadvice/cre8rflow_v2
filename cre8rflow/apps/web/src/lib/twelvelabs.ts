import { env } from "@/env";
import type { TwelveLabsTask } from "@/types/twelvelabs";

type CreateIndexResult = { id: string; name: string };
type SearchResult = unknown;
type AnalysisResult = unknown;
type UploadResult = { taskId: string; videoId: string };

function ensureConfigured() {
  if (!env.TWELVELABS_API_KEY) {
    throw new Error("TWELVELABS_API_KEY is not configured");
  }
}

export async function createUserIndex(userId: string): Promise<CreateIndexResult> {
  ensureConfigured();
  // Placeholder implementation to satisfy build. Replace with real API call.
  return { id: `idx_${userId}`, name: `user_${userId}` };
}

export async function uploadVideoToIndex(
  indexId: string,
  _videoFile: File,
  _metadata: Record<string, unknown>
): Promise<UploadResult> {
  ensureConfigured();
  // Placeholder implementation to satisfy build. Replace with real API call.
  return { taskId: "task_mock", videoId: "video_mock" };
}

export async function getTaskStatus(taskId: string): Promise<TwelveLabsTask> {
  ensureConfigured();
  // Placeholder implementation to satisfy build. Replace with real API call.
  return {
    id: taskId,
    video_id: "video_mock",
    index_id: "index_mock",
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    system_metadata: {
      duration: 0,
      filename: "mock.mp4",
      width: 0,
      height: 0,
    },
    hls: {
      video_url: undefined,
      thumbnail_urls: [],
      status: "PROCESSING",
      updated_at: new Date().toISOString(),
    },
  } satisfies TwelveLabsTask;
}

export async function analyzeVideo(
  _videoId: string,
  _prompt?: string
): Promise<AnalysisResult> {
  ensureConfigured();
  // Placeholder implementation to satisfy build. Replace with real API call.
  return { summary: "analysis not implemented" } as AnalysisResult;
}

export async function searchVideos(
  _indexId: string,
  _query: string
): Promise<SearchResult> {
  ensureConfigured();
  // Placeholder implementation to satisfy build. Replace with real API call.
  return { results: [] } as SearchResult;
}


