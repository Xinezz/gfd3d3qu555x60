import type { SupabaseClient } from '@supabase/supabase-js';
import type { PulledRow, RemoteStore } from './engine';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Sync exists only in builds given a Supabase project; otherwise the app is local-only. */
export const syncConfigured = !!(url && key);

let client: Promise<SupabaseClient> | null = null;

/** Loaded on demand so local-only builds never download the Supabase library. */
export function getClient(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'lockin.auth' },
    }),
  );
  return client;
}

export function supabaseRemote(c: SupabaseClient): RemoteStore {
  return {
    async push(rows) {
      const { error } = await c.rpc('lockin_push', { rows });
      if (error) throw new Error(error.message);
    },
    async pull(afterSeq, limit) {
      const { data, error } = await c.from('lockin_records').select('collection,id,data,updated_at,seq').gt('seq', afterSeq).order('seq').limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as PulledRow[];
    },
  };
}

export async function deleteRemote(c: SupabaseClient, userId: string) {
  const { error } = await c.from('lockin_records').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}
