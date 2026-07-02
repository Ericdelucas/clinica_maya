import React, { useState, useEffect } from 'react';

const REGION_ICONS = {
  shoulder_r: '💪', shoulder_l: '💪',
  elbow_r: '🦾', elbow_l: '🦾',
  wrist_r: '✋', wrist_l: '✋',
  spine_cervical: '🔵', spine_thoracic: '🔵', spine_lumbar: '🔵',
  hip_r: '🦵', hip_l: '🦵',
  knee_r: '🦵', knee_l: '🦵',
  ankle_r: '🦶', ankle_l: '🦶',
};

function HotspotEditor({ hotspot, onSave, isSelected }) {
  const [url, setUrl] = useState(hotspot.youtubeUrl);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUrl(hotspot.youtubeUrl);
    setSaved(false);
  }, [hotspot.id, hotspot.youtubeUrl]);

  const handleSave = () => {
    onSave(hotspot.id, url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
        Link do YouTube
      </label>
      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all"
        style={{
          background: '#0f0f1a',
          border: `1px solid ${isSelected ? '#ff0022' : '#2a2a40'}`,
          boxShadow: isSelected ? '0 0 0 2px rgba(255,0,34,0.1)' : 'none'
        }}
        onFocus={e => e.target.style.borderColor = '#ff4466'}
        onBlur={e => e.target.style.borderColor = isSelected ? '#ff0022' : '#2a2a40'}
      />

      {url && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#0a0a14', color: '#6060a0' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff0022">
            <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8z"/>
            <polygon points="9.6,15.6 15.8,12 9.6,8.4" fill="white"/>
          </svg>
          <span className="truncate">{url}</span>
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 active:scale-95"
        style={{
          background: saved
            ? 'linear-gradient(135deg, #22aa66, #44cc88)'
            : 'linear-gradient(135deg, #ff0022, #ff4466)',
          color: 'white',
          boxShadow: saved ? '0 4px 20px rgba(34,170,100,0.3)' : '0 4px 20px rgba(255,0,34,0.3)'
        }}
      >
        {saved ? '✓ Salvo com Sucesso!' : 'Salvar Alteração'}
      </button>
    </div>
  );
}

export default function AdminPanel({ hotspots, selectedId, onSelect, onSave, selectedHotspot }) {
  const [openAccordion, setOpenAccordion] = useState(null);

  useEffect(() => {
    if (selectedId) setOpenAccordion(selectedId);
  }, [selectedId]);

  const toggleAccordion = (id) => {
    const next = openAccordion === id ? null : id;
    setOpenAccordion(next);
    onSelect(next);
  };

  return (
    <div className="w-full flex flex-col h-full">
      {/* Panel Header */}
      <div className="p-6 shrink-0" style={{ borderBottom: '1px solid #1e1e30' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: '#ff0022', boxShadow: '0 0 8px #ff0022' }} />
          <h2 className="font-bold text-white text-lg tracking-tight">Painel da Profissional Maya</h2>
        </div>
        <p className="text-xs" style={{ color: '#5555aa' }}>
          Selecione uma articulação no boneco ou na lista abaixo para editar o link do exercício.
        </p>
      </div>

      {/* Selected Hotspot Quick Editor */}
      {selectedHotspot && (
        <div className="mx-4 mt-4 p-5 rounded-2xl shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(255,0,34,0.06), rgba(255,68,102,0.04))', border: '1px solid rgba(255,0,34,0.25)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ background: 'rgba(255,0,34,0.15)' }}>
              {REGION_ICONS[selectedHotspot.id] || '🔴'}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{selectedHotspot.name}</p>
              <p className="text-xs" style={{ color: '#ff6680' }}>Articulação selecionada</p>
            </div>
          </div>
          <HotspotEditor hotspot={selectedHotspot} onSave={onSave} isSelected={true} />
        </div>
      )}

      {!selectedHotspot && (
        <div className="mx-4 mt-4 p-5 rounded-2xl text-center"
          style={{ background: '#0f0f1a', border: '1px dashed #2a2a40' }}>
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-sm font-medium" style={{ color: '#5555aa' }}>Clique em um ponto vermelho no boneco 3D</p>
          <p className="text-xs mt-1" style={{ color: '#3a3a60' }}>ou selecione uma articulação abaixo</p>
        </div>
      )}

      {/* Accordion List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#3a3a60' }}>
          Todas as Articulações
        </p>
        {hotspots.map((hs) => {
          const isOpen = openAccordion === hs.id;
          const isSelected = selectedId === hs.id;
          return (
            <div key={hs.id}
              className="rounded-xl overflow-hidden transition-all duration-200"
              style={{
                border: `1px solid ${isSelected ? 'rgba(255,0,34,0.4)' : '#1e1e30'}`,
                background: isSelected ? 'rgba(255,0,34,0.04)' : '#0f0f1a'
              }}>
              <button
                onClick={() => toggleAccordion(hs.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">{REGION_ICONS[hs.id] || '🔴'}</span>
                  <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                    {hs.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hs.youtubeUrl && (
                    <div className="w-2 h-2 rounded-full" style={{ background: '#22aa66' }} />
                  )}
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={isSelected ? '#ff0022' : '#3a3a60'} strokeWidth="2"
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid #1e1e30' }}>
                  <HotspotEditor hotspot={hs} onSave={onSave} isSelected={isSelected} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between"
        style={{ borderTop: '1px solid #1a1a28' }}>
        <span className="text-xs" style={{ color: '#3a3a55' }}>{hotspots.length} articulações cadastradas</span>
        <span className="text-xs" style={{ color: '#3a3a55' }}>
          {hotspots.filter(h => h.youtubeUrl).length} com vídeo
        </span>
      </div>
    </div>
  );
}