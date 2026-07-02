import React from 'react';

export default function PatientPanel({ hotspots }) {
  return (
    <div className="w-full p-6">
      <h2 className="text-white font-bold text-lg mb-1">Exercícios de Apoio</h2>
      <p className="text-xs mb-4" style={{ color: '#5555aa' }}>Clique em qualquer articulação no boneco para ver o vídeo de exercício.</p>
      <div className="space-y-2">
        {hotspots.map(hs => (
          <button
            key={hs.id}
            onClick={() => hs.youtubeUrl && window.open(hs.youtubeUrl, '_blank')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:bg-white/5"
            style={{ border: '1px solid #1e1e30' }}
          >
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#ff0022' }} />
            <span className="text-sm text-gray-300">{hs.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}