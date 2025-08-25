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

export interface UserIndexRow {
  id: string;
  user_id: string;
  index_id: string;
  index_name: string;
  created_at: string;
  updated_at: string;
}


