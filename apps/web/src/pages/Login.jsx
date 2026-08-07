import { useState } from 'react';
import {
  DEMO_ACCOUNTS,
  authenticateDemo,
  writeDemoSession,
} from '../lib/demo.js';
import { getSupabaseClient } from '../lib/supabase.js';

export default function Login({ demoMode = false, onDemoLogin }) {
  const [email, setEmail] = useState(demoMode ? DEMO_ACCOUNTS.admin.email : '');
  const [password, setPassword] = useState(demoMode ? DEMO_ACCOUNTS.admin.password : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (demoMode) {
        const profile = authenticateDemo(email, password);
        if (!profile) {
          setError('Use maya@demo.local / maya123 ou paciente@demo.local / paciente123');
          return;
        }
        writeDemoSession(profile);
        onDemoLogin?.(profile);
        return;
      }

      const supabase = getSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError('Credenciais inválidas. Entre em contato com a Clínica Maya.');
      }
    } catch {
      setError('Credenciais inválidas. Entre em contato com a Clínica Maya.');
    } finally {
      setSubmitting(false);
    }
  }

  function enterAs(role) {
    const account = DEMO_ACCOUNTS[role];
    const { password: _ignored, ...profile } = account;
    writeDemoSession(profile);
    onDemoLogin?.(profile);
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <header className="login-hero">
          <div className="brand-orb brand-orb-lg">maya</div>
          <p>Fisioterapia com acompanhamento visual</p>
        </header>

        <div className="login-card">
          <h1>Bem-vindo(a)!</h1>
          <p className="login-lead">
            {demoMode
              ? 'Ambiente de demonstração. Entre como profissional ou paciente.'
              : 'Acesso exclusivo para profissionais e pacientes cadastrados pela clínica.'}
          </p>

          {demoMode ? (
            <div className="login-demo-actions">
              <button type="button" className="btn btn-primary" onClick={() => enterAs('admin')}>
                Sou profissional
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => enterAs('patient')}>
                Sou paciente
              </button>
            </div>
          ) : null}

          <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="field">
              <label htmlFor="email">Usuário</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seu e-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
