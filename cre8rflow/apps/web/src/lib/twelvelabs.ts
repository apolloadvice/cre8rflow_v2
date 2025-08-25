import { env } from "@/env";
import { z } from "zod";
import type { TwelveLabsTask } from "@/types/twelvelabs";

const TL_API_BASE = "https://api.twelvelabs.io/v1.3";

export class TwelveLabsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TwelveLabsApiError";
    this.status = status;
  }
}

function headersJson(): HeadersInit {
  return {
    "x-api-key": env.TWELVELABS_API_KEY,
    "Content-Type": "application/json",
  };
}

function headersMultipart(): HeadersInit {
  return {
    "x-api-key": env.TWELVELABS_API_KEY,
    // Let fetch set the boundary automatically
  } as HeadersInit;
}

const CreateIndexResponse = z.object({ _id: z.string() });

const TaskResponse = z.object({
  _id: z.string().optional(),
  id: z.string().optional(),
  status: z.string().optional(),
  index_id: z.string().optional(),
  video_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  hls: z
    .object({
      video_url: z.string().optional(),
      thumbnail_urls: z.array(z.string()).optional(),
      status: z.string().optional(),
      updated_at: z.string().optional(),
    })
    .optional(),
  system_metadata: z
    .object({
      duration: z.number().optional(),
      filename: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
});

export type CreateIndexResult = { id: string; name: string };
export type UploadResult = { taskId: string; videoId: string };
export type SearchResult = unknown;
export type AnalysisResult = unknown;

async function parseJsonOrThrow(resp: Response): Promise<any> {
  const text = await resp.text();
  if (!resp.ok) {
    // Try to extract message from JSON; fall back to text
    try {
      const err = JSON.parse(text);
      const message = err.error || err.message || text || `HTTP ${resp.status}`;
      throw new TwelveLabsApiError(message, resp.status);
    } catch {
      throw new TwelveLabsApiError(text || `HTTP ${resp.status}`, resp.status);
    }
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function findExistingIndex(indexName: string): Promise<CreateIndexResult | null> {
  console.log('🔍 Searching for existing TwelveLabs index:', indexName);
  
  if (!env.TWELVELABS_API_KEY) {
    console.error('❌ TWELVELABS_API_KEY is not configured');
    throw new Error("TWELVELABS_API_KEY is not configured");
  }

  try {
    // List all indexes to find the one with matching name
    const resp = await fetch(`${TL_API_BASE}/indexes`, {
      method: "GET",
      headers: { "x-api-key": env.TWELVELABS_API_KEY },
    });

    console.log('📥 TwelveLabs list indexes response:', {
      status: resp.status,
      statusText: resp.statusText
    });

    const json = await parseJsonOrThrow(resp);
    console.log('📊 TwelveLabs indexes response:', json);

    // The API returns { data: [...indexes] } format
    if (json.data && Array.isArray(json.data)) {
      const existingIndex = json.data.find((index: any) => index.index_name === indexName);
      
      if (existingIndex) {
        console.log('✅ Found existing TwelveLabs index:', existingIndex);
        return {
          id: existingIndex._id,
          name: existingIndex.index_name
        };
      }
    }

    console.log('❌ No existing index found with name:', indexName);
    return null;
  } catch (error) {
    console.error('❌ Error searching for existing index:', error);
    // Don't throw here, just return null so we can try creating a new index
    return null;
  }
}

export async function createUserIndex(userId: string): Promise<CreateIndexResult> {
  console.log('🚀 createUserIndex called for userId:', userId);
  
  if (!env.TWELVELABS_API_KEY) {
    console.error('❌ TWELVELABS_API_KEY is not configured');
    throw new Error("TWELVELABS_API_KEY is not configured");
  }
  
  console.log('✅ TWELVELABS_API_KEY is configured, length:', env.TWELVELABS_API_KEY.length);

  // Default index using marengo2.7 with visual+audio
  const body = {
    index_name: `opencut_user_${userId}`,
    models: [
      {
        model_name: "marengo2.7",
        model_options: ["visual", "audio"],
      },
    ],
  };
  
  console.log('📤 TwelveLabs API request:', {
    url: `${TL_API_BASE}/indexes`,
    headers: { 'x-api-key': env.TWELVELABS_API_KEY.substring(0, 10) + '...' },
    body
  });

  const resp = await fetch(`${TL_API_BASE}/indexes`, {
    method: "POST",
    headers: headersJson(),
    body: JSON.stringify(body),
  });
  
  console.log('📥 TwelveLabs API response:', {
    status: resp.status,
    statusText: resp.statusText,
    headers: Object.fromEntries(resp.headers.entries())
  });

  const json = await parseJsonOrThrow(resp);
  console.log('📊 TwelveLabs API response body:', json);
  
  const parsed = CreateIndexResponse.safeParse(json);
  if (!parsed.success) {
    console.error('❌ Invalid TwelveLabs response format:', parsed.error);
    throw new TwelveLabsApiError("Invalid TwelveLabs create index response", 502);
  }
  
  console.log('✅ Successfully created TwelveLabs index:', parsed.data);
  
  // Map TwelveLabs response format to our expected format
  return {
    id: parsed.data._id,
    name: body.index_name
  };
}

export async function uploadVideoToIndex(
  indexId: string,
  videoFile: File,
  _metadata: Record<string, unknown>
): Promise<UploadResult> {
  if (!env.TWELVELABS_API_KEY) {
    throw new Error("TWELVELABS_API_KEY is not configured");
  }

  const form = new FormData();
  form.append("index_id", indexId);
  form.append("video_file", videoFile, (videoFile as any).name || "upload.mp4");

  const resp = await fetch(`${TL_API_BASE}/tasks`, {
    method: "POST",
    headers: headersMultipart(),
    body: form,
  });

  const json = await parseJsonOrThrow(resp);
  console.log('📥 TwelveLabs upload response:', {
    status: resp.status,
    statusText: resp.statusText,
    body: json
  });
  
  const parsed = TaskResponse.safeParse(json);
  if (!parsed.success) {
    console.error('❌ TaskResponse schema validation failed:', parsed.error);
    console.error('📊 Received data:', json);
    throw new TwelveLabsApiError(`Invalid TwelveLabs task response: ${JSON.stringify(parsed.error.format())}`, 502);
  }

  return {
    taskId: parsed.data._id || parsed.data.id || "",
    videoId: parsed.data.video_id || "",
  };
}

export async function getTaskStatus(taskId: string): Promise<TwelveLabsTask> {
  if (!env.TWELVELABS_API_KEY) {
    throw new Error("TWELVELABS_API_KEY is not configured");
  }

  const resp = await fetch(`${TL_API_BASE}/tasks/${taskId}`, {
    headers: { "x-api-key": env.TWELVELABS_API_KEY },
    cache: "no-store",
  });

  const json = await parseJsonOrThrow(resp);
  console.log('📥 TwelveLabs task status response:', {
    taskId,
    status: resp.status,
    statusText: resp.statusText,
    body: json
  });
  
  const parsed = TaskResponse.safeParse(json);
  if (!parsed.success) {
    console.error('❌ TaskResponse schema validation failed for status:', parsed.error);
    console.error('📊 Received status data:', json);
    throw new TwelveLabsApiError(`Invalid TwelveLabs task status response: ${JSON.stringify(parsed.error.format())}`, 502);
  }

  const d = parsed.data;
  return {
    id: d._id || d.id || "",
    video_id: d.video_id || "",
    index_id: d.index_id || "",
    status: (d.status as TwelveLabsTask["status"]) || "pending",
    created_at: d.created_at || new Date().toISOString(),
    updated_at: d.updated_at || new Date().toISOString(),
    system_metadata: d.system_metadata,
    hls: d.hls as any,
  } satisfies TwelveLabsTask;
}

export async function analyzeVideo(
  _videoId: string,
  _prompt?: string
): Promise<AnalysisResult> {
  if (!env.TWELVELABS_API_KEY) {
    throw new Error("TWELVELABS_API_KEY is not configured");
  }

  const videoId = _videoId;
  const resp = await fetch(`${TL_API_BASE}/videos/${videoId}`, {
    headers: { "x-api-key": env.TWELVELABS_API_KEY },
  });
  const json = await parseJsonOrThrow(resp);
  return json as AnalysisResult;
}

export async function searchVideos(
  indexId: string,
  query: string
): Promise<SearchResult> {
  if (!env.TWELVELABS_API_KEY) {
    throw new Error("TWELVELABS_API_KEY is not configured");
  }

  const url = new URL(`${TL_API_BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("index_id", indexId);

  const resp = await fetch(url.toString(), {
    headers: { "x-api-key": env.TWELVELABS_API_KEY },
  });
  const json = await parseJsonOrThrow(resp);
  return json as SearchResult;
}

