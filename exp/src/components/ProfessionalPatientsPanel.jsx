import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@smartsaude/shared';

const LOCAL_PATIENTS_KEY = 'clinica-maya-professional-patients';

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

function readLocalPatients() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_PATIENTS_KEY) || 'null');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeLocalPatients(patients) {
  localStorage.setItem(LOCAL_PATIENTS_KEY, JSON.stringify(patients));
}

export default function ProfessionalPatientsPanel({ user, onBack }) {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPatients = async () => {
    setLoading(true);
    setError('');

    try {
      if (!isSupabaseConfigured()) {
        setPatients(readLocalPatients());
        return;
      }

      const supabase = getSupabaseClient();
      const { data, error: loadError } = await supabase
        .from('clinic_patients')
        .select('id, full_name, email, phone, created_at')
        .order('created_at', { ascending: false });

      if (loadError) throw loadError;
      setPatients(data ?? []);
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err);
      setError('Nao foi possivel carregar os pacientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const patient = {
      id: crypto.randomUUID?.() || String(Date.now()),
      full_name: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      created_by: user?.id || null,
      created_at: new Date().toISOString(),
    };

    if (!patient.full_name || !patient.email) {
      setError('Informe nome e email do paciente.');
      setSaving(false);
      return;
    }

    try {
      if (!isSupabaseConfigured()) {
        const nextPatients = [patient, ...patients.filter(item => item.email !== patient.email)];
        writeLocalPatients(nextPatients);
        setPatients(nextPatients);
      } else {
        const supabase = getSupabaseClient();
        const { data, error: insertError } = await supabase
          .from('clinic_patients')
          .insert(patient)
          .select('id, full_name, email, phone, created_at')
          .single();

        if (insertError) throw insertError;
        setPatients(prev => [data, ...prev]);
      }

      setForm({ fullName: '', email: '', phone: '' });
      setMessage('Paciente cadastrado.');
    } catch (err) {
      console.error('Erro ao criar paciente:', err);
      setError('Nao foi possivel cadastrar. Verifique se o email ja existe.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (patient) => {
    setMessage('');
    setError('');

    try {
      if (!isSupabaseConfigured()) {
        const nextPatients = patients.filter(item => item.id !== patient.id);
        writeLocalPatients(nextPatients);
        setPatients(nextPatients);
      } else {
        const supabase = getSupabaseClient();
        const { error: deleteError } = await supabase
          .from('clinic_patients')
          .delete()
          .eq('id', patient.id);

        if (deleteError) throw deleteError;
        setPatients(prev => prev.filter(item => item.id !== patient.id));
      }

      setMessage('Paciente excluido.');
    } catch (err) {
      console.error('Erro ao excluir paciente:', err);
      setError('Nao foi possivel excluir o paciente.');
    }
  };

  return (
    <section className="maya-documents-page">
      <div className="maya-view-toolbar">
        <button type="button" className="maya-ghost-button" onClick={onBack}>Voltar</button>
        <div>
          <h2>Pacientes</h2>
          <p>Cadastro da clinica</p>
        </div>
      </div>

      <div className="maya-professional-data-layout">
        <form className="maya-panel-card maya-panel-form" onSubmit={handleCreate}>
          <h3 className="maya-panel-title">Novo paciente</h3>

          <label className="maya-panel-label" htmlFor="patient-name">Nome</label>
          <input
            id="patient-name"
            className="maya-input"
            value={form.fullName}
            onChange={(event) => handleChange('fullName', event.target.value)}
            placeholder="Nome completo"
          />

          <label className="maya-panel-label" htmlFor="patient-email">Email</label>
          <input
            id="patient-email"
            className="maya-input"
            type="email"
            value={form.email}
            onChange={(event) => handleChange('email', event.target.value)}
            placeholder="paciente@email.com"
          />

          <label className="maya-panel-label" htmlFor="patient-phone">Telefone</label>
          <input
            id="patient-phone"
            className="maya-input"
            value={form.phone}
            onChange={(event) => handleChange('phone', event.target.value)}
            placeholder="(00) 00000-0000"
          />

          <button type="submit" className="maya-primary-button" disabled={saving}>
            {saving ? 'Salvando...' : 'Criar paciente'}
          </button>

          {message && <p className="maya-form-success">{message}</p>}
          {error && <p className="maya-form-error">{error}</p>}
        </form>

        <section className="maya-panel-card">
          <h3 className="maya-panel-title">Pacientes cadastrados</h3>
          {loading ? (
            <p className="maya-panel-copy">Carregando...</p>
          ) : patients.length ? (
            <div className="maya-table-list">
              {patients.map(patient => (
                <div key={patient.id} className="maya-table-row">
                  <div>
                    <strong>{patient.full_name}</strong>
                    <span>{patient.email}</span>
                    {patient.phone && <small>{patient.phone}</small>}
                  </div>
                  <button type="button" className="maya-danger-button" onClick={() => handleDelete(patient)}>
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="maya-panel-copy">Nenhum paciente cadastrado ainda.</p>
          )}
        </section>
      </div>
    </section>
  );
}
