import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Ambiente Supabase incompleto.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Não autenticado.' }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Sessão inválida.' }, 401);
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || callerProfile?.role !== 'admin') {
      return jsonResponse({ error: 'Apenas a profissional pode cadastrar pacientes.' }, 403);
    }

    const payload = await req.json();
    const email = String(payload?.email || '').trim().toLowerCase();
    const fullName = String(payload?.fullName || '').trim();
    const password = String(payload?.password || '');

    if (!email || !password || password.length < 6) {
      return jsonResponse({ error: 'Informe e-mail e senha (mín. 6 caracteres).' }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'patient',
      },
    });

    if (createError || !created?.user) {
      return jsonResponse({ error: createError?.message || 'Falha ao criar usuário.' }, 400);
    }

    const { error: upsertError } = await adminClient.from('profiles').upsert({
      id: created.user.id,
      email,
      full_name: fullName || null,
      role: 'patient',
    });

    if (upsertError) {
      return jsonResponse({ error: upsertError.message }, 400);
    }

    return jsonResponse({
      ok: true,
      userId: created.user.id,
      email,
    });
  } catch (err) {
    return jsonResponse({ error: err?.message || 'Erro interno.' }, 500);
  }
});
