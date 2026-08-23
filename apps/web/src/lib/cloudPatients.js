import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, ensureFirebaseSession } from './firebase.js';

const PATIENTS = 'patients';
const PROFESSIONAL_ID = 'professional';

async function ready() {
  await ensureFirebaseSession();
}

export async function fetchCloudProfessional() {
  await ready();
  const snap = await getDoc(doc(db, 'clinic_accounts', PROFESSIONAL_ID));
  return snap.exists() ? snap.data() : null;
}

export async function saveCloudProfessional(account) {
  await ready();
  await setDoc(doc(db, 'clinic_accounts', PROFESSIONAL_ID), {
    id: account.id,
    email: String(account.email || '').trim().toLowerCase(),
    full_name: account.full_name || '',
    password: account.password || '',
    role: 'admin',
    updated_at: new Date().toISOString(),
  });
}

export async function fetchCloudPatientByEmail(email) {
  await ready();
  const normalized = String(email || '').trim().toLowerCase();
  const q = query(collection(db, PATIENTS), where('email', '==', normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const found = snap.docs[0];
  return { id: found.id, ...found.data() };
}

export async function saveCloudPatient(patient) {
  await ready();
  const id = patient.id;
  if (!id) throw new Error('Paciente sem ID.');
  await setDoc(doc(db, PATIENTS, id), {
    email: String(patient.email || '').trim().toLowerCase(),
    full_name: patient.full_name || '',
    password: patient.password || '',
    created_at: patient.created_at || new Date().toISOString(),
    role: 'patient',
    updated_at: new Date().toISOString(),
  });
  return { id, ...patient };
}

export async function fetchAllCloudPatients() {
  await ready();
  const snap = await getDocs(collection(db, PATIENTS));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

/**
 * Mantém lista de pacientes sincronizada entre aparelhos.
 * Retorna função para cancelar a inscrição.
 */
export function subscribeCloudPatients(onUpdate, onError) {
  let unsubscribe = () => {};
  let active = true;

  void ready().then(() => {
    if (!active) return;
    unsubscribe = onSnapshot(
      collection(db, PATIENTS),
      (snap) => {
        const list = snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        onUpdate(list);
      },
      (err) => onError?.(err),
    );
  });

  return () => {
    active = false;
    unsubscribe();
  };
}
