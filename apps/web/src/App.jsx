import { useEffect, useState } from 'react';
import {
  clearDemoSession,
  hydrateDemoProfile,
  readDemoSession,
  startCloudAccountSync,
  stopCloudAccountSync,
  syncLocalPatientsToCloud,
  writeDemoSession,
} from './lib/demo.js';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase.js';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';

function normalizeRole(role) {
  const value = String(role || '').toLowerCase();
  if (value === 'admin' || value === 'profissional' || value === 'professional') {
    return 'admin';
  }
  return 'patient';
}

export default function App() {
  const demoMode = !isSupabaseConfigured();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (demoMode) {
      // Limpa qualquer sessão profissional persistida por engano.
      const rawSession = readDemoSession();
      if (rawSession?.role === 'admin' || rawSession?.id === 'professional-maya') {
        clearDemoSession();
      }

      const restored = hydrateDemoProfile(readDemoSession());
      if (restored && restored.role === 'patient') {
        writeDemoSession(restored);
        setSession({ user: { id: restored.id } });
        setProfile(restored);
      } else {
        clearDemoSession();
        setSession(null);
        setProfile(null);
      }
      startCloudAccountSync();
      setBootstrapping(false);
      return () => stopCloudAccountSync();
    }

    const supabase = getSupabaseClient();
    let active = true;

    async function loadProfile(userId) {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, full_name')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!data) {
        throw new Error('Perfil não encontrado. Contate a Clínica Maya.');
      }

      return {
        ...data,
        role: normalizeRole(data.role),
      };
    }

    async function syncSession(nextSession) {
      if (!active) return;

      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setError('');
        setBootstrapping(false);
        return;
      }

      try {
        const nextProfile = await loadProfile(nextSession.user.id);
        if (!active) return;
        setProfile(nextProfile);
        setError('');
      } catch (err) {
        if (!active) return;
        setProfile(null);
        setError(err?.message || 'Falha ao carregar perfil.');
      } finally {
        if (active) setBootstrapping(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setBootstrapping(true);
      void syncSession(nextSession);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [demoMode]);

  function handleDemoLogin(nextProfile) {
    writeDemoSession(nextProfile);
    setSession({ user: { id: nextProfile.id } });
    setProfile(nextProfile);
    setError('');
    // Profissional: sobe o que estava só neste celular e baixa a lista oficial
    if (nextProfile?.role === 'admin') {
      void syncLocalPatientsToCloud().catch(() => {});
    }
  }

  function handleProfileUpdate(nextProfile) {
    writeDemoSession(nextProfile);
    setProfile(nextProfile);
  }

  async function handleLogout() {
    if (demoMode) {
      clearDemoSession();
      setSession(null);
      setProfile(null);
      return;
    }

    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  if (bootstrapping) {
    return <div className="app-loading">Carregando RPG.Mayêutica…</div>;
  }

  if (!session) {
    return <Login demoMode={demoMode} onDemoLogin={handleDemoLogin} />;
  }

  if (error || !profile) {
    return (
      <div className="app-error">
        <p>{error || 'Perfil indisponível.'}</p>
        <button type="button" className="btn btn-ghost" onClick={() => void handleLogout()}>
          Sair
        </button>
      </div>
    );
  }

  return (
    <Home
      profile={profile}
      demoMode={demoMode}
      onLogout={() => void handleLogout()}
      onProfileUpdate={handleProfileUpdate}
    />
  );
}
