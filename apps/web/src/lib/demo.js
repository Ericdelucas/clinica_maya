import {
  fetchCloudPatientByEmail,
  fetchCloudProfessional,
  saveCloudPatient,
  saveCloudProfessional,
  subscribeCloudPatients,
} from './cloudPatients.js';

const DEMO_SESSION_KEY = 'clinica-maya-demo-session';
const DEMO_DOCS_KEY = 'clinica-maya-demo-documents';
const DEMO_PATIENTS_KEY = 'clinica-maya-demo-patients';
const DEMO_ANAMNESIS_KEY = 'clinica-maya-demo-anamnesis';
const PROFESSIONAL_KEY = 'clinica-maya-professional';

/** Conta da profissional — única com acesso à área administrativa. */
export const DEFAULT_PROFESSIONAL = {
  id: 'professional-maya',
  email: 'mayayyamamoto@gmail.com',
  password: '123',
  full_name: 'Maya Yamamoto',
  role: 'admin',
};

/** Pacientes fictícios do demo antigo — não entram em produção. */
const REMOVED_DEMO_PATIENT_IDS = new Set([
  'demo-patient',
  'demo-patient-2',
  'demo-patient-3',
  'demo-carla',
  'demo-ricardo',
  'demo-sofia',
  'demo-admin',
]);

function stripPassword(account) {
  const { password: _ignored, ...profile } = account || {};
  return profile;
}

function readPatientsFromStorage() {
  try {
    const raw = localStorage.getItem(DEMO_PATIENTS_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    return stored.filter((patient) => !REMOVED_DEMO_PATIENT_IDS.has(patient.id));
  } catch {
    return [];
  }
}

function writePatientsToStorage(patients) {
  const sorted = [...patients].sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || '')),
  );
  localStorage.setItem(DEMO_PATIENTS_KEY, JSON.stringify(sorted));
  return sorted;
}

function mergePatients(cloudList) {
  const local = readPatientsFromStorage();
  const byId = new Map();
  for (const patient of cloudList || []) {
    if (patient?.id) byId.set(patient.id, patient);
  }
  for (const patient of local) {
    if (!byId.has(patient.id)) byId.set(patient.id, patient);
  }
  return writePatientsToStorage([...byId.values()]);
}

let cloudSyncStop = null;
const cloudPatientListeners = new Set();

/** Sincroniza pacientes e conta profissional com o Firebase (todos os aparelhos). */
export function startCloudAccountSync(onPatientsChange) {
  if (onPatientsChange) {
    cloudPatientListeners.add(onPatientsChange);
  }

  if (cloudSyncStop) {
    return () => {
      if (onPatientsChange) cloudPatientListeners.delete(onPatientsChange);
    };
  }

  void (async () => {
    try {
      const remoteProfessional = await fetchCloudProfessional();
      if (remoteProfessional?.email) {
        const local = readProfessionalAccount();
        const merged = {
          ...DEFAULT_PROFESSIONAL,
          ...local,
          ...remoteProfessional,
          id: DEFAULT_PROFESSIONAL.id,
          role: 'admin',
        };
        localStorage.setItem(PROFESSIONAL_KEY, JSON.stringify(merged));
      } else {
        await saveCloudProfessional(readProfessionalAccount());
      }
    } catch {
      // offline — segue com cache local
    }
  })();

  cloudSyncStop = subscribeCloudPatients(
    (list) => {
      const merged = mergePatients(list);
      for (const listener of cloudPatientListeners) {
        listener(merged);
      }
    },
    () => {
      // mantém cache local se a nuvem falhar
    },
  );

  return () => {
    if (onPatientsChange) cloudPatientListeners.delete(onPatientsChange);
  };
}

export function stopCloudAccountSync() {
  cloudSyncStop?.();
  cloudSyncStop = null;
}

export function readProfessionalAccount() {
  try {
    const raw = localStorage.getItem(PROFESSIONAL_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      return {
        ...DEFAULT_PROFESSIONAL,
        ...stored,
        id: DEFAULT_PROFESSIONAL.id,
        role: 'admin',
      };
    }
  } catch {
    // segue com o seed
  }

  const seeded = { ...DEFAULT_PROFESSIONAL };
  localStorage.setItem(PROFESSIONAL_KEY, JSON.stringify(seeded));
  return seeded;
}

export function writeProfessionalAccount(patch) {
  const current = readProfessionalAccount();
  const next = {
    ...current,
    ...patch,
    id: DEFAULT_PROFESSIONAL.id,
    role: 'admin',
    email: String(patch.email ?? current.email).trim().toLowerCase(),
  };
  localStorage.setItem(PROFESSIONAL_KEY, JSON.stringify(next));
  void saveCloudProfessional(next).catch(() => {});
  return next;
}

export function emptyAnamnesis(pacienteId = '') {
  return {
    paciente_id: pacienteId,
    full_name: '',
    birth_date: '',
    phone: '',
    medications: '',
    health_conditions: '',
    surgeries: '',
    psychotherapy: 'nao',
    physical_activity: '',
    pain_areas: '',
    chief_complaint: '',
    notes: '',
    media: [],
    updated_at: null,
  };
}

export function readDemoSession() {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeDemoSession(profile) {
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(profile));
}

export function clearDemoSession() {
  localStorage.removeItem(DEMO_SESSION_KEY);
}

export async function authenticateDemo(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  const enteredPassword = String(password || '');

  const professional = readProfessionalAccount();
  if (
    String(professional.email || '').trim().toLowerCase() === normalized
    && String(professional.password || '') === enteredPassword
  ) {
    return stripPassword(professional);
  }

  let patient = readDemoPatients().find((item) => (
    String(item.email || '').trim().toLowerCase() === normalized
    && String(item.password || '') === enteredPassword
  ));

  if (!patient) {
    try {
      const remote = await fetchCloudPatientByEmail(normalized);
      if (remote && String(remote.password || '') === enteredPassword) {
        await writeDemoPatient(remote);
        patient = remote;
      }
    } catch {
      // sem rede
    }
  }

  if (!patient) return null;

  return {
    id: patient.id,
    email: patient.email,
    full_name: patient.full_name,
    role: 'patient',
  };
}

export function hydrateDemoProfile(saved) {
  if (!saved?.id) return null;

  const professional = readProfessionalAccount();
  if (saved.id === professional.id || (
    saved.role === 'admin'
    && String(saved.email || '').toLowerCase() === String(professional.email).toLowerCase()
  )) {
    return stripPassword(professional);
  }

  const patient = readDemoPatients().find((item) => item.id === saved.id);
  if (!patient) return null;

  return {
    id: patient.id,
    email: patient.email,
    full_name: patient.full_name,
    role: 'patient',
  };
}

export async function updateOwnCredentials(profile, { email, password }) {
  const nextEmail = String(email || '').trim().toLowerCase();
  if (!nextEmail || !nextEmail.includes('@')) {
    throw new Error('Informe um e-mail válido.');
  }

  if (profile?.role === 'admin') {
    const patch = { email: nextEmail };
    if (password) patch.password = password;
    const updated = stripPassword(writeProfessionalAccount(patch));
    writeDemoSession(updated);
    return updated;
  }

  const professional = readProfessionalAccount();
  if (String(professional.email).toLowerCase() === nextEmail) {
    throw new Error('Este e-mail pertence à área profissional.');
  }

  const patients = readDemoPatients();
  const taken = patients.find(
    (item) => item.id !== profile.id && String(item.email || '').toLowerCase() === nextEmail,
  );
  if (taken) {
    throw new Error('Este e-mail já está em uso por outro paciente.');
  }

  const current = patients.find((item) => item.id === profile.id);
  if (!current) {
    throw new Error('Paciente não encontrado.');
  }

  const next = {
    ...current,
    email: nextEmail,
    ...(password ? { password } : {}),
  };
  await writeDemoPatient(next);

  const session = {
    id: next.id,
    email: next.email,
    full_name: next.full_name,
    role: 'patient',
  };
  writeDemoSession(session);
  return session;
}

export function readDemoDocuments() {
  try {
    const raw = localStorage.getItem(DEMO_DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeDemoDocument(doc) {
  const current = readDemoDocuments();
  current.unshift({
    professional_note: '',
    file_name: '',
    file_type: '',
    ...doc,
  });
  localStorage.setItem(DEMO_DOCS_KEY, JSON.stringify(current));
  return current;
}

export function updateDemoDocument(docId, patch) {
  const current = readDemoDocuments();
  const next = current.map((doc) =>
    doc.id === docId ? { ...doc, ...patch } : doc,
  );
  localStorage.setItem(DEMO_DOCS_KEY, JSON.stringify(next));
  return next;
}

export function deleteDemoDocument(docId) {
  const next = readDemoDocuments().filter((doc) => doc.id !== docId);
  localStorage.setItem(DEMO_DOCS_KEY, JSON.stringify(next));
  return next;
}

export function readDemoPatients() {
  return readPatientsFromStorage().sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || '')),
  );
}

export async function writeDemoPatient(patient) {
  const stored = readPatientsFromStorage();
  const next = [patient, ...stored.filter((item) => item.id !== patient.id)];
  writePatientsToStorage(next);
  try {
    await saveCloudPatient(patient);
  } catch {
    throw new Error('Paciente salvo localmente, mas não foi possível sincronizar na nuvem. Verifique a internet.');
  }
  return readDemoPatients();
}

function readAnamnesisMap() {
  try {
    const raw = localStorage.getItem(DEMO_ANAMNESIS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function readDemoAnamnesis(pacienteId) {
  const map = readAnamnesisMap();
  return map[pacienteId] || emptyAnamnesis(pacienteId);
}

export function writeDemoAnamnesis(pacienteId, payload) {
  const map = readAnamnesisMap();
  const next = {
    ...emptyAnamnesis(pacienteId),
    ...payload,
    paciente_id: pacienteId,
    updated_at: new Date().toISOString(),
  };
  map[pacienteId] = next;
  localStorage.setItem(DEMO_ANAMNESIS_KEY, JSON.stringify(map));
  return next;
}

export function listDemoAnamnesis() {
  return readAnamnesisMap();
}

export async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}
