import { env } from "@/env";

// Minimal REST helper using fetch and service role key (server-only)
// We intentionally avoid client SDK to keep bundle lean; this file must not be imported client-side.

type SupabaseResponse<T> = {
  data?: T;
  error?: { message: string } | null;
};

export async function supabaseSelectOne<T>(
  table: string,
  query: Record<string, string>
): Promise<T | null> {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, `eq.${value}`);
  }
  url.searchParams.set("limit", "1");
  url.searchParams.set("select", "*");

  const resp = await fetch(url.toString(), {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Supabase select failed: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as T[];
  return data.length > 0 ? data[0] : null;
}

export async function supabaseInsert<T>(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[]
): Promise<SupabaseResponse<T>> {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });

  const text = await resp.text();
  if (!resp.ok) {
    return { error: { message: text || `HTTP ${resp.status}` } };
  }

  return { data: JSON.parse(text) as T };
}

export async function supabaseUpsert<T>(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[],
  onConflict?: string
): Promise<SupabaseResponse<T>> {
  console.log('🔍 [supabaseUpsert] Starting upsert operation');
  console.log('  - table:', table);
  console.log('  - onConflict:', onConflict);
  console.log('  - rows:', JSON.stringify(rows, null, 2));
  console.log('  - SUPABASE_URL:', env.SUPABASE_URL);
  console.log('  - Service key available:', !!env.SUPABASE_SERVICE_KEY);
  console.log('  - Service key starts with:', env.SUPABASE_SERVICE_KEY?.substring(0, 10) + '...');
  
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/${table}`);
  const headers: Record<string, string> = {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  if (onConflict) {
    // PostgREST requires both Prefer: resolution=merge-duplicates and on_conflict query param
    headers["Prefer"] += `,resolution=merge-duplicates`;
    url.searchParams.set("on_conflict", onConflict);
  }
  
  console.log('  - Final URL:', url.toString());
  console.log('  - Headers:', Object.keys(headers));
  console.log('  - Request body:', JSON.stringify(rows));

  try {
    const resp = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(rows),
    });
    
    console.log('  - Response status:', resp.status, resp.statusText);
    console.log('  - Response ok:', resp.ok);
    
    const text = await resp.text();
    console.log('  - Response body:', text);
    
    if (!resp.ok) {
      console.error('❌ [supabaseUpsert] Request failed:', {
        status: resp.status,
        statusText: resp.statusText,
        body: text,
        url: url.toString(),
        headers: Object.keys(headers)
      });
      
      // Parse the error for more details
      try {
        const errorDetails = JSON.parse(text);
        console.error('  - Parsed error details:', errorDetails);
      } catch {
        console.error('  - Raw error text:', text);
      }
      
      return { error: { message: text || `HTTP ${resp.status}` } };
    }
    
    const parsedData = text ? JSON.parse(text) : null;
    console.log('✅ [supabaseUpsert] Success:', parsedData);
    return { data: parsedData as T };
  } catch (error) {
    console.error('❌ [supabaseUpsert] Exception during fetch:');
    console.error('  - Error type:', typeof error);
    console.error('  - Error message:', error instanceof Error ? error.message : String(error));
    console.error('  - Full error:', error);
    throw error;
  }
}

export async function supabaseUpdate<T>(
  table: string,
  updates: Record<string, unknown>,
  query: Record<string, string>
): Promise<SupabaseResponse<T>> {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, `eq.${value}`);
  }

  const resp = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(updates),
  });

  const text = await resp.text();
  if (!resp.ok) {
    return { error: { message: text || `HTTP ${resp.status}` } };
  }

  return { data: JSON.parse(text) as T };
}

export interface UserIndexRow {
  id: string;
  user_id: string;
  index_id: string;
  index_name: string;
  created_at: string;
  updated_at: string;
}

export interface MediaTwelveLabsRow {
  id: string;
  user_id: string;
  project_id: string;
  media_id: string;
  
  // TwelveLabs identifiers
  index_id: string;
  video_id?: string;
  task_id?: string;
  
  // Status tracking
  status: string;
  error_message?: string;
  
  // TwelveLabs metadata
  duration?: string;
  filename?: string;
  width?: string;
  height?: string;
  
  // HLS streaming URLs
  video_url?: string;
  thumbnail_urls?: string; // JSON string
  
  created_at: string;
  updated_at: string;
}

// TwelveLabs-specific helper functions
export async function saveTwelveLabsMetadata(
  userId: string,
  projectId: string,
  mediaId: string,
  data: {
    indexId: string;
    videoId?: string;
    taskId?: string;
    status: string;
    errorMessage?: string;
    duration?: number;
    filename?: string;
    width?: number;
    height?: number;
    videoUrl?: string;
    thumbnailUrls?: string[];
  }
): Promise<SupabaseResponse<MediaTwelveLabsRow>> {
  console.log('🔍 [saveTwelveLabsMetadata] Starting save operation');
  console.log('  - Input data:', {
    userId,
    projectId,
    mediaId,
    indexId: data.indexId,
    videoId: data.videoId,
    taskId: data.taskId,
    status: data.status,
    filename: data.filename
  });
  
  const row = {
    user_id: userId,
    project_id: projectId,
    media_id: mediaId,
    index_id: data.indexId,
    video_id: data.videoId,
    task_id: data.taskId,
    status: data.status,
    error_message: data.errorMessage,
    duration: data.duration?.toString(),
    filename: data.filename,
    width: data.width?.toString(),
    height: data.height?.toString(),
    video_url: data.videoUrl,
    thumbnail_urls: data.thumbnailUrls ? JSON.stringify(data.thumbnailUrls) : null,
    updated_at: new Date().toISOString(),
  };
  
  console.log('  - Constructed row for upsert:', row);
  console.log('  - Calling supabaseUpsert with table: "media_twelvelabs", conflict: "media_id,project_id"');

  try {
    const result = await supabaseUpsert<MediaTwelveLabsRow>(
      "media_twelvelabs",
      row,
      "media_id,project_id"
    );
    
    console.log('🔍 [saveTwelveLabsMetadata] Upsert result:', {
      hasData: !!result.data,
      hasError: !!result.error,
      data: result.data,
      error: result.error
    });
    
    return result;
  } catch (error) {
    console.error('❌ [saveTwelveLabsMetadata] Exception during upsert:');
    console.error('  - Error type:', typeof error);
    console.error('  - Error message:', error instanceof Error ? error.message : String(error));
    console.error('  - Full error:', error);
    throw error;
  }
}

export async function updateTwelveLabsStatus(
  mediaId: string,
  projectId: string,
  updates: {
    status?: string;
    errorMessage?: string;
    videoId?: string;
    taskId?: string;
    duration?: number;
    filename?: string;
    width?: number;
    height?: number;
    videoUrl?: string;
    thumbnailUrls?: string[];
  }
): Promise<SupabaseResponse<MediaTwelveLabsRow>> {
  console.log('🔍 [updateTwelveLabsStatus] Starting update operation');
  console.log('  - mediaId:', mediaId);
  console.log('  - projectId:', projectId);
  console.log('  - updates:', updates);
  
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) updateData.status = updates.status;
  if (updates.errorMessage) updateData.error_message = updates.errorMessage;
  if (updates.videoId) updateData.video_id = updates.videoId;
  if (updates.taskId) updateData.task_id = updates.taskId;
  if (updates.duration) updateData.duration = updates.duration.toString();
  if (updates.filename) updateData.filename = updates.filename;
  if (updates.width) updateData.width = updates.width.toString();
  if (updates.height) updateData.height = updates.height.toString();
  if (updates.videoUrl) updateData.video_url = updates.videoUrl;
  if (updates.thumbnailUrls) updateData.thumbnail_urls = JSON.stringify(updates.thumbnailUrls);

  console.log('  - Constructed update data:', updateData);
  console.log('  - Query filters: { media_id:', mediaId, ', project_id:', projectId, '}');
  
  try {
    const result = await supabaseUpdate<MediaTwelveLabsRow>(
      "media_twelvelabs",
      updateData,
      { media_id: mediaId, project_id: projectId }
    );
    
    console.log('🔍 [updateTwelveLabsStatus] Update result:', {
      hasData: !!result.data,
      hasError: !!result.error,
      data: result.data,
      error: result.error
    });
    
    return result;
  } catch (error) {
    console.error('❌ [updateTwelveLabsStatus] Exception during update:');
    console.error('  - Error type:', typeof error);
    console.error('  - Error message:', error instanceof Error ? error.message : String(error));
    console.error('  - Full error:', error);
    throw error;
  }
}

export async function getTwelveLabsMetadata(
  projectId: string,
  mediaIds: string[]
): Promise<MediaTwelveLabsRow[]> {
  if (mediaIds.length === 0) return [];

  const url = new URL(`${env.SUPABASE_URL}/rest/v1/media_twelvelabs`);
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("media_id", `in.(${mediaIds.join(",")})`);
  url.searchParams.set("select", "*");

  const resp = await fetch(url.toString(), {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    console.error(`Failed to fetch TwelveLabs metadata: ${resp.status}`);
    return [];
  }

  return (await resp.json()) as MediaTwelveLabsRow[];
}


