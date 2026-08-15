import { useEffect, useState } from 'react';
import AnamnesisPanel from './AnamnesisPanel.jsx';
import { fileToDataUrl, readDemoDocuments, writeDemoDocument } from '../lib/demo.js';
import { getSupabaseClient } from '../lib/supabase.js';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
]);

function isImageUrl(doc) {
  const type = String(doc.file_type || '');
  const name = String(doc.file_name || doc.file_url || '').toLowerCase();
  return (
    type.startsWith('image/')
    || /\.(png|jpe?g|webp|gif)$/i.test(name)
    || String(doc.file_url || '').startsWith('data:image/')
  );
}

export default function PatientPanel({ profile, demoMode = false }) {
  const [tab, setTab] = useState('anamnesis');
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  async function loadDocuments() {
    setDocsLoading(true);
    try {
      if (demoMode) {
        setDocuments(
          readDemoDocuments().filter((doc) => doc.paciente_id === profile.id),
        );
        return;
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('patient_documents')
        .select('id, notes, professional_note, file_url, file_name, file_type, created_at')
        .eq('paciente_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch {
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== 'exams') return undefined;
    void loadDocuments();
    return undefined;
  }, [tab, demoMode, profile.id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!file) {
      setStatus('uploadError');
      setMessage('Selecione um arquivo PDF, PNG ou JPEG.');
      return;
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      setStatus('uploadError');
      setMessage('Formato inválido. Use PDF, PNG ou JPEG.');
      return;
    }

    setStatus('uploading');

    try {
      if (demoMode) {
        const dataUrl = await fileToDataUrl(file);
        writeDemoDocument({
          id: crypto.randomUUID(),
          paciente_id: profile.id,
          patient_name: profile.full_name || profile.email,
          notes: notes.trim() || null,
          file_url: dataUrl,
          file_name: file.name,
          file_type: file.type,
          professional_note: '',
          created_at: new Date().toISOString(),
        });
      } else {
        const supabase = getSupabaseClient();
        const extension = file.name.includes('.')
          ? file.name.split('.').pop()
          : 'bin';
        const objectPath = `${profile.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('patient-documents')
          .upload(objectPath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicData } = supabase.storage
          .from('patient-documents')
          .getPublicUrl(objectPath);

        const fileUrl = publicData?.publicUrl;
        if (!fileUrl) {
          throw new Error('Não foi possível obter a URL pública do arquivo.');
        }

        const { error: insertError } = await supabase
          .from('patient_documents')
          .insert({
            paciente_id: profile.id,
            notes: notes.trim() || null,
            file_url: fileUrl,
            file_name: file.name,
            file_type: file.type,
          });

        if (insertError) {
          throw insertError;
        }
      }

      setStatus('uploadSuccess');
      setMessage('Documento enviado com sucesso.');
      setFile(null);
      setNotes('');
      event.target.reset();
      await loadDocuments();
    } catch (err) {
      setStatus('uploadError');
      setMessage(err?.message || 'Falha no envio do documento.');
    }
  }

  return (
    <div className="panel">
      <div>
        <h2>Portal do Paciente</h2>
        <p className="panel-lead">
          Preencha sua ficha clínica, envie exames e toque nas bolinhas vermelhas do manequim 3D para ver orientações.
        </p>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === 'anamnesis' ? 'active' : ''}`}
          onClick={() => setTab('anamnesis')}
        >
          Ficha clínica
        </button>
        <button
          type="button"
          className={`tab ${tab === 'exams' ? 'active' : ''}`}
          onClick={() => setTab('exams')}
        >
          Exames
        </button>
        <button
          type="button"
          className={`tab ${tab === 'guide' ? 'active' : ''}`}
          onClick={() => setTab('guide')}
        >
          Orientações 3D
        </button>
      </div>

      {tab === 'anamnesis' ? (
        <AnamnesisPanel profile={profile} demoMode={demoMode} />
      ) : null}

      {tab === 'guide' ? (
        <section className="panel-section">
          <h3>Como usar o manequim</h3>
          <p className="muted">
            Gire o boneco com o dedo ou mouse e toque nas bolinhas vermelhas para abrir o vídeo
            de exercício da articulação cadastrado pela profissional.
          </p>
        </section>
      ) : null}

      {tab === 'exams' ? (
        <div className="panel-section">
          <form onSubmit={(event) => void handleSubmit(event)}>
            <h3>Envio de exames</h3>
            <p className="muted">Anexe PDF ou imagem e, se quiser, descreva observações para a clínica.</p>

          <div className="field">
            <label htmlFor="examFile">Arquivo</label>
            <p className="field-hint">Ex.: raio-x.pdf ou foto do exame em PNG/JPEG</p>
            <input
              id="examFile"
              className="file-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </div>

          <div className="field">
            <label htmlFor="examNotes">Observações</label>
            <p className="field-hint">Ex.: exame de joelho direito, realizado em 10/03/2026</p>
            <textarea
              id="examNotes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="exame de joelho direito, realizado em 10/03/2026"
            />
          </div>

            {status === 'uploadError' ? <p className="form-error">{message}</p> : null}
            {status === 'uploadSuccess' ? <p className="form-success">{message}</p> : null}

            <button className="btn btn-primary" type="submit" disabled={status === 'uploading'}>
              {status === 'uploading' ? 'Enviando…' : 'Enviar Documento'}
            </button>
          </form>

          <div className="exam-history">
            <h3>Seus envios</h3>
            {docsLoading ? <p className="muted">Carregando…</p> : null}
            {!docsLoading && documents.length === 0 ? (
              <p className="muted">Nenhum exame enviado ainda.</p>
            ) : null}
            <ul className="doc-list">
              {documents.map((doc) => (
                <li key={doc.id} className="doc-card">
                  <p className="muted">{new Date(doc.created_at).toLocaleString('pt-BR')}</p>
                  {doc.file_name ? <p className="muted">{doc.file_name}</p> : null}
                  {doc.notes ? <p><strong>Sua nota:</strong> {doc.notes}</p> : null}

                  {isImageUrl(doc) ? (
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="doc-preview-link">
                      <img src={doc.file_url} alt={doc.file_name || 'Exame'} className="doc-preview" />
                    </a>
                  ) : (
                    <a className="btn btn-ghost" href={doc.file_url} target="_blank" rel="noreferrer">
                      Abrir arquivo
                    </a>
                  )}

                  {doc.professional_note ? (
                    <div className="professional-note">
                      <strong>Observação da profissional</strong>
                      <p>{doc.professional_note}</p>
                    </div>
                  ) : (
                    <p className="muted">Ainda sem observação da profissional.</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
