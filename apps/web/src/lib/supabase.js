import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isPlaceholder(value) {
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes('seu-projeto')
    || lower.includes('sua-chave')
    || lower.includes('cole_aqui')
    || lower.includes('your-project')
    || lower.includes('your-anon')
  );
}

export function isSupabaseConfigured() {
  return Boolean(
    url
    && anonKey
    && url.startsWith('http')
    && !isPlaceholder(url)
    && !isPlaceholder(anonKey),
  );
}

let client = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em apps/web/.env.local',
    );
  }

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}
