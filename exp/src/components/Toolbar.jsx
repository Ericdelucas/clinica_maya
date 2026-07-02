import React from 'react';

export default function Toolbar({ mode, onModeChange }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 shrink-0 z-10"
      style={{ background: '#0d0d18', borderBottom: '1px solid #1e1e30' }}>
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #ff0022 0%, #ff6680 100%)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="2.5" fill="white"/>
            <rect x="10.5" y="7.5" width="3" height="5" rx="1.5" fill="white"/>
            <rect x="7" y="8" width="2.5" height="4" rx="1.25" fill="white" transform="rotate(-15 7 8)"/>
            <rect x="14.5" y="8" width="2.5" height="4" rx="1.25" fill="white" transform="rotate(15 14.5 8)"/>
            <rect x="9" y="12.5" width="2.5" height="5" rx="1.25" fill="white" transform="rotate(-5 9 12.5)"/>
            <rect x="12.5" y="12.5" width="2.5" height="5" rx="1.25" fill="white" transform="rotate(5 12.5 12.5)"/>
          </svg>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight tracking-wide">Clínica Maya</p>
          <p className="text-xs leading-tight" style={{ color: '#6060a0' }}>Sistema de Gestão Clínica</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-2 rounded-xl p-1" style={{ background: '#1a1a28' }}>
        <button
          onClick={() => onModeChange('patient')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
            mode === 'patient'
              ? 'text-white shadow-lg'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          style={mode === 'patient' ? { background: 'linear-gradient(135deg, #1a6aff, #4488ff)' } : {}}
        >
          Modo Paciente
        </button>
        <button
          onClick={() => onModeChange('admin')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
            mode === 'admin'
              ? 'text-white shadow-lg'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          style={mode === 'admin' ? { background: 'linear-gradient(135deg, #ff0022, #ff4466)' } : {}}
        >
          Modo Administrador
        </button>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: mode === 'admin' ? '#ff0022' : '#22ff88' }} />
        <span className="text-xs font-medium" style={{ color: '#6060a0' }}>
          {mode === 'admin' ? 'Admin Ativo' : 'Paciente'}
        </span>
      </div>
    </div>
  );
}