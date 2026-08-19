import { useEffect, useMemo, useState } from 'react';
import AnamnesisPanel from './AnamnesisPanel.jsx';
import {
  deleteDemoDocument,
  listDemoAnamnesis,
  readDemoDocuments,
  readDemoPatients,
  readProfessionalAccount,
  updateDemoDocument,
  writeDemoPatient,
} from '../lib/demo.js';
import {
  describeFirebaseError,
  FIRESTORE_OPEN_RULES,
  syncPatientMannequins,
} from '../lib/clinicalHotspots.js';
import { HOTSPOT_DEFAULTS, isValidYoutubeUrl } from '../lib/hotspots.js';
import { getSupabaseClient } from '../lib/supabase.js';

function isImageUrl(doc) {
  const type = String(doc.file_type || '');
  const name = String(doc.file_name || doc.file_url || '').toLowerCase();
  return type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name) || String(doc.file_url || '').startsWith('data:image/');
}

export default function AdminPanel({
  selectedHotspot,
  hotspots = [],
  onSaveHotspot,
  onClearHotspot,
  onSelectHotspot,
  focusArticulationKey = 0,
  demoMode = false,
  hotspotsError = '',
  videoPatientId = '',
  videoPatientName = '',
  openMannequinHint = 0,
  onOpenPatientMannequin,
  onVisionModeChange,
  exitVisionKey = 0,
}) {
  const [tab, setTab] = useState('patients');
  const [videoUrl, setVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const [patientEmail, setPatientEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [createMessage, setCreateMessage] = useState('');
  const [createError, setCreateError] = useState('');

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState('');
  const [search, setSearch] = useState('');

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [observationDrafts, setObservationDrafts] = useState({});
  const [docsMessage, setDocsMessage] = useState('');

  const articulationList = hotspots.length ? hotspots : HOTSPOT_DEFAULTS;

  useEffect(() => {
    if (focusArticulationKey > 0 || openMannequinHint > 0) {
      setTab('hotspot');
    }
  }, [focusArticulationKey, openMannequinHint]);

  useEffect(() => {
    if (exitVisionKey > 0) {
      setTab((current) => (current === 'vision' ? 'patients' : current));
    }
  }, [exitVisionKey]);

  useEffect(() => {
    onVisionModeChange?.(tab === 'vision');
  }, [tab, onVisionModeChange]);

  useEffect(() => {
    setVideoUrl(selectedHotspot?.video_url || '');
    setSaveMessage('');
    setSaveError('');
  }, [selectedHotspot]);

  useEffect(() => {
    if (tab !== 'patients' && tab !== 'register') return undefined;

    let active = true;

    async function loadPatients() {
      setPatientsLoading(true);
      setPatientsError('');

      try {
        if (demoMode) {
          const list = readDemoPatients();
          const anamnesisMap = listDemoAnamnesis();
          const enriched = list.map((patient) => ({
            ...patient,
            hasAnamnesis: Boolean(anamnesisMap[patient.id]?.updated_at),
          }));
          syncPatientMannequins(enriched.map((patient) => patient.id));
          if (active) {
            setPatients(enriched);
            setSelectedPatientId((current) => current || enriched[0]?.id || null);
          }
          return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, created_at, role')
          .eq('role', 'patient')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (active) {
          const rows = data || [];
          syncPatientMannequins(rows.map((patient) => patient.id));
          setPatients(rows);
          setSelectedPatientId((current) => current || rows[0]?.id || null);
        }
      } catch (err) {
        if (active) setPatientsError(err?.message || 'Falha ao carregar pacientes.');
      } finally {
        if (active) setPatientsLoading(false);
      }
    }

    void loadPatients();
    return () => {
      active = false;
    };
  }, [tab, demoMode, createMessage]);

  async function loadDocuments() {
    setDocsLoading(true);
    setDocsError('');

    try {
      if (demoMode) {
        const docs = readDemoDocuments();
        setDocuments(docs);
        setObservationDrafts(
          Object.fromEntries(docs.map((doc) => [doc.id, doc.professional_note || ''])),
        );
        return;
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('patient_documents')
        .select('id, paciente_id, notes, professional_note, file_url, file_name, file_type, created_at, profiles:paciente_id(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const docs = data || [];
      setDocuments(docs);
      setObservationDrafts(
        Object.fromEntries(docs.map((doc) => [doc.id, doc.professional_note || ''])),
      );
    } catch (err) {
      setDocsError(err?.message || 'Falha ao carregar exames.');
    } finally {
      setDocsLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== 'documents') return undefined;
    void loadDocuments();
    return undefined;
  }, [tab, demoMode]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) => {
      const haystack = `${patient.full_name || ''} ${patient.email || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [patients, search]);

  const selectedPatient = patients.find((item) => item.id === selectedPatientId) || null;

  async function handleSaveHotspot(event) {
    event.preventDefault();
    setSaveMessage('');
    setSaveError('');

    if (!selectedHotspot) {
      setSaveError('Selecione uma articulação no manequim ou na lista.');
      return;
    }

    if (!videoPatientId) {
      setSaveError('Abra o boneco de um paciente em Pacientes → Ver boneco.');
      return;
    }

    if (videoUrl.trim() && !isValidYoutubeUrl(videoUrl)) {
      setSaveError('Informe uma URL válida do YouTube.');
      return;
    }

    setSaving(true);
    try {
      await onSaveHotspot(selectedHotspot.id, videoUrl);
      setSaveMessage('Vídeo atualizado com sucesso no banco de dados!');
    } catch (err) {
      setSaveError(describeFirebaseError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleClearHotspot() {
    setSaveMessage('');
    setSaveError('');

    if (!selectedHotspot) {
      setSaveError('Selecione uma articulação no manequim ou na lista.');
      return;
    }

    if (!videoPatientId) {
      setSaveError('Abra o boneco de um paciente em Pacientes → Ver boneco.');
      return;
    }

    if (!selectedHotspot.video_url && !videoUrl.trim()) {
      setSaveError('Esta articulação já está sem vídeo.');
      return;
    }

    const confirmed = window.confirm(
      `Apagar o vídeo de "${selectedHotspot.label}" neste paciente?\n\nO link some do Firebase e do boneco. Não afeta outros pacientes.`,
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      if (onClearHotspot) {
        await onClearHotspot(selectedHotspot.id);
      } else {
        await onSaveHotspot(selectedHotspot.id, '');
      }
      setVideoUrl('');
      setSaveMessage('Vídeo apagado. O link antigo foi removido do banco.');
    } catch (err) {
      setSaveError(describeFirebaseError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePatient(event) {
    event.preventDefault();
    setCreateMessage('');
    setCreateError('');
    setCreatingPatient(true);

    try {
      if (demoMode) {
        const email = patientEmail.trim().toLowerCase();
        const professionalEmail = String(readProfessionalAccount().email || '').toLowerCase();
        if (email === professionalEmail) {
          throw new Error('Este e-mail é da profissional e não pode ser usado por paciente.');
        }
        const existing = readDemoPatients().find(
          (item) => String(item.email || '').toLowerCase() === email,
        );
        if (existing) {
          throw new Error('Já existe um paciente com este e-mail.');
        }

        const created = {
          id: crypto.randomUUID(),
          email,
          full_name: patientName.trim(),
          password: patientPassword,
          created_at: new Date().toISOString(),
        };
        writeDemoPatient(created);
        syncPatientMannequins(readDemoPatients().map((patient) => patient.id));
        setSelectedPatientId(created.id);
      } else {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.functions.invoke('create-patient', {
          body: {
            email: patientEmail.trim(),
            fullName: patientName.trim(),
            password: patientPassword,
          },
        });

        if (error) {
          throw new Error(error.message || 'Falha ao criar paciente.');
        }

        if (data?.error) {
          throw new Error(data.error);
        }
      }

      setCreateMessage(`Paciente ${patientEmail.trim()} cadastrado.`);
      setPatientEmail('');
      setPatientName('');
      setPatientPassword('');
      setTab('patients');
    } catch (err) {
      setCreateError(err?.message || 'Não foi possível cadastrar o paciente.');
    } finally {
      setCreatingPatient(false);
    }
  }

  async function handleSaveObservation(docId) {
    setDocsMessage('');
    const note = String(observationDrafts[docId] || '').trim();

    try {
      if (demoMode) {
        setDocuments(updateDemoDocument(docId, { professional_note: note }));
      } else {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('patient_documents')
          .update({ professional_note: note })
          .eq('id', docId);
        if (error) throw error;
        await loadDocuments();
      }
      setDocsMessage('Observação salva para o paciente.');
    } catch (err) {
      setDocsError(err?.message || 'Falha ao salvar observação.');
    }
  }

  async function handleDeleteDocument(docId) {
    const confirmed = window.confirm('Excluir este exame? Essa ação não pode ser desfeita.');
    if (!confirmed) return;

    setDocsMessage('');
    try {
      if (demoMode) {
        setDocuments(deleteDemoDocument(docId));
      } else {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('patient_documents').delete().eq('id', docId);
        if (error) throw error;
        await loadDocuments();
      }
      setDocsMessage('Exame excluído.');
    } catch (err) {
      setDocsError(err?.message || 'Falha ao excluir exame.');
    }
  }

  function openCurrentVideo() {
    const url = videoUrl.trim() || selectedHotspot?.video_url?.trim();
    if (!url) {
      setSaveError('Cole a URL do YouTube e clique em Salvar Alteração.');
      return;
    }
    if (!isValidYoutubeUrl(url)) {
      setSaveError('Informe uma URL válida do YouTube.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="panel">
      <div>
        <h2>Painel da Profissional</h2>
        <p className="panel-lead">
          Em Pacientes, clique em Ver boneco para editar os vídeos só daquele paciente (RPG.Mayêutica).
        </p>
      </div>

      <div className="tabs">
        <button type="button" className={`tab ${tab === 'patients' ? 'active' : ''}`} onClick={() => setTab('patients')}>
          Pacientes
        </button>
        <button type="button" className={`tab ${tab === 'hotspot' ? 'active' : ''}`} onClick={() => setTab('hotspot')}>
          Articulações
        </button>
        <button type="button" className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
          Cadastrar
        </button>
        <button type="button" className={`tab ${tab === 'documents' ? 'active' : ''}`} onClick={() => setTab('documents')}>
          Exames
        </button>
        <button type="button" className={`tab ${tab === 'vision' ? 'active' : ''}`} onClick={() => setTab('vision')}>
          Visão
        </button>
      </div>

      {tab === 'patients' ? (
        <section className="panel-section">
          <h3>Lista de pacientes</h3>
          <div className="clinic-stats">
            <div>
              <span>Pacientes</span>
              <strong>{patients.length}</strong>
            </div>
            <div>
              <span>Bonecos</span>
              <strong>{patients.length}</strong>
            </div>
          </div>
          <p className="muted">
            Cada paciente tem exatamente um boneco. Os números acima são sempre iguais.
          </p>
          <div className="field">
            <label htmlFor="patientSearch">Buscar</label>
            <input
              id="patientSearch"
              type="search"
              placeholder="Nome ou e-mail"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {patientsLoading ? <p className="muted">Carregando pacientes…</p> : null}
          {patientsError ? <p className="form-error">{patientsError}</p> : null}

          <ul className="patient-list">
            {filteredPatients.map((patient) => (
              <li key={patient.id}>
                <div className={`patient-card ${selectedPatientId === patient.id ? 'active' : ''} ${videoPatientId === patient.id ? 'mannequin-active' : ''}`}>
                  <button
                    type="button"
                    className="patient-card-main"
                    onClick={() => setSelectedPatientId(patient.id)}
                  >
                    <strong>{patient.full_name || 'Sem nome'}</strong>
                    <span className="muted">{patient.email}</span>
                    <div className="chip-row">
                      <span className="chip">
                        {patient.hasAnamnesis ? 'Ficha preenchida' : 'Sem ficha'}
                      </span>
                      {videoPatientId === patient.id ? (
                        <span className="chip chip-accent">Boneco aberto</span>
                      ) : null}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary patient-mannequin-btn"
                    onClick={() => {
                      setSelectedPatientId(patient.id);
                      onOpenPatientMannequin?.(patient);
                    }}
                  >
                    Ver boneco
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {!patientsLoading && filteredPatients.length === 0 ? (
            <p className="muted">Nenhum paciente encontrado.</p>
          ) : null}

          {selectedPatient ? (
            <AnamnesisPanel
              key={selectedPatient.id}
              profile={{ id: selectedPatient.id, full_name: selectedPatient.full_name }}
              pacienteId={selectedPatient.id}
              patientName={selectedPatient.full_name}
              demoMode={demoMode}
              readOnly
            />
          ) : null}
        </section>
      ) : null}

      {tab === 'hotspot' ? (
        <div className="panel-section">
          <h3>Vídeos deste paciente</h3>
          {videoPatientId ? (
            <p className="muted">
              Editando o boneco de <strong>{videoPatientName || 'paciente'}</strong>.
              Os links valem só para ele.
            </p>
          ) : (
            <p className="form-error">
              Ainda não há boneco aberto. Vá em Pacientes e clique em Ver boneco.
            </p>
          )}
          {hotspotsError ? <p className="form-error">{hotspotsError}</p> : null}

          <div className="joint-grid">
            {articulationList.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`joint-chip ${selectedHotspot?.id === item.id ? 'active' : ''}`}
                onClick={() => onSelectHotspot?.(item)}
                disabled={!videoPatientId}
              >
                <strong>{item.label}</strong>
                <span>{item.video_url ? 'Com link' : 'Sem link'}</span>
              </button>
            ))}
          </div>

          <form onSubmit={(event) => void handleSaveHotspot(event)}>
            {selectedHotspot ? (
              <>
                <p className="selected-label">{selectedHotspot.label}</p>
                <p className="muted">{selectedHotspot.region}</p>
              </>
            ) : (
              <p className="muted">Nenhuma articulação selecionada.</p>
            )}

            <div className="field">
              <label htmlFor="videoUrl">URL do YouTube</label>
              <input
                id="videoUrl"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                disabled={!selectedHotspot || saving || !videoPatientId}
              />
            </div>

            {saveError ? <p className="form-error">{saveError}</p> : null}
            {saveError && /permission|recusou|regras/i.test(saveError) ? (
              <div className="rules-help">
                <pre>{FIRESTORE_OPEN_RULES}</pre>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(FIRESTORE_OPEN_RULES);
                      setSaveMessage('Regras copiadas. Cole no Firebase e clique em Publicar.');
                    } catch {
                      window.prompt('Copie as regras e publique no Firestore:', FIRESTORE_OPEN_RULES);
                    }
                  }}
                >
                  Copiar regras do Firestore
                </button>
              </div>
            ) : null}
            {saveMessage ? <p className="form-success">{saveMessage}</p> : null}

            <div className="action-row">
              <button
                className="btn btn-ghost"
                type="button"
                disabled={!selectedHotspot}
                onClick={openCurrentVideo}
              >
                Abrir vídeo
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={
                  !selectedHotspot
                  || saving
                  || !videoPatientId
                  || (!selectedHotspot?.video_url && !videoUrl.trim())
                }
                onClick={() => void handleClearHotspot()}
              >
                Apagar vídeo
              </button>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!selectedHotspot || saving || !videoPatientId}
              >
                {saving ? 'Salvando no banco...' : 'Salvar Alteração'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {tab === 'register' ? (
        <form className="panel-section" onSubmit={(event) => void handleCreatePatient(event)}>
          <h3>Cadastrar Novo Paciente</h3>
          <p className="muted">Somente a profissional pode criar contas. Não há cadastro público.</p>

          <div className="field">
            <label htmlFor="patientName">Nome</label>
            <input
              id="patientName"
              type="text"
              required
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="patientEmail">E-mail</label>
            <input
              id="patientEmail"
              type="email"
              required
              value={patientEmail}
              onChange={(event) => setPatientEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="patientPassword">Senha provisória</label>
            <input
              id="patientPassword"
              type="text"
              required
              minLength={6}
              value={patientPassword}
              onChange={(event) => setPatientPassword(event.target.value)}
            />
          </div>

          {createError ? <p className="form-error">{createError}</p> : null}
          {createMessage ? <p className="form-success">{createMessage}</p> : null}

          <button className="btn btn-primary" type="submit" disabled={creatingPatient}>
            {creatingPatient ? 'Cadastrando…' : 'Cadastrar Paciente'}
          </button>
        </form>
      ) : null}

      {tab === 'vision' ? (
        <section className="panel-section vision-side-panel">
          <span className="vision-pro-badge">Exclusivo da profissional</span>
          <h3>Sessão de visão</h3>
          <p className="muted">
            A câmera abre em tela grande ao lado. O paciente não tem acesso a esta ferramenta —
            ela fica só no painel profissional.
          </p>
          <ul className="vision-tips">
            <li>Enquadre mão e cotovelo — o ombro pode ficar fora da câmera.</li>
            <li>Mede se a linha mão → antebraço está reta (curva suave ok).</li>
            <li>Curva forte: linhas daquela mão ficam vermelhas (sem som).</li>
          </ul>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setTab('patients');
              onVisionModeChange?.(false);
            }}
          >
            Fechar visão e voltar
          </button>
        </section>
      ) : null}

      {tab === 'documents' ? (
        <section className="panel-section">
          <h3>Exames enviados</h3>
          <p className="muted">Abra o arquivo, escreva uma observação para o paciente ou exclua o exame.</p>

          {docsLoading ? <p className="muted">Carregando…</p> : null}
          {docsError ? <p className="form-error">{docsError}</p> : null}
          {docsMessage ? <p className="form-success">{docsMessage}</p> : null}
          {!docsLoading && documents.length === 0 ? (
            <p className="muted">Nenhum documento enviado ainda. Peça ao paciente para enviar pela aba Exames.</p>
          ) : null}

          <ul className="doc-list">
            {documents.map((doc) => (
              <li key={doc.id} className="doc-card">
                <div className="doc-card-head">
                  <div>
                    <strong>{doc.profiles?.full_name || doc.profiles?.email || doc.patient_name || 'Paciente'}</strong>
                    <p className="muted">{new Date(doc.created_at).toLocaleString('pt-BR')}</p>
                    {doc.file_name ? <p className="muted">{doc.file_name}</p> : null}
                  </div>
                  <button
                    type="button"
                    className="btn-icon-danger"
                    title="Excluir exame"
                    aria-label="Excluir exame"
                    onClick={() => void handleDeleteDocument(doc.id)}
                  >
                    Excluir
                  </button>
                </div>

                {doc.notes ? (
                  <p><strong>Nota do paciente:</strong> {doc.notes}</p>
                ) : null}

                {String(doc.file_url || '').startsWith('blob:') ? (
                  <p className="form-error">
                    Arquivo antigo não pode ser aberto. Peça ao paciente para enviar novamente.
                  </p>
                ) : isImageUrl(doc) ? (
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="doc-preview-link">
                    <img src={doc.file_url} alt={doc.file_name || 'Exame'} className="doc-preview" />
                  </a>
                ) : (
                  <a className="btn btn-ghost" href={doc.file_url} target="_blank" rel="noreferrer">
                    Abrir arquivo
                  </a>
                )}

                <div className="field">
                  <label htmlFor={`obs-${doc.id}`}>Observação para o paciente</label>
                  <textarea
                    id={`obs-${doc.id}`}
                    value={observationDrafts[doc.id] || ''}
                    onChange={(event) =>
                      setObservationDrafts((current) => ({
                        ...current,
                        [doc.id]: event.target.value,
                      }))
                    }
                    placeholder="Escreva um retorno clínico para o paciente…"
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleSaveObservation(doc.id)}
                >
                  Salvar observação
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
