import React, { useRef, useState } from 'react';
import { getSupabaseClient } from '@smartsaude/shared';

const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

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

function safeFileName(fileName) {
  return fileName.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_');
}

const initialForm = {
  painLocation: '',
  painIntensity: '0',
  painStarted: '',
  hasFever: 'nao',
  usesMedication: 'nao',
  medicationDetails: '',
  hasAllergy: 'nao',
  allergyDetails: '',
  previousSurgery: 'nao',
  surgeryDetails: '',
  mainComplaint: '',
  notes: '',
};

export default function PatientDocumentsPanel({ user, onBack }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setMessage('');
    setError('');

    if (file && !ACCEPTED_FILE_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setError('Envie um arquivo PDF, PNG ou JPG.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const saveLocalPreExam = () => {
    const saved = JSON.parse(localStorage.getItem('clinica-maya-patient-pre-exams') || '[]');
    saved.unshift({
      id: Date.now(),
      paciente_id: user?.id || user?.email || 'demo',
      patient_email: user?.email || '',
      answers: form,
      file_name: selectedFile?.name || '',
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('clinica-maya-patient-pre-exams', JSON.stringify(saved));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!isSupabaseConfigured()) {
        saveLocalPreExam();
        setMessage('Pre-exame salvo neste computador. Configure o Supabase para enviar para o banco.');
        setForm(initialForm);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const supabase = getSupabaseClient();
      const pacienteId = user?.id || user?.email || 'anonymous';
      let publicUrl = '';

      if (selectedFile) {
        const fileName = `${pacienteId}/${Date.now()}_${safeFileName(selectedFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from('patient-documents')
          .upload(fileName, selectedFile, {
            contentType: selectedFile.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('patient-documents')
          .getPublicUrl(fileName);

        publicUrl = publicUrlData?.publicUrl || '';

        if (publicUrl) {
          const { error: insertDocumentError } = await supabase
            .from('patient_documents')
            .insert({
              paciente_id: pacienteId,
              patient_email: user?.email || '',
              notes: form.notes,
              file_url: publicUrl,
            });

          if (insertDocumentError) throw insertDocumentError;
        }
      }

      const { error: preExamError } = await supabase
        .from('patient_pre_exams')
        .insert({
          paciente_id: pacienteId,
          patient_email: user?.email || '',
          answers: form,
          document_url: publicUrl,
        });

      if (preExamError) throw preExamError;

      setMessage('Documentos e pre-exame enviados com sucesso.');
      setForm(initialForm);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Erro ao enviar pre-exame:', err);
      setError('Nao foi possivel enviar agora. Verifique o banco e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="maya-documents-page">
      <div className="maya-view-toolbar">
        <button type="button" className="maya-ghost-button" onClick={onBack}>Voltar</button>
        <div>
          <h2>Documentos</h2>
          <p>Pre-exame e arquivos clinicos</p>
        </div>
      </div>

      <form className="maya-documents-form" onSubmit={handleSubmit}>
        <section className="maya-panel-card">
          <h3 className="maya-panel-title">Documento clinico</h3>
          <p className="maya-panel-copy">Envie exames, laudos, imagens ou PDFs para a consulta.</p>
          <label className="maya-panel-label" htmlFor="patient-document">Arquivo</label>
          <input
            id="patient-document"
            ref={fileInputRef}
            className="maya-file-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            disabled={saving}
          />
        </section>

        <section className="maya-panel-card">
          <h3 className="maya-panel-title">Perguntas de pre-exame</h3>

          <div className="maya-question-grid">
            <label>
              Onde sente dor?
              <input className="maya-input" value={form.painLocation} onChange={(event) => updateField('painLocation', event.target.value)} placeholder="Ex: lombar, joelho, ombro" />
            </label>

            <label>
              Intensidade da dor
              <input className="maya-input" type="range" min="0" max="10" value={form.painIntensity} onChange={(event) => updateField('painIntensity', event.target.value)} />
              <strong>{form.painIntensity}/10</strong>
            </label>

            <label>
              Quando comecou?
              <input className="maya-input" value={form.painStarted} onChange={(event) => updateField('painStarted', event.target.value)} placeholder="Ex: ha 2 semanas" />
            </label>

            <label>
              Febre recente?
              <select className="maya-input" value={form.hasFever} onChange={(event) => updateField('hasFever', event.target.value)}>
                <option value="nao">Nao</option>
                <option value="sim">Sim</option>
              </select>
            </label>

            <label>
              Usa medicamento?
              <select className="maya-input" value={form.usesMedication} onChange={(event) => updateField('usesMedication', event.target.value)}>
                <option value="nao">Nao</option>
                <option value="sim">Sim</option>
              </select>
            </label>

            <label>
              Qual medicamento?
              <input className="maya-input" value={form.medicationDetails} onChange={(event) => updateField('medicationDetails', event.target.value)} placeholder="Nome e dose se souber" />
            </label>

            <label>
              Tem alergia?
              <select className="maya-input" value={form.hasAllergy} onChange={(event) => updateField('hasAllergy', event.target.value)}>
                <option value="nao">Nao</option>
                <option value="sim">Sim</option>
              </select>
            </label>

            <label>
              Qual alergia?
              <input className="maya-input" value={form.allergyDetails} onChange={(event) => updateField('allergyDetails', event.target.value)} placeholder="Medicamentos, alimentos, outros" />
            </label>

            <label>
              Cirurgia anterior?
              <select className="maya-input" value={form.previousSurgery} onChange={(event) => updateField('previousSurgery', event.target.value)}>
                <option value="nao">Nao</option>
                <option value="sim">Sim</option>
              </select>
            </label>

            <label>
              Qual cirurgia?
              <input className="maya-input" value={form.surgeryDetails} onChange={(event) => updateField('surgeryDetails', event.target.value)} placeholder="Procedimento e ano" />
            </label>
          </div>

          <label className="maya-wide-label">
            Queixa principal
            <textarea className="maya-textarea" value={form.mainComplaint} onChange={(event) => updateField('mainComplaint', event.target.value)} placeholder="Conte o principal motivo da consulta" />
          </label>

          <label className="maya-wide-label">
            Observacoes adicionais
            <textarea className="maya-textarea" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Algo que a profissional precisa saber" />
          </label>
        </section>

        {message && <p className="maya-form-success">{message}</p>}
        {error && <p className="maya-form-error">{error}</p>}

        <button type="submit" className="maya-primary-button" disabled={saving}>
          {saving ? 'Enviando...' : 'Enviar documentos'}
        </button>
      </form>
    </section>
  );
}
