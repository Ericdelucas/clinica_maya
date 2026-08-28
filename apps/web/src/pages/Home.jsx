import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useState } from 'react';
import AdminPanel from '../components/AdminPanel.jsx';
import ComputerVisionPanel from '../components/ComputerVisionPanel.jsx';
import PatientPanel from '../components/PatientPanel.jsx';
import WoodenMannequin from '../components/WoodenMannequin.jsx';
import {
  clearPatientHotspotVideo,
  subscribePatientHotspots,
  updatePatientHotspotVideo,
} from '../lib/clinicalHotspots.js';
import { updateOwnCredentials } from '../lib/demo.js';
import { HOTSPOT_DEFAULTS } from '../lib/hotspots.js';
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

export default function Home({ profile, onLogout, onProfileUpdate, demoMode = false }) {
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
  const [videoPatientId, setVideoPatientId] = useState(isAdmin ? '' : profile.id);
  const [videoPatientName, setVideoPatientName] = useState(isAdmin ? '' : (profile.full_name || ''));
  const [panelTabHint, setPanelTabHint] = useState(0);
  const [visionMode, setVisionMode] = useState(false);
  const [adminTabKick, setAdminTabKick] = useState(0);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [nextEmail, setNextEmail] = useState(profile.email || '');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credentialsMessage, setCredentialsMessage] = useState('');
  const [credentialsError, setCredentialsError] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);

  const hotspotOwnerId = isAdmin ? videoPatientId : profile.id;

  useEffect(() => {
    setNextEmail(profile.email || '');
  }, [profile.email]);

  useEffect(() => {
    if (!hotspotOwnerId) {
      setHotspots(mergeHotspots([]));
      setLoadingHotspots(false);
      return undefined;
    }

    setLoadingHotspots(true);
    const unsubscribe = subscribePatientHotspots(
      hotspotOwnerId,
      (rows) => {
        setHotspots(mergeHotspots(rows));
        setLoadingHotspots(false);
      },
      (err) => {
        setHotspotsError(err?.message || 'Não foi possível carregar os vídeos do paciente.');
        setLoadingHotspots(false);
      },
    );

    return () => unsubscribe();
  }, [hotspotOwnerId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openPatientMannequin(patient) {
    setVideoPatientId(patient.id);
    setVideoPatientName(patient.full_name || patient.email || 'Paciente');
    setPanelTabHint((current) => current + 1);
    setSelectedId(null);
    if (isMobile) setMobileView('mannequin');
    setToast(`Boneco de ${patient.full_name || 'paciente'} — vídeos só dele.`);
  }

  function focusArticulation(hotspot) {
    if (isAdmin && !videoPatientId) {
      setToast('Abra o boneco de um paciente em Pacientes → Ver boneco.');
      return;
    }
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
    if (!hotspotOwnerId) {
      throw new Error('Abra o boneco de um paciente antes de salvar o vídeo.');
    }

    const current = hotspots.find((item) => item.id === hotspotId);
    const trimmed = videoUrl.trim();
    await updatePatientHotspotVideo(hotspotOwnerId, hotspotId, trimmed, {
      label: current?.label,
      region: current?.region,
    });
    setHotspots((items) =>
      items.map((item) =>
        item.id === hotspotId ? { ...item, video_url: trimmed } : item,
      ),
    );
  }

  async function handleClearHotspot(hotspotId) {
    if (!hotspotOwnerId) {
      throw new Error('Abra o boneco de um paciente antes de apagar o vídeo.');
    }

    await clearPatientHotspotVideo(hotspotOwnerId, hotspotId);
    setHotspots((items) =>
      items.map((item) =>
        item.id === hotspotId ? { ...item, video_url: '' } : item,
      ),
    );
  }

  async function handleSaveCredentials(event) {
    event.preventDefault();
    setCredentialsError('');
    setCredentialsMessage('');

    if (nextPassword && nextPassword !== confirmPassword) {
      setCredentialsError('A confirmação da senha não confere.');
      return;
    }

    setSavingCredentials(true);
    try {
      const updated = await updateOwnCredentials(profile, {
        email: nextEmail,
        password: nextPassword,
      });
      onProfileUpdate?.(updated);
      setNextPassword('');
      setConfirmPassword('');
      setCredentialsMessage('Dados atualizados.');
      setCredentialsOpen(false);
      setMenuOpen(false);
    } catch (err) {
      setCredentialsError(err?.message || 'Não foi possível atualizar o cadastro.');
    } finally {
      setSavingCredentials(false);
    }
  }

  function handleCloseVision() {
    setVisionMode(false);
    setAdminTabKick((current) => current + 1);
  }

  const handleVisionModeChange = useCallback((active) => {
    if (!isAdmin) {
      setVisionMode(false);
      return;
    }
    setVisionMode(Boolean(active));
    if (active && isMobile) {
      setMobileView('mannequin');
    }
  }, [isAdmin, isMobile]);

  const selectedHotspot = hotspots.find((item) => item.id === selectedId) || null;
  const visionActive = isAdmin && visionMode;
  const showCanvas = visionActive || !isMobile || mobileView === 'mannequin';
  const showPanel = !isMobile || mobileView === 'panel';
  const linkedCount = hotspots.filter((item) => item.video_url).length;

  return (
    <div className={`dashboard ${isMobile ? 'is-mobile' : 'is-desktop'}`}>
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-orb">RPG</span>
          <div className="topbar-brand-text">
            <strong>RPG.Mayêutica</strong>
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

          <div className="profile-menu">
            <button
              type="button"
              className="avatar-btn"
              aria-expanded={menuOpen}
              aria-label="Menu do perfil"
              onClick={() => {
                setMenuOpen((open) => !open);
                setCredentialsOpen(false);
                setCredentialsError('');
                setCredentialsMessage('');
              }}
            >
              {(profile.full_name || profile.email || '?').slice(0, 1).toUpperCase()}
            </button>
            {menuOpen ? (
              <div className="profile-dropdown">
                <p>{profile.full_name || 'Conta'}</p>
                <small className="profile-email">{profile.email}</small>
                <button
                  type="button"
                  className="dropdown-action"
                  onClick={() => {
                    setMenuOpen(false);
                    setCredentialsOpen(true);
                    setCredentialsError('');
                    setCredentialsMessage('');
                    setNextEmail(profile.email || '');
                    setNextPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Alterar e-mail e senha
                </button>
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

      {credentialsOpen ? (
        <div
          className="credentials-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!savingCredentials) {
              setCredentialsOpen(false);
              setCredentialsError('');
              setCredentialsMessage('');
            }
          }}
        >
          <div
            className="credentials-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="credentialsModalTitle"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="credentials-modal-head">
              <div>
                <h2 id="credentialsModalTitle">Alterar e-mail e senha</h2>
                <p className="muted">{profile.full_name || profile.email}</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost credentials-modal-close"
                disabled={savingCredentials}
                onClick={() => {
                  setCredentialsOpen(false);
                  setCredentialsError('');
                  setCredentialsMessage('');
                }}
              >
                Fechar
              </button>
            </div>
            <form className="profile-credentials" onSubmit={(event) => void handleSaveCredentials(event)}>
              <label htmlFor="profileEmail">E-mail</label>
              <input
                id="profileEmail"
                type="email"
                required
                autoComplete="email"
                value={nextEmail}
                onChange={(event) => setNextEmail(event.target.value)}
              />
              <label htmlFor="profilePassword">Nova senha</label>
              <input
                id="profilePassword"
                type="password"
                minLength={3}
                autoComplete="new-password"
                placeholder="Deixe em branco para manter"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
              />
              <label htmlFor="profilePasswordConfirm">Confirmar senha</label>
              <input
                id="profilePasswordConfirm"
                type="password"
                minLength={3}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {credentialsError ? <p className="form-error">{credentialsError}</p> : null}
              {credentialsMessage ? <p className="form-success">{credentialsMessage}</p> : null}
              <button className="btn btn-primary btn-block" type="submit" disabled={savingCredentials}>
                {savingCredentials ? 'Salvando…' : 'Salvar alteração'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isAdmin && videoPatientName ? (
        <div className="patient-mannequin-banner">
          Boneco de <strong>{videoPatientName}</strong>
          {' · '}
          {linkedCount} vídeo(s) próprio(s)
        </div>
      ) : null}

      {isMobile ? (
        <nav className="mobile-switch" aria-label="Navegação principal">
          <button
            type="button"
            className={`mobile-switch-btn ${mobileView === 'mannequin' ? 'active' : ''}`}
            onClick={() => setMobileView('mannequin')}
          >
            {visionActive ? 'Câmera' : 'Manequim 3D'}
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

      <div className={`dashboard-body ${visionActive ? 'vision-mode' : ''}`}>
        {showCanvas ? (
          visionActive ? (
            <section className="canvas-pane vision-pane" aria-label="Visão computacional">
              <ComputerVisionPanel layout="workspace" onClose={handleCloseVision} />
            </section>
          ) : (
          <section className="canvas-pane" aria-label="Manequim anatômico 3D">
            <div className="canvas-hint">
              {isAdmin
                ? (videoPatientId
                  ? (isMobile
                    ? `Boneco de ${videoPatientName} · Toque na bolinha para editar o vídeo dele`
                    : `Boneco de ${videoPatientName} · Clique na bolinha para editar o vídeo dele`)
                  : 'Em Pacientes, escolha alguém e clique em Ver boneco')
                : (isMobile
                  ? 'Gire com o dedo · Toque na bolinha para abrir o seu vídeo'
                  : 'Arraste para girar · Clique na bolinha para abrir o seu YouTube')}
              {' · '}
              De frente: D = direito do paciente (esquerda da tela), E = esquerdo
            </div>
            <Canvas
              key={`${isMobile ? 'mobile' : 'desktop'}-${hotspotOwnerId || 'none'}`}
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
          )
        ) : null}

        {showPanel ? (
          <aside className="panel-pane">
            {hotspotsError ? <p className="form-error">{hotspotsError}</p> : null}
            {loadingHotspots && hotspotOwnerId ? <p className="muted">Sincronizando vídeos do paciente…</p> : null}

            {isAdmin ? (
              <AdminPanel
                profile={profile}
                demoMode={demoMode}
                hotspots={hotspots}
                selectedHotspot={selectedHotspot}
                focusArticulationKey={focusArticulationKey}
                hotspotsError={hotspotsError}
                videoPatientId={videoPatientId}
                videoPatientName={videoPatientName}
                openMannequinHint={panelTabHint}
                exitVisionKey={adminTabKick}
                onOpenPatientMannequin={openPatientMannequin}
                onVisionModeChange={handleVisionModeChange}
                onSelectHotspot={focusArticulation}
                onSaveHotspot={handleSaveHotspot}
                onClearHotspot={handleClearHotspot}
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
