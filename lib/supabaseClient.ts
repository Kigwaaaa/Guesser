// Browser Supabase client configured from the public project environment variables.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The anonymous key is intended for browser use; Supabase RLS protects database access.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);