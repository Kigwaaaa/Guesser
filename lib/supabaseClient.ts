// Browser Supabase client configured from the public project environment variables.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn(
    "Supabase is not configured. Copy .env.local.example to .env.local and add your real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY values."
  );
}

// The anonymous key is intended for browser use; Supabase RLS protects database access.
// We intentionally avoid silently connecting to placeholder values in local development.
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : createClient("https://placeholder.supabase.co", "placeholder-anon-key", {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });