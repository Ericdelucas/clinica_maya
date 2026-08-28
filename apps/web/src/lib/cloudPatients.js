import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db, ensureFirebaseSession } from './firebase.js';
import { describeFirebaseError } from './clinicalHotspots.js';

const PATIENTS = 'patients';
const PATIENT_EMAILS = 'patient_emails';
const PROFESSIONAL_ID = 'professional';

async function ready() {
  await ensureFirebaseSession();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function fetchCloudProfessional() {
  await ready();
  const snap = await getDoc(doc(db, 'clinic_accounts', PROFESSIONAL_ID));
  return snap.exists() ? snap.data() : null;
}

export async function saveCloudProfessional(account) {
  await ready();
  try {
    await setDoc(doc(db, 'clinic_accounts', PROFESSIONAL_ID), {
      id: account.id,
      email: normalizeEmail(account.email),
      full_name: account.full_name || '',
      password: account.password || '',
      role: 'admin',
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    throw new Error(describeFirebaseError(err));
  }
}

export async function fetchCloudPatientByEmail(email) {
  await ready();
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  try {
    const emailSnap = await getDoc(doc(db, PATIENT_EMAILS, normalized));
    if (emailSnap.exists()) {
      const patientId = emailSnap.data()?.patientId;
      if (patientId) {
        const patientSnap = await getDoc(doc(db, PATIENTS, patientId));
        if (patientSnap.exists()) {
          return { id: patientSnap.id, ...patientSnap.data() };
        }
      }
    }
  } catch {
    // cai no fallback abaixo
  }

  try {
    const snap = await getDocs(collection(db, PATIENTS));
    for (const item of snap.docs) {
      const data = item.data();
      if (normalizeEmail(data.email) === normalized) {
        return { id: item.id, ...data };
      }
    }
  } catch (err) {
    throw new Error(describeFirebaseError(err));
  }

  return null;
}

export async function saveCloudPatient(patient) {
  await ready();
  const id = patient.id;
  if (!id) throw new Error('Paciente sem ID.');
  const email = normalizeEmail(patient.email);
  if (!email) throw new Error('Paciente sem e-mail.');

  const payload = {
    email,
    full_name: patient.full_name || '',
    password: patient.password || '',
    created_at: patient.created_at || new Date().toISOString(),
    role: 'patient',
    updated_at: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, PATIENTS, id), payload);
    await setDoc(doc(db, PATIENT_EMAILS, email), {
      patientId: id,
      email,
      updated_at: payload.updated_at,
    });
  } catch (err) {
    throw new Error(describeFirebaseError(err));
  }

  return { id, ...payload };
}

export async function deleteCloudPatient(patientId, email) {
  await ready();
  if (!patientId) throw new Error('Paciente sem ID.');
  try {
    await deleteDoc(doc(db, PATIENTS, patientId));
    const normalized = normalizeEmail(email);
    if (normalized) {
      await deleteDoc(doc(db, PATIENT_EMAILS, normalized));
    }
  } catch (err) {
    throw new Error(describeFirebaseError(err));
  }
}

export async function fetchAllCloudPatients() {
  await ready();
  try {
    const snap = await getDocs(collection(db, PATIENTS));
    return snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  } catch (err) {
    throw new Error(describeFirebaseError(err));
  }
}

/** Envia pacientes do aparelho para a nuvem (migração). */
export async function pushPatientsToCloud(patients) {
  const list = patients || [];
  let ok = 0;
  let fail = 0;
  const errors = [];
  for (const patient of list) {
    try {
      await saveCloudPatient(patient);
      ok += 1;
    } catch (err) {
      fail += 1;
      errors.push(err?.message || String(err));
    }
  }
  return { ok, fail, errors };
}

/**
 * Mantém lista de pacientes sincronizada entre aparelhos.
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
  }).catch((err) => onError?.(err));

  return () => {
    active = false;
    unsubscribe();
  };
}
