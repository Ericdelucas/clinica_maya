import React, { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@smartsaude/shared';

const LOCAL_PATIENTS_KEY = 'clinica-maya-professional-patients';
const LOCAL_PRE_EXAMS_KEY = 'clinica-maya-patient-pre-exams';

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

function readLocal(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function formatAnswer(value) {
  if (!value) return '-';
  return String(value);
}

export default function ProfessionalPatientRecordsPanel({ onBack }) {
  const [patients, setPatients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [preExams, setPreExams] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedPatient = useMemo(
    () => patients.find(patient => patient.id === selectedPatientId) || patients[0] || null,
    [patients, selectedPatientId],
  );

  useEffect(() => {
    let isMounted = true;

    const loadRecords = async () => {
      setLoading(true);
      setError('');

      try {
        if (!isSupabaseConfigured()) {
          const localPatients = readLocal(LOCAL_PATIENTS_KEY);
          const localPreExams = readLocal(LOCAL_PRE_EXAMS_KEY);
          if (!isMounted) return;
          setPatients(localPatients);
          setPreExams(localPreExams);
          setDocuments(localPreExams.filter(item => item.file_name).map(item => ({
            id: item.id,
            paciente_id: item.paciente_id,
            patient_email: item.patient_email,
            notes: item.answers?.notes || '',
            file_url: '',
            file_name: item.file_name,
            created_at: item.created_at,
          })));
          setSelectedPatientId(localPatients[0]?.id || '');
          return;
        }

        const supabase = getSupabaseClient();
        const [{ data: patientRows, error: patientError }, { data: documentRows, error: documentError }, { data: preExamRows, error: preExamError }] = await Promise.all([
          supabase.from('clinic_patients').select('id, full_name, email, phone, created_at').order('full_name'),
          supabase.from('patient_documents').select('id, paciente_id, patient_email, notes, file_url, created_at').order('created_at', { ascending: false }),
          supabase.from('patient_pre_exams').select('id, paciente_id, patient_email, answers, document_url, created_at').order('created_at', { ascending: false }),
        ]);

        if (patientError) throw patientError;
        if (documentError) throw documentError;
        if (preExamError) throw preExamError;

        if (!isMounted) return;
        setPatients(patientRows ?? []);
        setDocuments(documentRows ?? []);
        setPreExams(preExamRows ?? []);
        setSelectedPatientId(patientRows?.[0]?.id || '');
      } catch (err) {
        console.error('Erro ao carregar dados dos pacientes:', err);
        if (isMounted) setError('Nao foi possivel carregar os dados dos pacientes.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRecords();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedPatientKey = selectedPatient?.id;
  const selectedPatientEmail = selectedPatient?.email;

  const patientDocuments = documents.filter(item => (
    item.paciente_id === selectedPatientKey || item.patient_email === selectedPatientEmail
  ));

  const patientPreExams = preExams.filter(item => (
    item.paciente_id === selectedPatientKey || item.patient_email === selectedPatientEmail
  ));

  return (
    <section className="maya-documents-page">
      <div className="maya-view-toolbar">
        <button type="button" className="maya-ghost-button" onClick={onBack}>Voltar</button>
        <div>
          <h2>Dados e documentos</h2>
          <p>Historico enviado pelos pacientes</p>
        </div>
      </div>

      {error && <p className="maya-form-error">{error}</p>}

      <div className="maya-professional-data-layout">
        <section className="maya-panel-card">
          <h3 className="maya-panel-title">Pacientes</h3>
          {loading ? (
            <p className="maya-panel-copy">Carregando...</p>
          ) : patients.length ? (
            <div className="maya-list">
              {patients.map(patient => (
                <button
                  key={patient.id}
                  type="button"
                  className={`maya-list-item ${selectedPatient?.id === patient.id ? 'active' : ''}`}
                  onClick={() => setSelectedPatientId(patient.id)}
                >
                  <strong>{patient.full_name}</strong>
                  <span style={{ display: 'block', marginTop: 4, color: '#7f86ad', fontSize: 12 }}>{patient.email}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="maya-panel-copy">Cadastre pacientes no bloco Pacientes.</p>
          )}
        </section>

        <section className="maya-panel-card">
          <h3 className="maya-panel-title">{selectedPatient?.full_name || 'Selecione um paciente'}</h3>
          {selectedPatient && (
            <p className="maya-panel-copy">
              {selectedPatient.email}{selectedPatient.phone ? ` - ${selectedPatient.phone}` : ''}
            </p>
          )}

          <p className="maya-panel-label">Documentos</p>
          {patientDocuments.length ? (
            <div className="maya-table-list">
              {patientDocuments.map(document => (
                <div key={document.id} className="maya-table-row">
                  <div>
                    <strong>{document.file_name || 'Documento clinico'}</strong>
                    <span>{document.notes || 'Sem observacoes'}</span>
                    <small>{new Date(document.created_at).toLocaleString('pt-BR')}</small>
                  </div>
                  {document.file_url && (
                    <a className="maya-primary-button" href={document.file_url} target="_blank" rel="noreferrer">Abrir</a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="maya-panel-copy">Nenhum documento enviado.</p>
          )}

          <p className="maya-panel-label" style={{ marginTop: 18 }}>Pre-exames</p>
          {patientPreExams.length ? (
            <div className="maya-table-list">
              {patientPreExams.map(preExam => {
                const answers = preExam.answers || {};
                return (
                  <div key={preExam.id} className="maya-preexam-card">
                    <strong>{new Date(preExam.created_at).toLocaleString('pt-BR')}</strong>
                    <span>Dor: {formatAnswer(answers.painLocation)} | Intensidade: {formatAnswer(answers.painIntensity)}/10</span>
                    <span>Comecou: {formatAnswer(answers.painStarted)}</span>
                    <span>Medicamento: {formatAnswer(answers.usesMedication)} {answers.medicationDetails ? `- ${answers.medicationDetails}` : ''}</span>
                    <span>Alergia: {formatAnswer(answers.hasAllergy)} {answers.allergyDetails ? `- ${answers.allergyDetails}` : ''}</span>
                    <span>Queixa: {formatAnswer(answers.mainComplaint)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="maya-panel-copy">Nenhum pre-exame enviado.</p>
          )}
        </section>
      </div>
    </section>
  );
}
