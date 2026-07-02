import React, { useState, Suspense, Component } from 'react';

class CanvasErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6680', flexDirection: 'column', gap: 12, background: 'radial-gradient(ellipse at 50% 40%, #1d1d2e 0%, #0d0d18 100%)' }}>
          <span style={{ fontSize: 40 }}>⚠️</span>
          <span style={{ fontSize: 13, color: '#7070a0' }}>WebGL não disponível neste dispositivo.</span>
        </div>
      );
    }
    return this.props.children;
  }
}
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import WoodenMannequin from '@/components/WoodenMannequin';
import HotspotMarkers from '@/components/HotspotMarkers';
import AdminPanel from '@/components/AdminPanel';
import Toolbar from '@/components/Toolbar';

const DEFAULT_HOTSPOTS = [
  { id: 'shoulder_r',     name: 'Ombro Direito',      position: [0.34,  1.65, 0],    youtubeUrl: '' },
  { id: 'shoulder_l',     name: 'Ombro Esquerdo',     position: [-0.34, 1.65, 0],    youtubeUrl: '' },
  { id: 'elbow_r',        name: 'Cotovelo Direito',   position: [0.72,  1.16, 0],    youtubeUrl: '' },
  { id: 'elbow_l',        name: 'Cotovelo Esquerdo',  position: [-0.72, 1.16, 0],    youtubeUrl: '' },
  { id: 'wrist_r',        name: 'Punho Direito',      position: [0.84,  0.58, 0],    youtubeUrl: '' },
  { id: 'wrist_l',        name: 'Punho Esquerdo',     position: [-0.84, 0.58, 0],    youtubeUrl: '' },
  { id: 'spine_cervical', name: 'Coluna Cervical',    position: [0,     1.75, -0.12], youtubeUrl: '' },
  { id: 'spine_thoracic', name: 'Coluna Torácica',    position: [0,     1.35, -0.2],  youtubeUrl: '' },
  { id: 'spine_lumbar',   name: 'Coluna Lombar',      position: [0,     0.93, -0.18], youtubeUrl: '' },
  { id: 'hip_r',          name: 'Quadril Direito',    position: [0.19,  0.66, 0],    youtubeUrl: '' },
  { id: 'hip_l',          name: 'Quadril Esquerdo',   position: [-0.19, 0.66, 0],    youtubeUrl: '' },
  { id: 'knee_r',         name: 'Joelho Direito',     position: [0.25, -0.08, 0],    youtubeUrl: '' },
  { id: 'knee_l',         name: 'Joelho Esquerdo',    position: [-0.25,-0.08, 0],    youtubeUrl: '' },
  { id: 'ankle_r',        name: 'Tornozelo Direito',  position: [0.25, -0.84, 0],    youtubeUrl: '' },
  { id: 'ankle_l',        name: 'Tornozelo Esquerdo', position: [-0.25,-0.84, 0],    youtubeUrl: '' },
];

function CanvasFallback() {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16, color: '#6060a0'
    }}>
      <div style={{ fontSize: 48 }}>🦴</div>
      <p style={{ fontSize: 14 }}>Carregando boneco 3D...</p>
    </div>
  );
}

function MobileEditPanel({ hotspot, onSave, onClose }) {
  const [url, setUrl] = React.useState(hotspot.youtubeUrl);
  React.useEffect(() => setUrl(hotspot.youtubeUrl), [hotspot.id]);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{hotspot.name}</span>
        <button onClick={onClose} style={{ color: '#888', fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
      </div>
      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
        style={{
          width: '100%', borderRadius: 8, padding: '10px 12px', fontSize: 13,
          color: 'white', marginBottom: 12, outline: 'none', boxSizing: 'border-box',
          background: '#0f0f1a', border: '1px solid #3a3a55'
        }}
      />
      <button
        onClick={() => { onSave(hotspot.id, url); onClose(); }}
        style={{
          width: '100%', padding: '10px', borderRadius: 8, fontWeight: 700,
          fontSize: 13, background: 'linear-gradient(135deg, #ff0022, #ff4466)',
          color: 'white', border: 'none', cursor: 'pointer'
        }}
      >
        Salvar Alteração
      </button>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState('admin');
  const [hotspots, setHotspots] = useState(DEFAULT_HOTSPOTS);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const selectedHotspot = hotspots.find(h => h.id === selectedId) || null;

  const handleHotspotClick = (id) => {
    if (mode === 'patient') {
      const hs = hotspots.find(h => h.id === id);
      if (hs && hs.youtubeUrl) window.open(hs.youtubeUrl, '_blank');
    } else {
      setSelectedId(prev => prev === id ? null : id);
    }
  };

  const handleSave = (id, newUrl) => {
    setHotspots(prev => prev.map(h => h.id === id ? { ...h, youtubeUrl: newUrl } : h));
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f0f14', overflow: 'hidden' }}>
      <Toolbar mode={mode} onModeChange={(m) => { setMode(m); setSelectedId(null); }} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* LEFT: 3D Canvas */}
        <div style={{
          position: 'relative',
          flex: mode === 'admin' ? '0 0 60%' : '1 1 auto',
          background: 'radial-gradient(ellipse at 50% 40%, #1d1d2e 0%, #0d0d18 65%, #080810 100%)',
          minHeight: 0
        }}>
          <CanvasErrorBoundary>
            <Suspense fallback={<CanvasFallback />}>
              <Canvas
                camera={{ position: [0, 0.3, 4.8], fov: 44 }}
                style={{ width: '100%', height: '100%', display: 'block' }}
                shadows
                gl={{ antialias: true, failIfMajorPerformanceCaveat: false }}
                onCreated={({ gl }) => { gl.setClearColor('#0d0d18', 1); }}
              >
                <ambientLight intensity={0.45} color="#ffe8d0" />
                <directionalLight
                  position={[4, 9, 5]}
                  intensity={1.1}
                  color="#fff3e0"
                  castShadow
                  shadow-mapSize-width={1024}
                  shadow-mapSize-height={1024}
                  shadow-camera-near={0.5}
                  shadow-camera-far={20}
                  shadow-radius={6}
                  shadow-bias={-0.001}
                />
                <directionalLight position={[-4, 3, -3]} intensity={0.3} color="#c8d8ff" />
                <directionalLight position={[0, -2, 4]} intensity={0.15} color="#ffddbb" />

                <WoodenMannequin />
                <HotspotMarkers
                  hotspots={hotspots}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onHotspotClick={handleHotspotClick}
                  onHover={setHoveredId}
                  mode={mode}
                />

                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, 0]} receiveShadow>
                  <circleGeometry args={[2.5, 64]} />
                  <meshStandardMaterial color="#0a0a15" transparent opacity={0.6} />
                </mesh>

                <OrbitControls
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  minDistance={2.2}
                  maxDistance={9}
                  target={[0, 0.3, 0]}
                />
              </Canvas>
            </Suspense>
          </CanvasErrorBoundary>

          {/* Canvas overlay label */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 99,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: '#7070a0', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
            pointerEvents: 'none'
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff0022', boxShadow: '0 0 6px #ff0022' }} />
            {mode === 'admin' ? 'Admin — clique nos pontos vermelhos para editar' : 'Paciente — clique nos pontos para ver o vídeo'}
          </div>

          {mode === 'patient' && (
            <div style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              padding: '8px 20px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              background: 'rgba(255,0,34,0.12)', border: '1px solid rgba(255,0,34,0.35)',
              color: '#ff6680', pointerEvents: 'none'
            }}>
              Clique numa articulação para ver o vídeo
            </div>
          )}
        </div>

        {/* RIGHT: Admin Panel */}
        {mode === 'admin' && (
          <div style={{
            flex: '0 0 40%', borderLeft: '1px solid #1a1a28',
            background: '#111118', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <AdminPanel
              hotspots={hotspots}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onSave={handleSave}
              selectedHotspot={selectedHotspot}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom sheet for admin */}
      {mode === 'admin' && selectedHotspot && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          padding: 20, borderRadius: '20px 20px 0 0',
          background: '#1a1a28', border: '1px solid #2a2a40',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)'
        }} className="md:hidden">
          <MobileEditPanel hotspot={selectedHotspot} onSave={handleSave} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}