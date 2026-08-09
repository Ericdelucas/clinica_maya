import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useState } from 'react';
import AdminPanel from '../components/AdminPanel.jsx';
import PatientPanel from '../components/PatientPanel.jsx';
import WoodenMannequin from '../components/WoodenMannequin.jsx';
import {
  fetchClinicalHotspots,
  subscribeClinicalHotspots,
  updateClinicalHotspotVideo,
} from '../lib/clinicalHotspots.js';
import { HOTSPOT_DEFAULTS } from '../lib/hotspots.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { useIsMobile } from '../lib/useIsMobile.js';

function mergeHotspots(rows) {
  const byId = new Map((rows || []).map((row) => [row.id, row]));

  return HOTSPOT_DEFAULTS.map((fallback) => {
    const row = byId.get(fallback.id);
    return {
      id: fallback.id,
      label: row?.label || fallback.label,
      region: row?.region || fallback.region,
      position: fallback.position,
      video_url: row?.video_url || '',
    };
  });
}

export default function Home({ profile, onLogout, demoMode = false }) {
  const isMobile = useIsMobile();
  const isAdmin = profile.role === 'admin';
  const [hotspots, setHotspots] = useState(() => mergeHotspots([]));
  const [selectedId, setSelectedId] = useState(null);
  const [focusArticulationKey, setFocusArticulationKey] = useState(0);
  const [loadingHotspots, setLoadingHotspots] = useState(true);
  const [hotspotsError, setHotspotsError] = useState('');
  const [mobileView, setMobileView] = useState('mannequin');
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const loadHotspots = useCallback(async () => {
    setLoadingHotspots(true);
    setHotspotsError('');

    try {
      const data = await fetchClinicalHotspots();
      setHotspots(mergeHotspots(data));
    } catch (err) {
      setHotspotsError(err?.message || 'Não foi possível carregar as articulações do banco.');
      setHotspots(mergeHotspots([]));
    } finally {
      setLoadingHotspots(false);
    }
  }, []);

  useEffect(() => {
    void loadHotspots();
  }, [loadHotspots]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;

    const unsubscribe = subscribeClinicalHotspots(() => {
      void loadHotspots();
    });

    function refreshIfVisible() {
      if (document.visibilityState === 'visible') {
        void loadHotspots();
      }
    }

    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [loadHotspots]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function focusArticulation(hotspot) {
    setSelectedId(hotspot.id);
    setFocusArticulationKey((current) => current + 1);
    if (isMobile) setMobileView('panel');
  }

  function handleSelectHotspot(hotspot) {
    if (isAdmin) {
      focusArticulation(hotspot);
      return;
    }

    const url = hotspot.video_url?.trim();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    setToast('Ainda não há vídeo cadastrado para esta articulação.');
  }

  async function handleSaveHotspot(hotspotId, videoUrl) {
    await updateClinicalHotspotVideo(hotspotId, videoUrl.trim());
    const data = await fetchClinicalHotspots();
    setHotspots(mergeHotspots(data));
  }

  const selectedHotspot = hotspots.find((item) => item.id === selectedId) || null;
  const showCanvas = !isMobile || mobileView === 'mannequin';
  const showPanel = !isMobile || mobileView === 'panel';

  return (
    <div className={`dashboard ${isMobile ? 'is-mobile' : 'is-desktop'}`}>
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-orb">maya</span>
          <div className="topbar-brand-text">
            <strong>Clínica Maya</strong>
            {isMobile ? (
              <small>{isAdmin ? 'Área profissional' : 'Área do paciente'}</small>
            ) : null}
          </div>
        </div>

        <div className="topbar-meta">
          {!isMobile ? (
            <span className="topbar-user">{profile.full_name || profile.email}</span>
          ) : null}
          <span className="role-badge">{isAdmin ? 'Profissional' : 'Paciente'}</span>
          {demoMode && !isMobile ? <span className="role-badge soft">Demo</span> : null}

          <div className="profile-menu">
            <button
              type="button"
              className="avatar-btn"
              aria-expanded={menuOpen}
              aria-label="Menu do perfil"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {(profile.full_name || profile.email || '?').slice(0, 1).toUpperCase()}
            </button>
            {menuOpen ? (
              <div className="profile-dropdown">
                <p>{profile.full_name || profile.email}</p>
                <button
                  type="button"
                  className="dropdown-logout"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {isMobile ? (
        <nav className="mobile-switch" aria-label="Navegação principal">
          <button
            type="button"
            className={`mobile-switch-btn ${mobileView === 'mannequin' ? 'active' : ''}`}
            onClick={() => setMobileView('mannequin')}
          >
            Manequim 3D
          </button>
          <button
            type="button"
            className={`mobile-switch-btn ${mobileView === 'panel' ? 'active' : ''}`}
            onClick={() => setMobileView('panel')}
          >
            {isAdmin ? 'Painel' : 'Minha área'}
          </button>
        </nav>
      ) : null}

      <div className="dashboard-body">
        {showCanvas ? (
          <section className="canvas-pane" aria-label="Manequim anatômico 3D">
            <div className="canvas-hint">
              {isAdmin
                ? (isMobile
                  ? 'Gire o boneco · Toque na bolinha para editar o link'
                  : 'Arraste para girar · Clique na bolinha para editar o link')
                : (isMobile
                  ? 'Gire com o dedo · Toque na bolinha para abrir o vídeo'
                  : 'Arraste para girar · Clique na bolinha para abrir o YouTube')}
            </div>
            <Canvas
              key={isMobile ? 'mobile-canvas' : 'desktop-canvas'}
              shadows={!isMobile}
              camera={{
                position: isMobile ? [0, 1.05, 3.9] : [0, 1.1, 3.4],
                fov: isMobile ? 46 : 42,
              }}
              dpr={isMobile ? [1, 1.5] : [1, 1.75]}
            >
              <color attach="background" args={['#eef6f8']} />
              <ambientLight intensity={0.85} />
              <directionalLight
                castShadow={!isMobile}
                position={[3.5, 6, 2.5]}
                intensity={1.05}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              <hemisphereLight intensity={0.45} groundColor="#d9eef3" />
              <Suspense fallback={null}>
                <WoodenMannequin
                  hotspots={hotspots}
                  selectedId={selectedId}
                  mode={isAdmin ? 'admin' : 'patient'}
                  onSelect={handleSelectHotspot}
                />
                {!isMobile ? (
                  <ContactShadows
                    position={[0, -0.95, 0]}
                    opacity={0.45}
                    scale={8}
                    blur={2.4}
                    far={4}
                  />
                ) : null}
              </Suspense>
              <OrbitControls
                makeDefault
                enablePan={false}
                minDistance={isMobile ? 2.4 : 2.2}
                maxDistance={isMobile ? 6 : 5.5}
                minPolarAngle={0.35}
                maxPolarAngle={Math.PI / 1.7}
                target={[0, 0.75, 0]}
                enableDamping
                dampingFactor={0.08}
                rotateSpeed={isMobile ? 0.7 : 1}
              />
            </Canvas>
            {isMobile && isAdmin ? (
              <button
                type="button"
                className="canvas-fab"
                onClick={() => setMobileView('panel')}
              >
                Abrir painel
              </button>
            ) : null}
          </section>
        ) : null}

        {showPanel ? (
          <aside className="panel-pane">
            {hotspotsError ? <p className="form-error">{hotspotsError}</p> : null}
            {loadingHotspots ? <p className="muted">Sincronizando articulações…</p> : null}

            {isAdmin ? (
              <AdminPanel
                profile={profile}
                demoMode={demoMode}
                hotspots={hotspots}
                selectedHotspot={selectedHotspot}
                focusArticulationKey={focusArticulationKey}
                onSelectHotspot={focusArticulation}
                onSaveHotspot={handleSaveHotspot}
                onRefreshHotspots={loadHotspots}
              />
            ) : (
              <PatientPanel profile={profile} demoMode={demoMode} />
            )}
          </aside>
        ) : null}
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
