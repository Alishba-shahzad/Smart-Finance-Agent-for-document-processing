import { createClient } from '@supabase/supabase-js';

/**
 * Get active Supabase client for backend operations
 */
export function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://nedjnudzmphfxolcnxcm.supabase.co';

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_5W1jLi5I0-uz1Cwv5_I1-g_EnYd6zKf';

  return createClient(supabaseUrl, supabaseKey);
}

