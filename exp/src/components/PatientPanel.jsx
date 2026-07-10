import React from 'react';

export default function PatientPanel({ hotspots }) {
  return (
    <div className="maya-panel-scroll">
      <h2 className="maya-panel-title">Boneco 3D do paciente</h2>
      <p className="maya-panel-copy">
        Clique em um ponto vermelho no boneco ou em uma articulacao da lista para abrir o video orientado pela profissional.
      </p>

      <p className="maya-panel-label">Videos por articulacao</p>
      <div className="maya-list">
        {hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            className="maya-list-item"
            onClick={() => hotspot.youtubeUrl && window.open(hotspot.youtubeUrl, '_blank', 'noopener,noreferrer')}
          >
            <strong>{hotspot.name}</strong>
            <span style={{ display: 'block', marginTop: 4, color: '#7f86ad', fontSize: 12 }}>
              {hotspot.youtubeUrl ? 'Abrir video de apoio' : 'Video ainda nao cadastrado'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
