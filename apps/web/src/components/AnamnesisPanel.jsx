import { useEffect, useMemo, useState } from 'react';
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

export default function AnamnesisPanel({
  profile,
  demoMode = false,
  readOnly = false,
  pacienteId: forcedPacienteId,
  patientName,
}) {
  const pacienteId = forcedPacienteId || profile.id;
  const [form, setForm] = useState(() => emptyAnamnesis(pacienteId));
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
          setForm(normalizeAnamnesis({
            ...data,
            full_name: data.full_name || patientName || profile.full_name || '',
          }, pacienteId));
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
        setForm(normalizeAnamnesis({
          ...(data || {}),
          full_name: data?.full_name || patientName || profile.full_name || '',
          media: data?.media || [],
        }, pacienteId));
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

  const bmi = useMemo(() => {
    const weight = Number(form.weight_kg);
    const heightCm = Number(form.height_cm);
    if (!weight || !heightCm) return null;
    const heightM = heightCm / 100;
    return (weight / (heightM * heightM)).toFixed(1);
  }, [form.weight_kg, form.height_cm]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
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
      const newMedia = await uploadMediaFiles(mediaFiles);
      const payload = {
        ...form,
        paciente_id: pacienteId,
        weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg),
        height_cm: form.height_cm === '' ? null : Number(form.height_cm),
        media: [...(form.media || []), ...newMedia],
        updated_at: new Date().toISOString(),
      };

      if (demoMode) {
        const saved = writeDemoAnamnesis(pacienteId, payload);
        setForm(normalizeAnamnesis(saved, pacienteId));
      } else {
        const supabase = getSupabaseClient();
        const { error: upsertError } = await supabase
          .from('patient_anamnesis')
          .upsert(payload, { onConflict: 'paciente_id' });
        if (upsertError) throw upsertError;
        setForm(normalizeAnamnesis(payload, pacienteId));
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
        Dados que a fisioterapeuta precisa conhecer: medidas, hábitos, queixas e mídia (foto ou vídeo).
      </p>

      <div className="field">
        <label htmlFor="full_name">Nome completo</label>
        <input
          id="full_name"
          value={form.full_name}
          disabled={readOnly}
          onChange={(event) => updateField('full_name', event.target.value)}
          required={!readOnly}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="birth_date">Data de nascimento</label>
          <input
            id="birth_date"
            type="date"
            value={form.birth_date || ''}
            disabled={readOnly}
            onChange={(event) => updateField('birth_date', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefone</label>
          <input
            id="phone"
            value={form.phone || ''}
            disabled={readOnly}
            onChange={(event) => updateField('phone', event.target.value)}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="weight_kg">Peso (kg)</label>
          <input
            id="weight_kg"
            type="number"
            min="1"
            step="0.1"
            value={form.weight_kg ?? ''}
            disabled={readOnly}
            onChange={(event) => updateField('weight_kg', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="height_cm">Altura (cm)</label>
          <input
            id="height_cm"
            type="number"
            min="30"
            step="0.1"
            value={form.height_cm ?? ''}
            disabled={readOnly}
            onChange={(event) => updateField('height_cm', event.target.value)}
          />
        </div>
      </div>

      {bmi ? <p className="muted">IMC estimado: <strong>{bmi}</strong></p> : null}

      <div className="field-row">
        <div className="field">
          <label htmlFor="blood_type">Tipo sanguíneo</label>
          <select
            id="blood_type"
            value={form.blood_type || ''}
            disabled={readOnly}
            onChange={(event) => updateField('blood_type', event.target.value)}
          >
            <option value="">Não informado</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="smokes">Fuma?</label>
          <select
            id="smokes"
            value={form.smokes || 'nao'}
            disabled={readOnly}
            onChange={(event) => updateField('smokes', event.target.value)}
          >
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
            <option value="ex">Ex-fumante</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="drinks_alcohol">Consome álcool?</label>
          <select
            id="drinks_alcohol"
            value={form.drinks_alcohol || 'nao'}
            disabled={readOnly}
            onChange={(event) => updateField('drinks_alcohol', event.target.value)}
          >
            <option value="nao">Não</option>
            <option value="social">Socialmente</option>
            <option value="frequente">Frequentemente</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="physical_activity">Atividade física</label>
          <input
            id="physical_activity"
            value={form.physical_activity || ''}
            disabled={readOnly}
            placeholder="Ex.: caminhada 3x/semana"
            onChange={(event) => updateField('physical_activity', event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="health_conditions">Problemas de saúde</label>
        <textarea
          id="health_conditions"
          value={form.health_conditions || ''}
          disabled={readOnly}
          placeholder="Hipertensão, diabetes, hérnia de disco…"
          onChange={(event) => updateField('health_conditions', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="allergies">Alergias</label>
        <textarea
          id="allergies"
          value={form.allergies || ''}
          disabled={readOnly}
          onChange={(event) => updateField('allergies', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="medications">Medicamentos em uso</label>
        <textarea
          id="medications"
          value={form.medications || ''}
          disabled={readOnly}
          onChange={(event) => updateField('medications', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="surgeries">Cirurgias anteriores</label>
        <textarea
          id="surgeries"
          value={form.surgeries || ''}
          disabled={readOnly}
          onChange={(event) => updateField('surgeries', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="pain_areas">Áreas de dor / limitação</label>
        <textarea
          id="pain_areas"
          value={form.pain_areas || ''}
          disabled={readOnly}
          placeholder="Joelho direito, lombar…"
          onChange={(event) => updateField('pain_areas', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="chief_complaint">Queixa principal</label>
        <textarea
          id="chief_complaint"
          value={form.chief_complaint || ''}
          disabled={readOnly}
          onChange={(event) => updateField('chief_complaint', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="notes">Observações</label>
        <textarea
          id="notes"
          value={form.notes || ''}
          disabled={readOnly}
          onChange={(event) => updateField('notes', event.target.value)}
        />
      </div>

      {!readOnly ? (
        <div className="field">
          <label htmlFor="mediaFiles">Foto ou vídeo (câmera / arquivo)</label>
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
