import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const supabaseUrl =
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_PUBLIC_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)) ||
    'https://nedjnudzmphfxolcnxcm.supabase.co';

  const supabaseAnonKey =
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
    'sb_publishable_5W1jLi5I0-uz1Cwv5_I1-g_EnYd6zKf';

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

