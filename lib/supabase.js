import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

// The anon key is public by design. Security comes from the Row Level Security rules in supabase/schema.sql.
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
