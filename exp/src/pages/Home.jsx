import React, { Component, Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getSupabaseClient } from '@smartsaude/shared';
import AdminPanel from '@/components/AdminPanel';
import ComputerVisionPanel from '@/components/ComputerVisionPanel';
import HotspotMarkers from '@/components/HotpotMarkers';
import PatientDocumentsPanel from '@/components/PatientDocumentsPanel';
import PatientPanel from '@/components/PatientPanel';
import ProfessionalPatientRecordsPanel from '@/components/ProfessionalPatientRecordsPanel';
import ProfessionalPatientsPanel from '@/components/ProfessionalPatientsPanel';
import WoodenMannequin from '@/components/WoodenMannequin';

const LOCAL_HOTSPOTS_KEY = 'clinica-maya-hotspot-links';
const LOCAL_CALENDAR_KEY = 'clinica-maya-calendar-events';
const INITIAL_CALENDAR_YEAR = 2026;
const INITIAL_CALENDAR_MONTH = 6;

const defaultHotspots = [
  { id: 'ombro_d', name: 'Ombro Direito', label: 'Ombro Direito', region: 'Membros Superiores', position: [0.37, 1.62, 0], youtubeUrl: '' },
  { id: 'ombro_e', name: 'Ombro Esquerdo', label: 'Ombro Esquerdo', region: 'Membros Superiores', position: [-0.37, 1.62, 0], youtubeUrl: '' },
  { id: 'cotovelo_d', name: 'Cotovelo Direito', label: 'Cotovelo Direito', region: 'Membros Superiores', position: [0.63, 1.22, 0], youtubeUrl: '' },
  { id: 'cotovelo_e', name: 'Cotovelo Esquerdo', label: 'Cotovelo Esquerdo', region: 'Membros Superiores', position: [-0.63, 1.22, 0], youtubeUrl: '' },
  { id: 'punho_d', name: 'Punho Direito', label: 'Punho Direito', region: 'Membros Superiores', position: [0.71, 0.79, 0], youtubeUrl: '' },
  { id: 'punho_e', name: 'Punho Esquerdo', label: 'Punho Esquerdo', region: 'Membros Superiores', position: [-0.71, 0.79, 0], youtubeUrl: '' },
  { id: 'coluna_cervical', name: 'Coluna Cervical', label: 'Coluna Cervical', region: 'Coluna', position: [0, 1.79, 0], youtubeUrl: '' },
  { id: 'coluna_lombar', name: 'Coluna Lombar', label: 'Coluna Lombar', region: 'Coluna', position: [0, 1.01, 0], youtubeUrl: '' },
  { id: 'quadril_d', name: 'Quadril Direito', label: 'Quadril Direito', region: 'Membros Inferiores', position: [0.19, 0.64, 0], youtubeUrl: '' },
  { id: 'quadril_e', name: 'Quadril Esquerdo', label: 'Quadril Esquerdo', region: 'Membros Inferiores', position: [-0.19, 0.64, 0], youtubeUrl: '' },
  { id: 'joelho_d', name: 'Joelho Direito', label: 'Joelho Direito', region: 'Membros Inferiores', position: [0.25, 0.03, 0], youtubeUrl: '' },
  { id: 'joelho_e', name: 'Joelho Esquerdo', label: 'Joelho Esquerdo', region: 'Membros Inferiores', position: [-0.25, 0.03, 0], youtubeUrl: '' },
  { id: 'tornozelo_d', name: 'Tornozelo Direito', label: 'Tornozelo Direito', region: 'Membros Inferiores', position: [0.26, -0.66, 0], youtubeUrl: '' },
  { id: 'tornozelo_e', name: 'Tornozelo Esquerdo', label: 'Tornozelo Esquerdo', region: 'Membros Inferiores', position: [-0.26, -0.66, 0], youtubeUrl: '' },
];

const initialCalendarEvents = [];

const emptyCalendarForm = {
  id: null,
  monthKey: '2026-07',
  day: 9,
  time: '09:00',
  patient: '',
  type: 'Consulta',
  notes: '',
};

function getMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getMonthLabel(year, month) {
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}

function normalizeCalendarEvent(event) {
  return {
    ...event,
    monthKey: event.monthKey || '2026-07',
  };
}

function isSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return Boolean(
    url
    && key
    && url.startsWith('http')
    && !url.includes('cole_aqui')
    && !key.includes('cole_aqui'),
  );
}

function readLocalLinks() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_HOTSPOTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocalLink(id, url) {
  const links = readLocalLinks();
  links[id] = url;
  localStorage.setItem(LOCAL_HOTSPOTS_KEY, JSON.stringify(links));
}

function readCalendarEvents() {
  try {
    const savedEvents = JSON.parse(localStorage.getItem(LOCAL_CALENDAR_KEY) || 'null');
    const events = Array.isArray(savedEvents) ? savedEvents : initialCalendarEvents;
    return events
      .map(normalizeCalendarEvent)
      .filter(event => event.day >= 1 && event.day <= 31);
  } catch {
    return initialCalendarEvents;
  }
}

function writeCalendarEvents(events) {
  localStorage.setItem(LOCAL_CALENDAR_KEY, JSON.stringify(events));
}

function mergeHotspotLinks(rows) {
  const linksById = Object.fromEntries(
    rows.map(row => [row.id, row.video_url ?? row.youtubeUrl ?? '']),
  );

  return defaultHotspots.map(hotspot => ({
    ...hotspot,
    video_url: linksById[hotspot.id] ?? hotspot.youtubeUrl,
    youtubeUrl: linksById[hotspot.id] ?? hotspot.youtubeUrl,
  }));
}

class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="maya-canvas-state">
          <strong>WebGL indisponivel</strong>
          <span>Este dispositivo nao conseguiu renderizar o boneco 3D.</span>
        </div>
      );
    }

    return this.props.children;
  }
}

function CanvasFallback() {
  return (
    <div className="maya-canvas-state">
      <strong>Carregando boneco 3D...</strong>
    </div>
  );
}

export default function Home({ user, profile, role = 'patient', onLogout }) {
  const mode = role === 'admin' ? 'admin' : 'patient';
  const [view, setView] = useState('dashboard');
  const [hotspots, setHotspots] = useState(defaultHotspots);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [calendarItems, setCalendarItems] = useState(readCalendarEvents);
  const [calendarDate, setCalendarDate] = useState({
    year: INITIAL_CALENDAR_YEAR,
    month: INITIAL_CALENDAR_MONTH,
  });
  const [calendarForm, setCalendarForm] = useState(emptyCalendarForm);
  const [isCalendarFormOpen, setIsCalendarFormOpen] = useState(false);

  const selectedHotspot = useMemo(
    () => hotspots.find(h => h.id === selectedId) || null,
    [hotspots, selectedId],
  );

  useEffect(() => {
    setSelectedId(null);
  }, [mode]);

  useEffect(() => {
    writeCalendarEvents(calendarItems);
  }, [calendarItems]);

  useEffect(() => {
    let isMounted = true;

    const loadHotspotLinks = async () => {
      if (!isSupabaseConfigured()) {
        const localLinks = readLocalLinks();
        if (isMounted) {
          setHotspots(mergeHotspotLinks(
            Object.entries(localLinks).map(([id, video_url]) => ({ id, video_url })),
          ));
          setSyncMessage('Supabase nao configurado. Os links estao salvos apenas neste computador.');
        }
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('clinical_hotspots')
          .select('id, video_url');

        if (error) throw error;

        if (isMounted) {
          setHotspots(mergeHotspotLinks(data ?? []));
          setSyncMessage('Links sincronizados com o banco.');
        }
      } catch (error) {
        console.error('Erro ao carregar links dos hotspots:', error);
        const localLinks = readLocalLinks();
        if (isMounted) {
          setHotspots(mergeHotspotLinks(
            Object.entries(localLinks).map(([id, video_url]) => ({ id, video_url })),
          ));
          setSyncMessage('Nao foi possivel conectar ao banco. Usando links salvos neste computador.');
        }
      }
    };

    loadHotspotLinks();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleHotspotClick = (id) => {
    const hotspot = hotspots.find(h => h.id === id);

    if (mode === 'patient') {
      if (hotspot?.youtubeUrl) window.open(hotspot.youtubeUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setSelectedId(prev => (prev === id ? null : id));
  };

  const handleSave = async (id, newUrl) => {
    if (mode !== 'admin') return { ok: false, error: new Error('Acesso negado.') };

    const hotspot = hotspots.find(item => item.id === id);
    if (!hotspot) return { ok: false, error: new Error('Articulacao nao encontrada.') };

    setHotspots(prev => prev.map(h => (h.id === id ? {
      ...h,
      video_url: newUrl,
      youtubeUrl: newUrl,
    } : h)));

    writeLocalLink(id, newUrl);

    if (!isSupabaseConfigured()) {
      setSyncMessage('Supabase nao configurado. Link salvo apenas neste computador.');
      return { ok: true };
    }

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('clinical_hotspots')
        .upsert({
          id,
          label: hotspot.label || hotspot.name,
          region: hotspot.region,
          position: hotspot.position,
          video_url: newUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;

      setSyncMessage('Link salvo no banco. Ele aparece em outros computadores.');
      return { ok: true };
    } catch (error) {
      console.error('Erro ao salvar link do hotspot:', error);
      setSyncMessage('Erro ao salvar no banco. Mantive uma copia local neste computador.');
      return { ok: false, error };
    }
  };

  const openNewCalendarEvent = (day = 1, time = '09:00') => {
    setCalendarForm({
      ...emptyCalendarForm,
      monthKey: getMonthKey(calendarDate.year, calendarDate.month),
      day,
      time,
    });
    setIsCalendarFormOpen(true);
  };

  const openExistingCalendarEvent = (event) => {
    setCalendarForm({ ...emptyCalendarForm, ...event });
    setIsCalendarFormOpen(true);
  };

  const closeCalendarForm = () => {
    setCalendarForm(emptyCalendarForm);
    setIsCalendarFormOpen(false);
  };

  const handleCalendarFieldChange = (field, value) => {
    setCalendarForm(prev => ({ ...prev, [field]: value }));
  };

  const saveCalendarEvent = (event) => {
    event.preventDefault();
    const [year, month] = calendarForm.monthKey.split('-').map(Number);
    const daysInSelectedMonth = getDaysInMonth(year, month - 1);
    const day = Math.min(Math.max(Number(calendarForm.day) || 1, 1), daysInSelectedMonth);

    const normalizedEvent = {
      ...calendarForm,
      id: calendarForm.id ?? Date.now(),
      monthKey: calendarForm.monthKey || getMonthKey(calendarDate.year, calendarDate.month),
      day,
      patient: calendarForm.patient.trim() || 'Paciente sem nome',
      type: calendarForm.type.trim() || 'Consulta',
      notes: calendarForm.notes.trim(),
    };

    setCalendarItems(prev => {
      const exists = prev.some(item => item.id === normalizedEvent.id);
      const nextItems = exists
        ? prev.map(item => (item.id === normalizedEvent.id ? normalizedEvent : item))
        : [...prev, normalizedEvent];

      return nextItems.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    });

    closeCalendarForm();
  };

  const deleteCalendarEvent = () => {
    if (!calendarForm.id) return;
    setCalendarItems(prev => prev.filter(item => item.id !== calendarForm.id));
    closeCalendarForm();
  };

  const goToPreviousMonth = () => {
    setCalendarDate(prev => {
      const date = new Date(prev.year, prev.month - 1, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const goToNextMonth = () => {
    setCalendarDate(prev => {
      const date = new Date(prev.year, prev.month + 1, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const goToInitialMonth = () => {
    setCalendarDate({ year: INITIAL_CALENDAR_YEAR, month: INITIAL_CALENDAR_MONTH });
  };

  const renderDashboard = () => (
    <section className="maya-professional-home">
      <div className="maya-professional-heading">
        <p>{mode === 'admin' ? 'Area profissional' : 'Area do paciente'}</p>
        <h2>{mode === 'admin' ? 'Escolha onde quer trabalhar agora' : 'Escolha o que deseja acessar'}</h2>
      </div>

      <div className="maya-feature-grid">
        <button type="button" className="maya-feature-card" onClick={() => setView('mannequin')}>
          <span className="maya-feature-icon">3D</span>
          <strong>Boneco 3D</strong>
          <small>{mode === 'admin' ? 'Pontos clinicos e painel de links dos exercicios.' : 'Clique nos pontos para abrir os videos orientados.'}</small>
        </button>

        {mode === 'admin' ? (
          <>
            <button type="button" className="maya-feature-card" onClick={() => setView('calendar')}>
              <span className="maya-feature-icon">31</span>
              <strong>Calendario</strong>
              <small>Agenda de marcacoes no estilo Google Agenda.</small>
            </button>

            <button type="button" className="maya-feature-card" onClick={() => setView('vision')}>
              <span className="maya-feature-icon">CV</span>
              <strong>Visao computacional</strong>
              <small>Camera com landmarks, angulos e feedback da IA de movimento.</small>
            </button>

            <button type="button" className="maya-feature-card" onClick={() => setView('patients')}>
              <span className="maya-feature-icon">PAC</span>
              <strong>Pacientes</strong>
              <small>Cadastre, acompanhe e exclua pacientes da clinica.</small>
            </button>

            <button type="button" className="maya-feature-card" onClick={() => setView('patient-records')}>
              <span className="maya-feature-icon">DAD</span>
              <strong>Dados e documentos</strong>
              <small>Veja documentos e respostas de pre-exame enviados pelos pacientes.</small>
            </button>
          </>
        ) : (
          <button type="button" className="maya-feature-card" onClick={() => setView('documents')}>
            <span className="maya-feature-icon">DOC</span>
            <strong>Documentos</strong>
            <small>Envie exames e responda o pre-exame da consulta.</small>
          </button>
        )}
      </div>
    </section>
  );

  const renderCalendar = () => {
    const monthKey = getMonthKey(calendarDate.year, calendarDate.month);
    const monthLabel = getMonthLabel(calendarDate.year, calendarDate.month);
    const daysInMonth = getDaysInMonth(calendarDate.year, calendarDate.month);
    const firstWeekday = getFirstWeekday(calendarDate.year, calendarDate.month);
    const leadingDays = Array.from({ length: firstWeekday }, (_, index) => `leading-${index}`);
    const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
    const totalCells = leadingDays.length + days.length;
    const trailingDays = Array.from(
      { length: (7 - (totalCells % 7)) % 7 },
      (_, index) => `trailing-${index}`,
    );
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    return (
      <section className="maya-calendar-page">
        <div className="maya-view-toolbar">
          <button type="button" className="maya-ghost-button" onClick={() => setView('dashboard')}>Voltar</button>
          <div>
            <h2>Agenda</h2>
            <p>{monthLabel}</p>
          </div>
          <div className="maya-calendar-toolbar-actions">
            <button type="button" className="maya-ghost-button" onClick={goToPreviousMonth}>Mes anterior</button>
            <button type="button" className="maya-ghost-button" onClick={goToInitialMonth}>Hoje</button>
            <button type="button" className="maya-ghost-button" onClick={goToNextMonth}>Proximo mes</button>
            <button type="button" className="maya-primary-button" onClick={() => openNewCalendarEvent(1, '09:00')}>
              Nova marcacao
            </button>
          </div>
        </div>

        <div className="maya-calendar-shell">
          <div className="maya-calendar-hours">
            {hours.map(hour => (
              <button key={hour} type="button" onClick={() => openNewCalendarEvent(9, hour)}>{hour}</button>
            ))}
          </div>

          <div className="maya-calendar-grid">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(dayName => (
              <strong key={dayName}>{dayName}</strong>
            ))}

            {leadingDays.map(day => (
              <div key={day} className="maya-calendar-day empty" aria-hidden="true" />
            ))}

            {days.map(day => {
              const events = calendarItems.filter(event => event.monthKey === monthKey && event.day === day);

              return (
                <button
                  key={day}
                  type="button"
                  className={`maya-calendar-day ${events.length ? 'has-event' : ''}`}
                  onClick={() => openNewCalendarEvent(day, '09:00')}
                >
                  <span>{day}</span>
                  {events.map(event => (
                    <span
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      className="maya-calendar-event"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        openExistingCalendarEvent(event);
                      }}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                          keyEvent.preventDefault();
                          keyEvent.stopPropagation();
                          openExistingCalendarEvent(event);
                        }
                      }}
                    >
                      <b>{event.time}</b>
                      {event.patient}
                      <small>{event.type}</small>
                    </span>
                  ))}
                </button>
              );
            })}

            {trailingDays.map(day => (
              <div key={day} className="maya-calendar-day empty" aria-hidden="true" />
            ))}
          </div>
        </div>

        {isCalendarFormOpen && (
          <div className="maya-modal-backdrop" onMouseDown={closeCalendarForm}>
            <form className="maya-calendar-modal" onSubmit={saveCalendarEvent} onMouseDown={(event) => event.stopPropagation()}>
              <div className="maya-modal-heading">
                <div>
                  <h3>{calendarForm.id ? 'Editar marcacao' : 'Nova marcacao'}</h3>
                  <p>{getMonthLabel(...calendarForm.monthKey.split('-').map((part, index) => (index === 1 ? Number(part) - 1 : Number(part))))}</p>
                </div>
                <button type="button" className="maya-icon-button" onClick={closeCalendarForm}>x</button>
              </div>

              <div className="maya-calendar-form-grid">
                <label>
                  Dia
                  <input
                    type="number"
                    min="1"
                    max={getDaysInMonth(...calendarForm.monthKey.split('-').map((part, index) => (index === 1 ? Number(part) - 1 : Number(part))))}
                    value={calendarForm.day}
                    onChange={(event) => handleCalendarFieldChange('day', event.target.value)}
                  />
                </label>
                <label>
                  Horario
                  <input
                    type="time"
                    value={calendarForm.time}
                    onChange={(event) => handleCalendarFieldChange('time', event.target.value)}
                  />
                </label>
              </div>

              <label>
                Paciente
                <input
                  type="text"
                  value={calendarForm.patient}
                  onChange={(event) => handleCalendarFieldChange('patient', event.target.value)}
                  placeholder="Nome do paciente"
                  autoFocus
                />
              </label>

              <label>
                Tipo
                <select value={calendarForm.type} onChange={(event) => handleCalendarFieldChange('type', event.target.value)}>
                  <option>Consulta</option>
                  <option>Avaliacao</option>
                  <option>Retorno</option>
                  <option>Sessao de fisioterapia</option>
                  <option>Pilates clinico</option>
                </select>
              </label>

              <label>
                Observacoes
                <textarea
                  value={calendarForm.notes}
                  onChange={(event) => handleCalendarFieldChange('notes', event.target.value)}
                  placeholder="Detalhes da marcacao"
                />
              </label>

              <div className="maya-modal-actions">
                {calendarForm.id && (
                  <button type="button" className="maya-danger-button" onClick={deleteCalendarEvent}>Excluir</button>
                )}
                <button type="button" className="maya-ghost-button" onClick={closeCalendarForm}>Cancelar</button>
                <button type="submit" className="maya-primary-button">Salvar</button>
              </div>
            </form>
          </div>
        )}
      </section>
    );
  };

  const renderMannequin = () => (
    <section className="maya-workspace">
      <div className="maya-canvas-column">
        <button type="button" className="maya-back-float" onClick={() => setView('dashboard')}>Voltar</button>
        <CanvasErrorBoundary>
          <Suspense fallback={<CanvasFallback />}>
            <Canvas
              camera={{ position: [0, 0.25, 4.7], fov: 42 }}
              shadows
              gl={{ antialias: true, failIfMajorPerformanceCaveat: false }}
              onCreated={({ gl }) => gl.setClearColor('#090a12', 1)}
            >
              <ambientLight intensity={0.55} color="#ffe8d0" />
              <directionalLight
                position={[3.5, 7, 4.5]}
                intensity={1.05}
                color="#fff3e0"
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              <directionalLight position={[-3, 2.5, -2]} intensity={0.35} color="#bfd2ff" />
              <WoodenMannequin />
              <HotspotMarkers
                hotspots={hotspots}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHotspotClick={handleHotspotClick}
                onHover={setHoveredId}
              />
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.22, 0]} receiveShadow>
                <circleGeometry args={[2.35, 64]} />
                <meshStandardMaterial color="#05060c" transparent opacity={0.72} />
              </mesh>
              <OrbitControls
                enablePan
                enableZoom
                enableRotate
                minDistance={2.4}
                maxDistance={8}
                target={[0, 0.35, 0]}
              />
            </Canvas>
          </Suspense>
        </CanvasErrorBoundary>

        <div className="maya-canvas-pill">
          <span />
          {mode === 'admin' ? 'Clique nos pontos para editar os videos' : 'Clique nos pontos para abrir os videos'}
        </div>
      </div>

      <aside className="maya-side-panel">
        {mode === 'admin' ? (
          <AdminPanel
            hotspots={hotspots}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onSave={handleSave}
            selectedHotspot={selectedHotspot}
            syncMessage={syncMessage}
          />
        ) : (
          <PatientPanel hotspots={hotspots} />
        )}
      </aside>
    </section>
  );

  return (
    <main className="maya-shell">
      <header className="maya-topbar">
        <div className="maya-brand-lockup compact">
          <div className="maya-logo-mark">M</div>
          <div>
            <h1>Clinica Maya</h1>
            <p>{mode === 'admin' ? 'Area profissional' : 'Portal do paciente'}</p>
          </div>
        </div>

        <div className="maya-user-box">
          <span>{profile?.full_name || user?.email}</span>
          <strong>{mode === 'admin' ? 'Profissional' : 'Paciente'}</strong>
          <button type="button" onClick={onLogout}>Sair</button>
        </div>
      </header>

      {view === 'dashboard' && renderDashboard()}
      {view === 'mannequin' && renderMannequin()}
      {view === 'calendar' && renderCalendar()}
      {view === 'vision' && <ComputerVisionPanel onBack={() => setView('dashboard')} />}
      {view === 'patients' && <ProfessionalPatientsPanel user={user} onBack={() => setView('dashboard')} />}
      {view === 'patient-records' && <ProfessionalPatientRecordsPanel onBack={() => setView('dashboard')} />}
      {view === 'documents' && <PatientDocumentsPanel user={user} onBack={() => setView('dashboard')} />}
    </main>
  );
}
