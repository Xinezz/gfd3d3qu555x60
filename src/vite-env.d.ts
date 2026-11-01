/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://abcd.supabase.co (optional: sync is off without it). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/publishable key. Safe to ship in the browser; row-level security protects data. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
