import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica se as credenciais parecem válidas (não são placeholders)
const hasValidCredentials = !!(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.includes('supabase.co') &&
  supabaseKey.startsWith('eyJ')
);

export const isSupabaseConfigured = hasValidCredentials;

export const supabase = hasValidCredentials
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { 'x-client-info': 'marmitaria-da-diih' },
      },
    })
  : null;
