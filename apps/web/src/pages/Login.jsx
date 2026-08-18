import { useState } from 'react';
import { authenticateDemo } from '../lib/demo.js';
import { getSupabaseClient } from '../lib/supabase.js';

export default function Login({ demoMode = false, onDemoLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          setError('E-mail ou senha inválidos.');
          return;
        }
        onDemoLogin?.(profile);
        return;
      }

      const supabase = getSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError('Credenciais inválidas. Entre em contato com a clínica.');
      }
    } catch {
      setError('Não foi possível entrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <header className="login-hero">
          <div className="brand-orb brand-orb-lg">RPG</div>
          <p>RPG.Mayêutica — fisioterapia com acompanhamento visual</p>
        </header>

        <div className="login-card">
          <h1>Entrar</h1>
          <p className="login-lead">
            Acesso restrito. Use o e-mail e a senha cadastrados. A área profissional
            é exclusiva da fisioterapeuta.
          </p>

          <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
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
