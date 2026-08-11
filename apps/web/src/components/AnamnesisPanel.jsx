import { useEffect, useState } from 'react';
import {
  emptyAnamnesis,
  fileToDataUrl,
  readDemoAnamnesis,
  writeDemoAnamnesis,
} from '../lib/demo.js';
import { getSupabaseClient } from '../lib/supabase.js';

const MEDIA_ACCEPT = 'image/*,video/*,.jpg,.jpeg,.png,.webp,.mp4,.webm,.mov';

function normalizeAnamnesis(raw, pacienteId) {
  return {
    ...emptyAnamnesis(pacienteId),
    ...(raw || {}),
    media: Array.isArray(raw?.media) ? raw.media : [],
  };
}

function isoToBrDate(iso) {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function brDateToIso(br) {
  const match = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return '';
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return '';
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Máscara DD/MM/AAAA — deixa digitar o dia completo antes de ir para o mês */
function maskBrDate(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function FieldHint({ children }) {
  return <p className="field-hint">Ex.: {children}</p>;
}

export default function AnamnesisPanel({
  profile,
  demoMode = false,
  readOnly = false,
  pacienteId: forcedPacienteId,
  patientName,
}) {
  const pacienteId = forcedPacienteId || profile.id;
  const [form, setForm] = useState(() => emptyAnamnesis(pacienteId));
  const [birthDateText, setBirthDateText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        if (demoMode) {
          const data = readDemoAnamnesis(pacienteId);
          if (!active) return;
          const next = normalizeAnamnesis({
            ...data,
            full_name: data.full_name || patientName || profile.full_name || '',
          }, pacienteId);
          setForm(next);
          setBirthDateText(isoToBrDate(next.birth_date));
          return;
        }

        const supabase = getSupabaseClient();
        const { data, error: loadError } = await supabase
          .from('patient_anamnesis')
          .select('*')
          .eq('paciente_id', pacienteId)
          .maybeSingle();

        if (loadError) throw loadError;

        if (!active) return;
        const next = normalizeAnamnesis({
          ...(data || {}),
          full_name: data?.full_name || patientName || profile.full_name || '',
          media: data?.media || [],
        }, pacienteId);
        setForm(next);
        setBirthDateText(isoToBrDate(next.birth_date));
      } catch (err) {
        if (active) setError(err?.message || 'Falha ao carregar anamnese.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [demoMode, pacienteId, patientName, profile.full_name]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleBirthDateChange(value) {
    const masked = maskBrDate(value);
    setBirthDateText(masked);
    if (masked.length === 10) {
      const iso = brDateToIso(masked);
      updateField('birth_date', iso || '');
      return;
    }
    updateField('birth_date', '');
  }

  async function uploadMediaFiles(files) {
    if (!files.length) return [];

    if (demoMode) {
      const items = [];
      for (const file of files) {
        const url = await fileToDataUrl(file);
        items.push({
          id: crypto.randomUUID(),
          type: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name,
          url,
          created_at: new Date().toISOString(),
        });
      }
      return items;
    }

    const supabase = getSupabaseClient();
    const uploaded = [];

    for (const file of files) {
      const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
      const path = `${pacienteId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('patient-media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('patient-media').getPublicUrl(path);
      uploaded.push({
        id: crypto.randomUUID(),
        type: file.type.startsWith('video/') ? 'video' : 'image',
        name: file.name,
        url: publicData.publicUrl,
        created_at: new Date().toISOString(),
      });
    }

    return uploaded;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (readOnly) return;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (birthDateText && birthDateText.length > 0 && birthDateText.length < 10) {
        throw new Error('Complete a data de nascimento no formato 22/10/2005.');
      }
      if (birthDateText.length === 10 && !brDateToIso(birthDateText)) {
        throw new Error('Data de nascimento inválida. Use o formato 22/10/2005.');
      }

      const newMedia = await uploadMediaFiles(mediaFiles);
      const payload = {
        ...form,
        paciente_id: pacienteId,
        birth_date: brDateToIso(birthDateText) || form.birth_date || null,
        media: [...(form.media || []), ...newMedia],
        updated_at: new Date().toISOString(),
      };

      if (demoMode) {
        const saved = writeDemoAnamnesis(pacienteId, payload);
        setForm(normalizeAnamnesis(saved, pacienteId));
        setBirthDateText(isoToBrDate(saved.birth_date));
      } else {
        const supabase = getSupabaseClient();
        const { error: upsertError } = await supabase
          .from('patient_anamnesis')
          .upsert(payload, { onConflict: 'paciente_id' });
        if (upsertError) throw upsertError;
        setForm(normalizeAnamnesis(payload, pacienteId));
        setBirthDateText(isoToBrDate(payload.birth_date));
      }

      setMediaFiles([]);
      setMessage('Ficha clínica salva com sucesso.');
      if (event.target?.reset) event.target.reset();
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar a ficha.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="muted">Carregando ficha clínica…</p>;
  }

  return (
    <form className="panel-section" onSubmit={(event) => void handleSubmit(event)}>
      <h3>{readOnly ? 'Ficha clínica do paciente' : 'Minha ficha clínica'}</h3>
      <p className="muted">
        Dados essenciais para o acompanhamento: queixas, psicoterapia e mídia (foto ou vídeo).
      </p>

      <div className="field">
        <label htmlFor="full_name">Nome completo</label>
        <FieldHint>Maria Oliveira da Silva</FieldHint>
        <input
          id="full_name"
          value={form.full_name}
          disabled={readOnly}
          placeholder="Maria Oliveira da Silva"
          onChange={(event) => updateField('full_name', event.target.value)}
          required={!readOnly}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="birth_date">Data de nascimento</label>
          <FieldHint>22/10/2005</FieldHint>
          <input
            id="birth_date"
            type="text"
            inputMode="numeric"
            autoComplete="bday"
            placeholder="DD/MM/AAAA"
            maxLength={10}
            value={birthDateText}
            disabled={readOnly}
            onChange={(event) => handleBirthDateChange(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefone</label>
          <FieldHint>(11) 98888-7777</FieldHint>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="(11) 98888-7777"
            value={form.phone || ''}
            disabled={readOnly}
            onChange={(event) => updateField('phone', event.target.value)}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="psychotherapy">Faz psicoterapia?</label>
          <FieldHint>Sim / Não</FieldHint>
          <select
            id="psychotherapy"
            value={form.psychotherapy || 'nao'}
            disabled={readOnly}
            onChange={(event) => updateField('psychotherapy', event.target.value)}
          >
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="physical_activity">Atividade física</label>
          <FieldHint>caminhada 3x por semana</FieldHint>
          <input
            id="physical_activity"
            value={form.physical_activity || ''}
            disabled={readOnly}
            placeholder="caminhada 3x por semana"
            onChange={(event) => updateField('physical_activity', event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="health_conditions">Problemas de saúde</label>
        <FieldHint>hipertensão, diabetes, hérnia de disco</FieldHint>
        <textarea
          id="health_conditions"
          value={form.health_conditions || ''}
          disabled={readOnly}
          placeholder="hipertensão, diabetes, hérnia de disco"
          onChange={(event) => updateField('health_conditions', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="medications">Medicamentos em uso</label>
        <FieldHint>losartana 50 mg 1x ao dia</FieldHint>
        <textarea
          id="medications"
          value={form.medications || ''}
          disabled={readOnly}
          placeholder="losartana 50 mg 1x ao dia"
          onChange={(event) => updateField('medications', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="surgeries">Cirurgias anteriores</label>
        <FieldHint>apendicectomia em 2018 — ou “nenhuma”</FieldHint>
        <textarea
          id="surgeries"
          value={form.surgeries || ''}
          disabled={readOnly}
          placeholder="apendicectomia em 2018 — ou nenhuma"
          onChange={(event) => updateField('surgeries', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="pain_areas">Áreas de dor / limitação</label>
        <FieldHint>joelho direito, lombar</FieldHint>
        <textarea
          id="pain_areas"
          value={form.pain_areas || ''}
          disabled={readOnly}
          placeholder="joelho direito, lombar"
          onChange={(event) => updateField('pain_areas', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="chief_complaint">Queixa principal</label>
        <FieldHint>dor ao subir escadas há 2 meses</FieldHint>
        <textarea
          id="chief_complaint"
          value={form.chief_complaint || ''}
          disabled={readOnly}
          placeholder="dor ao subir escadas há 2 meses"
          onChange={(event) => updateField('chief_complaint', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="notes">Observações</label>
        <FieldHint>prefiro atendimento pela manhã</FieldHint>
        <textarea
          id="notes"
          value={form.notes || ''}
          disabled={readOnly}
          placeholder="prefiro atendimento pela manhã"
          onChange={(event) => updateField('notes', event.target.value)}
        />
      </div>

      {!readOnly ? (
        <div className="field">
          <label htmlFor="mediaFiles">Foto ou vídeo (câmera / arquivo)</label>
          <FieldHint>foto do joelho ou vídeo curto do movimento</FieldHint>
          <input
            id="mediaFiles"
            className="file-input"
            type="file"
            accept={MEDIA_ACCEPT}
            capture="environment"
            multiple
            onChange={(event) => setMediaFiles(Array.from(event.target.files || []))}
          />
          <p className="muted">No celular, use a câmera para fotografar ou gravar a região afetada.</p>
        </div>
      ) : null}

      {form.media?.length ? (
        <div>
          <p className="muted" style={{ marginBottom: '0.5rem' }}>Mídias enviadas</p>
          <div className="media-grid">
            {form.media.map((item) => (
              <figure className="media-item" key={item.id}>
                {item.type === 'video' ? (
                  <video src={item.url} controls preload="metadata" />
                ) : (
                  <img src={item.url} alt={item.name || 'Mídia clínica'} />
                )}
                <figcaption>{item.name || item.type}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : (
        <p className="muted">Nenhuma foto ou vídeo enviado ainda.</p>
      )}

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      {!readOnly ? (
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar ficha clínica'}
        </button>
      ) : null}

      {form.updated_at ? (
        <p className="muted">
          Atualizado em {new Date(form.updated_at).toLocaleString('pt-BR')}
        </p>
      ) : null}
    </form>
  );
}
