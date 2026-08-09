const DEMO_SESSION_KEY = 'clinica-maya-demo-session';
const DEMO_DOCS_KEY = 'clinica-maya-demo-documents';
const DEMO_PATIENTS_KEY = 'clinica-maya-demo-patients';
const DEMO_ANAMNESIS_KEY = 'clinica-maya-demo-anamnesis';

export const DEMO_ACCOUNTS = {
  admin: {
    id: 'demo-admin',
    email: 'maya@demo.local',
    password: 'maya123',
    full_name: 'Maya',
    role: 'admin',
  },
  patient: {
    id: 'demo-patient',
    email: 'paciente@demo.local',
    password: 'paciente123',
    full_name: 'Paciente Demo',
    role: 'patient',
  },
};

const SEED_PATIENTS = [
  {
    id: 'demo-patient',
    email: 'paciente@demo.local',
    full_name: 'Paciente Demo',
    created_at: '2026-07-01T12:00:00.000Z',
  },
];

/** Pacientes fictícios removidos do demo — limpa localStorage antigo */
const REMOVED_DEMO_PATIENT_IDS = new Set([
  'demo-patient-2',
  'demo-patient-3',
]);

export function emptyAnamnesis(pacienteId = '') {
  return {
    paciente_id: pacienteId,
    full_name: '',
    birth_date: '',
    phone: '',
    weight_kg: '',
    height_cm: '',
    blood_type: '',
    allergies: '',
    medications: '',
    health_conditions: '',
    surgeries: '',
    smokes: 'nao',
    drinks_alcohol: 'nao',
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

export function authenticateDemo(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  const accounts = Object.values(DEMO_ACCOUNTS);
  const match = accounts.find(
    (account) => account.email === normalized && account.password === password,
  );
  if (!match) return null;
  const { password: _ignored, ...profile } = match;
  return profile;
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
  try {
    const raw = localStorage.getItem(DEMO_PATIENTS_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    const cleaned = stored.filter((patient) => !REMOVED_DEMO_PATIENT_IDS.has(patient.id));
    if (cleaned.length !== stored.length) {
      localStorage.setItem(DEMO_PATIENTS_KEY, JSON.stringify(cleaned));
    }

    const byId = new Map();
    [...SEED_PATIENTS, ...cleaned].forEach((patient) => {
      if (REMOVED_DEMO_PATIENT_IDS.has(patient.id)) return;
      byId.set(patient.id, patient);
    });
    return Array.from(byId.values()).sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at)),
    );
  } catch {
    return [...SEED_PATIENTS];
  }
}

export function writeDemoPatient(patient) {
  const raw = localStorage.getItem(DEMO_PATIENTS_KEY);
  const stored = raw ? JSON.parse(raw) : [];
  const next = [patient, ...stored.filter((item) => item.id !== patient.id)];
  localStorage.setItem(DEMO_PATIENTS_KEY, JSON.stringify(next));
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
