import {
  deleteCloudPatient,
  fetchAllCloudPatients,
  fetchCloudPatientByEmail,
  fetchCloudProfessionals,
  pushPatientsToCloud,
  saveCloudPatient,
  saveCloudProfessional,
  subscribeCloudPatients,
} from './cloudPatients.js';

const DEMO_SESSION_KEY = 'clinica-maya-demo-session';
const DEMO_DOCS_KEY = 'clinica-maya-demo-documents';
const DEMO_PATIENTS_KEY = 'clinica-maya-demo-patients';
const DEMO_ANAMNESIS_KEY = 'clinica-maya-demo-anamnesis';
const PROFESSIONAL_KEY = 'clinica-maya-professional';
const EXTRA_PROFESSIONALS_KEY = 'clinica-maya-professionals';
const CLOUD_SYNC_META_KEY = 'clinica-maya-cloud-sync';

/** Conta principal da profissional (Maya). */
export const DEFAULT_PROFESSIONAL = {
  id: 'professional-maya',
  email: 'mayayyamamoto@gmail.com',
  password: '123',
  full_name: 'Maya Yamamoto',
  role: 'admin',
};

/** Contas profissionais extras com o mesmo acesso administrativo. */
export const EXTRA_PROFESSIONALS = [
  {
    id: 'professional-eric',
    email: 'ericdelaxs@gmail.com',
    password: '1234',
    full_name: 'Eric',
    role: 'admin',
  },
];

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

/**
 * Nuvem é a fonte da verdade: a lista do aparelho passa a ser igual à da nuvem.
 * Assim o mesmo login vê os mesmos pacientes em qualquer celular.
 */
function applyCloudPatients(cloudList) {
  return writePatientsToStorage(Array.isArray(cloudList) ? cloudList : []);
}

/**
 * Antes de subir: se o e-mail já existe na nuvem com outro id, reusa o id da nuvem
 * para não criar pacientes duplicados.
 */
async function preparePatientsForPush(localPatients) {
  const prepared = [];
  for (const patient of localPatients || []) {
    if (!patient?.email) continue;
    try {
      const remote = await fetchCloudPatientByEmail(patient.email);
      if (remote?.id && remote.id !== patient.id) {
        prepared.push({
          ...patient,
          id: remote.id,
          created_at: remote.created_at || patient.created_at,
          password: patient.password || remote.password,
          full_name: patient.full_name || remote.full_name,
        });
        continue;
      }
    } catch {
      // segue com o id local
    }
    prepared.push(patient);
  }
  return prepared;
}

function setCloudSyncMeta(patch) {
  try {
    const current = JSON.parse(localStorage.getItem(CLOUD_SYNC_META_KEY) || '{}');
    const next = { ...current, ...patch, updated_at: new Date().toISOString() };
    localStorage.setItem(CLOUD_SYNC_META_KEY, JSON.stringify(next));
    return next;
  } catch {
    return patch;
  }
}

export function readCloudSyncMeta() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_SYNC_META_KEY) || '{}');
  } catch {
    return {};
  }
}

let cloudSyncStop = null;
const cloudPatientListeners = new Set();
const cloudStatusListeners = new Set();

function notifyStatus(status) {
  setCloudSyncMeta(status);
  for (const listener of cloudStatusListeners) {
    listener(readCloudSyncMeta());
  }
}

export function subscribeCloudSyncStatus(listener) {
  cloudStatusListeners.add(listener);
  listener(readCloudSyncMeta());
  return () => cloudStatusListeners.delete(listener);
}

async function saveAllProfessionalsToCloud() {
  for (const account of listProfessionalAccounts()) {
    await saveCloudProfessional(account);
  }
}

function applyCloudProfessionals(remotes) {
  const list = Array.isArray(remotes) ? remotes : [];
  const mayaRemote = list.find(
    (item) =>
      item?.id === DEFAULT_PROFESSIONAL.id
      || String(item?.email || '').trim().toLowerCase() === DEFAULT_PROFESSIONAL.email,
  );
  if (mayaRemote?.email) {
    const local = readProfessionalAccount();
    const merged = {
      ...DEFAULT_PROFESSIONAL,
      ...local,
      ...mayaRemote,
      id: DEFAULT_PROFESSIONAL.id,
      role: 'admin',
    };
    localStorage.setItem(PROFESSIONAL_KEY, JSON.stringify(merged));
  }

  const extrasById = new Map(
    EXTRA_PROFESSIONALS.map((item) => [item.id, { ...item }]),
  );
  for (const stored of readStoredExtraProfessionals()) {
    extrasById.set(stored.id, { ...extrasById.get(stored.id), ...stored, role: 'admin' });
  }
  for (const remote of list) {
    if (!remote?.id || remote.id === DEFAULT_PROFESSIONAL.id) continue;
    extrasById.set(remote.id, {
      ...EXTRA_PROFESSIONALS.find((item) => item.id === remote.id),
      ...extrasById.get(remote.id),
      ...remote,
      id: remote.id,
      role: 'admin',
    });
  }
  writeStoredExtraProfessionals([...extrasById.values()]);
}

/** Sobe pacientes deste aparelho e depois baixa a lista oficial da nuvem. */
export async function syncLocalPatientsToCloud() {
  notifyStatus({ state: 'syncing', message: 'Sincronizando pacientes com a nuvem…' });
  try {
    await saveAllProfessionalsToCloud();
    const prepared = await preparePatientsForPush(readPatientsFromStorage());
    const result = await pushPatientsToCloud(prepared);
    if (result.fail > 0) {
      notifyStatus({
        state: 'error',
        message: `Falha ao subir ${result.fail} paciente(s). ${result.errors[0] || ''}`,
        lastPushOk: result.ok,
        lastPushFail: result.fail,
      });
      throw new Error(result.errors[0] || 'Falha ao sincronizar pacientes.');
    }

    const cloud = await fetchAllCloudPatients();
    const applied = applyCloudPatients(cloud);
    for (const listener of cloudPatientListeners) {
      listener(applied);
    }

    notifyStatus({
      state: 'ok',
      message: `${applied.length} paciente(s) iguais em todos os aparelhos.`,
      lastPushOk: result.ok,
      lastPushFail: 0,
      cloudCount: applied.length,
    });
    return { ...result, cloudCount: applied.length, patients: applied };
  } catch (err) {
    notifyStatus({
      state: 'error',
      message: err?.message || 'Não foi possível sincronizar com a nuvem.',
    });
    throw err;
  }
}

/** Sincroniza pacientes e conta profissional com o Firebase (todos os aparelhos). */
export function startCloudAccountSync(onPatientsChange) {
  if (onPatientsChange) {
    cloudPatientListeners.add(onPatientsChange);
  }

  if (cloudSyncStop) {
    // Já escutando: força um refresh completo para este aparelho
    void syncLocalPatientsToCloud().catch(() => {});
    return () => {
      if (onPatientsChange) cloudPatientListeners.delete(onPatientsChange);
    };
  }

  notifyStatus({ state: 'syncing', message: 'Conectando à nuvem…' });

  void (async () => {
    try {
      const remotes = await fetchCloudProfessionals();
      if (remotes.length > 0) {
        applyCloudProfessionals(remotes);
      }
      await saveAllProfessionalsToCloud();

      const prepared = await preparePatientsForPush(readPatientsFromStorage());
      await pushPatientsToCloud(prepared);
      const cloud = await fetchAllCloudPatients();
      const applied = applyCloudPatients(cloud);
      for (const listener of cloudPatientListeners) {
        listener(applied);
      }
      notifyStatus({
        state: 'ok',
        message: `${applied.length} paciente(s) sincronizados na nuvem.`,
        cloudCount: applied.length,
      });
    } catch (err) {
      notifyStatus({
        state: 'error',
        message: err?.message || 'Sem conexão com a nuvem. Login entre celulares pode falhar.',
      });
    }
  })();

  cloudSyncStop = subscribeCloudPatients(
    (list) => {
      // Fonte da verdade = nuvem (não misturar restos só deste celular)
      const applied = applyCloudPatients(list);
      notifyStatus({
        state: 'ok',
        message: `Nuvem ok · ${applied.length} paciente(s) em todos os aparelhos.`,
        cloudCount: list.length,
      });
      for (const listener of cloudPatientListeners) {
        listener(applied);
      }
    },
    (err) => {
      notifyStatus({
        state: 'error',
        message: err?.message || 'Falha ao ouvir pacientes na nuvem.',
      });
    },
  );

  return () => {
    if (onPatientsChange) cloudPatientListeners.delete(onPatientsChange);
  };
}

/** Lista oficial para o painel: sobe o local e devolve a nuvem. */
export async function fetchCloudPatientsForAdmin() {
  const result = await syncLocalPatientsToCloud();
  return result.patients || readDemoPatients();
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

function readStoredExtraProfessionals() {
  const byId = new Map(EXTRA_PROFESSIONALS.map((item) => [item.id, { ...item }]));
  try {
    const raw = localStorage.getItem(EXTRA_PROFESSIONALS_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    if (Array.isArray(stored)) {
      for (const item of stored) {
        if (!item?.id || item.id === DEFAULT_PROFESSIONAL.id) continue;
        byId.set(item.id, {
          ...byId.get(item.id),
          ...item,
          id: item.id,
          role: 'admin',
        });
      }
    }
  } catch {
    // seed
  }
  return [...byId.values()];
}

function writeStoredExtraProfessionals(accounts) {
  const extras = (accounts || []).filter(
    (item) => item?.id && item.id !== DEFAULT_PROFESSIONAL.id,
  );
  localStorage.setItem(EXTRA_PROFESSIONALS_KEY, JSON.stringify(extras));
  return extras;
}

export function listProfessionalAccounts() {
  return [readProfessionalAccount(), ...readStoredExtraProfessionals()];
}

export function isProfessionalEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return listProfessionalAccounts().some(
    (item) => String(item.email || '').trim().toLowerCase() === normalized,
  );
}

export function writeProfessionalAccount(patch, accountId = DEFAULT_PROFESSIONAL.id) {
  const id = accountId || DEFAULT_PROFESSIONAL.id;
  if (id === DEFAULT_PROFESSIONAL.id) {
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

  const extras = readStoredExtraProfessionals();
  const current = extras.find((item) => item.id === id)
    || EXTRA_PROFESSIONALS.find((item) => item.id === id);
  if (!current) {
    throw new Error('Conta profissional não encontrada.');
  }
  const next = {
    ...current,
    ...patch,
    id,
    role: 'admin',
    email: String(patch.email ?? current.email).trim().toLowerCase(),
  };
  writeStoredExtraProfessionals(extras.map((item) => (item.id === id ? next : item)));
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
    // Sessão antiga em localStorage vazava o painel da Maya ao reabrir o link.
    localStorage.removeItem(DEMO_SESSION_KEY);
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeDemoSession(profile) {
  localStorage.removeItem(DEMO_SESSION_KEY);
  // Só vale nesta aba — fechar/reabrir o link sempre pede login.
  sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(profile));
}

export function clearDemoSession() {
  localStorage.removeItem(DEMO_SESSION_KEY);
  sessionStorage.removeItem(DEMO_SESSION_KEY);
}

export async function authenticateDemo(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  const enteredPassword = String(password || '');

  try {
    const remotes = await fetchCloudProfessionals();
    if (remotes.length > 0) {
      applyCloudProfessionals(remotes);
    }
  } catch {
    // offline
  }

  const professional = listProfessionalAccounts().find(
    (item) =>
      String(item.email || '').trim().toLowerCase() === normalized
      && String(item.password || '') === enteredPassword,
  );
  if (professional) {
    return stripPassword(professional);
  }

  if (isProfessionalEmail(normalized)) {
    throw new Error('Senha incorreta para esta conta profissional.');
  }

  // Paciente: nuvem primeiro (aparelho limpo), depois cache local
  let remote = null;
  try {
    remote = await fetchCloudPatientByEmail(normalized);
  } catch {
    // sem rede
  }

  if (remote) {
    writePatientsToStorage([
      remote,
      ...readPatientsFromStorage().filter((item) => item.id !== remote.id),
    ]);
    if (String(remote.password || '') === enteredPassword) {
      return {
        id: remote.id,
        email: remote.email,
        full_name: remote.full_name,
        role: 'patient',
      };
    }
    throw new Error('Senha incorreta para este paciente.');
  }

  const local = readDemoPatients().find(
    (item) => String(item.email || '').trim().toLowerCase() === normalized,
  );

  if (local) {
    if (String(local.password || '') === enteredPassword) {
      // Existe só neste celular — tenta subir agora
      try {
        await saveCloudPatient(local);
      } catch {
        // login local ainda funciona
      }
      return {
        id: local.id,
        email: local.email,
        full_name: local.full_name,
        role: 'patient',
      };
    }
    throw new Error('Senha incorreta para este paciente.');
  }

  return null;
}

export function hydrateDemoProfile(saved) {
  if (!saved?.id) return null;

  const professionalIds = new Set(listProfessionalAccounts().map((item) => item.id));

  // NUNCA restaurar área profissional sem digitar e-mail/senha de novo.
  if (saved.role === 'admin' || professionalIds.has(saved.id)) {
    return null;
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
    const updated = stripPassword(writeProfessionalAccount(patch, profile.id));
    writeDemoSession(updated);
    return updated;
  }

  if (isProfessionalEmail(nextEmail)) {
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
    notifyStatus({
      state: 'ok',
      message: `Paciente ${patient.email} salvo na nuvem.`,
    });
  } catch (err) {
    notifyStatus({
      state: 'error',
      message: err?.message || 'Falha ao salvar paciente na nuvem.',
    });
    throw new Error(
      err?.message
        || 'Paciente salvo só neste celular. Sem nuvem, outros aparelhos não conseguem logar.',
    );
  }
  return readDemoPatients();
}

export async function deleteDemoPatient(patientId) {
  const current = readPatientsFromStorage().find((item) => item.id === patientId);
  if (!current) throw new Error('Paciente não encontrado.');

  writePatientsToStorage(readPatientsFromStorage().filter((item) => item.id !== patientId));

  try {
    await deleteCloudPatient(patientId, current.email);
  } catch (err) {
    throw new Error(err?.message || 'Não foi possível apagar o paciente na nuvem.');
  }

  return readDemoPatients();
}

export async function resetDemoPatientPassword(patientId, newPassword) {
  const password = String(newPassword || '');
  if (password.length < 3) {
    throw new Error('A nova senha precisa ter pelo menos 3 caracteres.');
  }
  const current = readPatientsFromStorage().find((item) => item.id === patientId);
  if (!current) throw new Error('Paciente não encontrado.');
  return writeDemoPatient({ ...current, password });
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
