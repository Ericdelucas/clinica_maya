import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@smartsaude/shared';
import Login from '@/pages/Login';
import Home from '@/pages/Home';

const DEMO_ACCOUNTS = {
  admin: {
    id: 'maya-professional',
    email: 'mayayyamamoto@gmail.com',
    password: '1234',
    fullName: 'Maya',
    role: 'admin',
    metadataRole: 'profissional',
  },
  patient: {
    id: 'eric-patient',
    email: 'ericdelucass@gmail.com',
    password: 'coelhinhoE123',
    fullName: 'Eric',
    role: 'patient',
    metadataRole: 'patient',
  },
};

const LOCAL_DEMO_RESET_KEY = 'clinica-maya-demo-reset-2026-07-09-v2';
const LOCAL_STORAGE_KEYS_TO_RESET = [
  'clinica-maya-hotspot-links',
  'clinica-maya-calendar-events',
  'clinica-maya-patient-pre-exams',
];

function navigate(path) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

function normalizeRole(profileRole, userRole) {
  const role = String(profileRole || userRole || 'patient').toLowerCase();
  if (['admin', 'profissional', 'professional'].includes(role)) return 'admin';
  return 'patient';
}

function isSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return Boolean(
    url
    && key
    && url.startsWith('http')
    && !url.includes('cole_aqui')
    && !key.includes('cole_aqui'),
  );
}

function createDemoContext(role = 'admin') {
  const account = role === 'patient' ? DEMO_ACCOUNTS.patient : DEMO_ACCOUNTS.admin;

  return {
    user: {
      id: account.id,
      email: account.email,
      user_metadata: { role: account.metadataRole },
    },
    profile: {
      id: account.id,
      role: account.metadataRole,
      full_name: account.fullName,
    },
    role: account.role,
    isDemo: true,
  };
}

function findDemoAccount(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return Object.values(DEMO_ACCOUNTS).find(account => (
    account.email === normalizedEmail && account.password === String(password || '')
  ));
}

function resetLegacyDemoData() {
  if (typeof window === 'undefined' || isSupabaseConfigured()) return;
  if (window.localStorage.getItem(LOCAL_DEMO_RESET_KEY)) return;

  LOCAL_STORAGE_KEYS_TO_RESET.forEach((key) => {
    window.localStorage.removeItem(key);
  });

  window.localStorage.setItem('clinica-maya-professional-patients', JSON.stringify([
    {
      id: 'eric-patient',
      full_name: 'Eric',
      email: DEMO_ACCOUNTS.patient.email,
      phone: '',
      created_at: new Date().toISOString(),
    },
  ]));
  window.localStorage.setItem(LOCAL_DEMO_RESET_KEY, 'done');
}

async function loadUserContext() {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const user = sessionData?.session?.user;
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    user,
    profile,
    role: normalizeRole(profile?.role, user.user_metadata?.role),
  };
}

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [context, setContext] = useState(null);

  useEffect(() => {
    const handleRouteChange = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  useEffect(() => {
    if (!context && route !== '/login') navigate('/login');
  }, [context, route]);

  useEffect(() => {
    resetLegacyDemoData();

    let isMounted = true;

    loadUserContext()
      .then((loadedContext) => {
        if (!isMounted || !loadedContext) return;
        setContext(loadedContext);
        if (window.location.pathname === '/login') navigate('/');
      })
      .catch((error) => {
        console.error('Erro ao restaurar sessao:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = async ({ email, password }) => {
    if (!isSupabaseConfigured()) {
      const demoAccount = findDemoAccount(email, password);
      if (!demoAccount) return { ok: false };

      setContext(createDemoContext(demoAccount.role));
      navigate('/');
      return { ok: true };
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error };

    const loadedContext = await loadUserContext();
    setContext(loadedContext);
    navigate('/');
    return { ok: true };
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    }

    setContext(null);
    navigate('/login');
  };

  if (route === '/login') {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (!context) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Home
      user={context.user}
      profile={context.profile}
      role={context.role}
      onLogout={handleLogout}
    />
  );
}
