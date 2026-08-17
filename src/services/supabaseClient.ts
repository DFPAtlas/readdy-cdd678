import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

/**
 * Shared Supabase client singleton. Reused across the app so we never
 * instantiate multiple clients per session.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined) || undefined;
  const key = (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined) || undefined;

  client = url && key ? createClient(url, key) : null;
  return client;
}