import React, { useState } from 'react';

const QUICK_LOGINS = {
  admin: {
    email: 'mayayyamamoto@gmail.com',
    password: '1234',
  },
  patient: {
    email: 'ericdelucass@gmail.com',
    password: 'coelhinhoE123',
  },
};

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await onLoginSuccess?.({ email, password });
      if (result?.ok === false) {
        setError('Email ou senha invalidos.');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Nao foi possivel entrar agora.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setError('');
    setLoading(true);

    const account = role === 'patient' ? QUICK_LOGINS.patient : QUICK_LOGINS.admin;
    const quickEmail = account.email;
    const quickPassword = account.password;

    setEmail(quickEmail);
    setPassword(quickPassword);

    try {
      const result = await onLoginSuccess?.({ email: quickEmail, password: quickPassword });
      if (result?.ok === false) {
        setError('Email ou senha invalidos.');
      }
    } catch (err) {
      console.error('Erro no login rapido:', err);
      setError('Nao foi possivel entrar agora.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="maya-login-page">
      <div className="maya-login-logo">
        <span>maya</span>
        <small>yamamoto rpg</small>
      </div>
      <h1 className="maya-login-welcome">Bem Vindo(a)!</h1>

      <section className="maya-login-panel">
        <h2>Login</h2>

        <form className="maya-login-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">Usuario</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Usuario"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Senha"
              required
            />
          </div>

          <label className="maya-check-row">
            <input type="checkbox" />
            <span>Li e aceito os Termos de Uso e a Politica de Privacidade.</span>
          </label>

          <label className="maya-check-row">
            <input type="checkbox" />
            <span>Autorizo o uso dos meus dados para acompanhamento fisioterapeutico.</span>
          </label>

          {error && <p className="maya-form-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="maya-login-role-actions">
            <button type="button" onClick={() => handleQuickLogin('admin')} disabled={loading}>
              Entrar como profissional
            </button>
            <button type="button" onClick={() => handleQuickLogin('patient')} disabled={loading}>
              Entrar como paciente
            </button>
          </div>

          <p className="maya-login-hint">
            Profissional: mayayyamamoto@gmail.com / 1234. Paciente: ericdelucass@gmail.com / coelhinhoE123.
          </p>
        </form>
      </section>
    </main>
  );
}
