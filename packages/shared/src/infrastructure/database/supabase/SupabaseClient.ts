import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare const process: {
  readonly env: Readonly<Record<string, string | undefined>>;
};

let client: SupabaseClient | undefined;

/** Inicializa uma única instância compartilhada, somente no primeiro uso. */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.VITE_SUPABASE_URL;
  const anonymousKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonymousKey) {
    throw new Error(
      "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    );
  }

  client = createClient(url, anonymousKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export type { SupabaseClient };
