import React, { useEffect, useState } from 'react';

function HotspotEditor({ hotspot, onSave }) {
  const [url, setUrl] = useState(hotspot?.youtubeUrl || '');
  const [saveStatus, setSaveStatus] = useState('idle');

  useEffect(() => {
    setUrl(hotspot?.youtubeUrl || '');
    setSaveStatus('idle');
  }, [hotspot?.id, hotspot?.youtubeUrl]);

  if (!hotspot) {
    return (
      <div className="maya-panel-card">
        <p className="maya-panel-copy" style={{ margin: 0 }}>
          Selecione uma articulacao no boneco ou na lista para editar o video associado.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaveStatus('saving');
    const result = await onSave(hotspot.id, url);

    if (result?.ok === false) {
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2200);
  };

  return (
    <div className="maya-panel-card">
      <h3 className="maya-panel-title" style={{ fontSize: 16 }}>{hotspot.name}</h3>
      <p className="maya-panel-copy">Link de exercicio exibido para pacientes.</p>

      <label className="maya-panel-label" htmlFor="hotspot-video-url">Link do YouTube</label>
      <input
        id="hotspot-video-url"
        className="maya-input"
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
      />

      <button
        type="button"
        className={saveStatus === 'saved' ? 'maya-primary-button' : 'maya-danger-button'}
        onClick={handleSave}
        disabled={saveStatus === 'saving'}
        style={{ width: '100%', marginTop: 14 }}
      >
        {saveStatus === 'saving'
          ? 'Salvando...'
          : saveStatus === 'saved'
            ? 'Salvo com sucesso!'
            : 'Salvar Alteracao'}
      </button>

      {saveStatus === 'error' && (
        <p className="maya-form-error" style={{ marginTop: 10 }}>
          Nao foi possivel salvar. Tente novamente.
        </p>
      )}
    </div>
  );
}

export default function AdminPanel({ hotspots, selectedId, onSelect, onSave, selectedHotspot, syncMessage }) {
  return (
    <div className="maya-panel-scroll">
      <h2 className="maya-panel-title">Painel da Profissional Maya</h2>
      <p className="maya-panel-copy">
        Edite os links de video por articulacao. Apenas usuarios profissionais acessam este painel.
      </p>
      {syncMessage && <p className="maya-sync-message">{syncMessage}</p>}

      <HotspotEditor hotspot={selectedHotspot} onSave={onSave} />

      <p className="maya-panel-label">Articulacoes cadastradas</p>
      <div className="maya-list">
        {hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            className={`maya-list-item ${selectedId === hotspot.id ? 'active' : ''}`}
            onClick={() => onSelect(selectedId === hotspot.id ? null : hotspot.id)}
          >
            <strong>{hotspot.name}</strong>
            <span style={{ display: 'block', marginTop: 4, color: '#7f86ad', fontSize: 12 }}>
              {hotspot.region || 'Sem regiao'} {hotspot.youtubeUrl ? '· com video' : '· sem video'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
