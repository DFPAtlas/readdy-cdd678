import { FunctionsClient } from '@supabase/functions-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/** The pinned Functions SDK accepts cancellation through customFetch, not invoke options. */
export async function invokeFunctionWithSignal(
  supabase: SupabaseClient,
  name: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
  const key = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  // Reuse the canonical auth session, including its normal token refresh.
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  signal.throwIfAborted();
  if (!data.session?.access_token) throw new Error('Authentication required');
  const functions = new FunctionsClient(new URL('functions/v1', `${url.replace(/\/$/, '')}/`).href, {
    headers: { apikey: key, Authorization: `Bearer ${data.session.access_token}` },
    customFetch: (input, init) => fetch(input, { ...init, signal }),
  });
  const result = await functions.invoke<unknown>(name, { body });
  // The SDK wraps fetch aborts as FunctionsFetchError; preserve cancellation for callers.
  signal.throwIfAborted();
  return result;
}
