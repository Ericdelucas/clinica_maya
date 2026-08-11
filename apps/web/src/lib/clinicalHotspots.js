import { collection, deleteDoc, doc, onSnapshot, setDoc, getDocs } from 'firebase/firestore';
import { db, ensureFirebaseSession } from './firebase.js';

const ROOT = 'patient_hotspots';
const LOCAL_KEY = 'clinica-maya-patient-hotspots';

export const FIRESTORE_OPEN_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /clinical_hotspots/{hotspotId} {
      allow read, write: if true;
    }
    match /patient_hotspots/{patientId} {
      allow read, write: if true;
      match /joints/{hotspotId} {
        allow read, write: if true;
      }
    }
  }
}`;

export function describeFirebaseError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  const combined = `${code} ${message}`.toLowerCase();

  if (
    combined.includes('permission')
    || combined.includes('insufficient')
    || combined.includes('missing or insufficient')
  ) {
    return 'O Firebase recusou o salvamento (regras fechadas). Publique as regras de patient_hotspots no Console.';
  }

  if (code.includes('unavailable') || message.toLowerCase().includes('offline')) {
    return 'Sem conexão com o Firebase. Confira a internet e tente de novo.';
  }

  return message || 'Não foi possível falar com o Firestore.';
}

function readLocalMap() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalMap(map) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(map || {}));
}

export function readLocalPatientHotspots(patientId) {
  const map = readLocalMap();
  const patient = map[patientId] || {};
  return Object.entries(patient).map(([id, value]) => ({
    id,
    ...(typeof value === 'string' ? { video_url: value } : value),
  }));
}

function saveLocalPatientHotspot(patientId, hotspotId, payload) {
  const map = readLocalMap();
  map[patientId] = {
    ...(map[patientId] || {}),
    [hotspotId]: payload,
  };
  writeLocalMap(map);
}

function removeLocalPatientHotspot(patientId, hotspotId) {
  const map = readLocalMap();
  const patient = { ...(map[patientId] || {}) };
  delete patient[hotspotId];
  if (Object.keys(patient).length === 0) {
    delete map[patientId];
  } else {
    map[patientId] = patient;
  }
  writeLocalMap(map);
}

function jointsCollection(patientId) {
  return collection(db, ROOT, patientId, 'joints');
}

/** Remove o vídeo desta articulação só deste paciente (Firestore + cache local). */
export async function clearPatientHotspotVideo(patientId, hotspotId) {
  if (!patientId) {
    throw new Error('Selecione o paciente para quem este exercício será removido.');
  }
  if (!hotspotId) {
    throw new Error('Selecione a articulação.');
  }

  removeLocalPatientHotspot(patientId, hotspotId);

  await ensureFirebaseSession();
  try {
    await deleteDoc(doc(jointsCollection(patientId), hotspotId));
    await setDoc(
      doc(db, ROOT, patientId),
      { updated_at: new Date().toISOString() },
      { merge: true },
    );
  } catch (error) {
    throw new Error(describeFirebaseError(error));
  }

  return { id: hotspotId, video_url: '' };
}

export async function updatePatientHotspotVideo(patientId, hotspotId, videoUrl, meta = {}) {
  if (!patientId) {
    throw new Error('Selecione o paciente para quem este exercício será salvo.');
  }

  const trimmed = String(videoUrl || '').trim();

  // URL vazia = apagar o link antigo (não deixar documento/lixo no Firebase)
  if (!trimmed) {
    return clearPatientHotspotVideo(patientId, hotspotId);
  }

  const payload = {
    video_url: trimmed,
    updated_at: new Date().toISOString(),
  };
  if (meta.label) payload.label = meta.label;
  if (meta.region) payload.region = meta.region;

  saveLocalPatientHotspot(patientId, hotspotId, payload);

  await ensureFirebaseSession();
  try {
    await setDoc(doc(db, ROOT, patientId), { updated_at: payload.updated_at }, { merge: true });
    await setDoc(doc(jointsCollection(patientId), hotspotId), payload, { merge: true });
  } catch (error) {
    throw new Error(describeFirebaseError(error));
  }

  return { id: hotspotId, ...payload };
}

export function subscribePatientHotspots(patientId, onChange, onError) {
  if (!patientId) {
    onChange([]);
    return () => {};
  }

  // Entrega imediata do cache local (útil no demo / se o Firebase falhar)
  onChange(readLocalPatientHotspots(patientId));

  let unsubscribe = () => {};
  let active = true;

  void ensureFirebaseSession().finally(() => {
    if (!active) return;

    unsubscribe = onSnapshot(
      jointsCollection(patientId),
      (snapshot) => {
        const rows = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        const map = readLocalMap();
        map[patientId] = Object.fromEntries(rows.map((row) => [row.id, row]));
        writeLocalMap(map);

        onChange(rows);
      },
      (error) => {
        onChange(readLocalPatientHotspots(patientId));
        onError?.(new Error(describeFirebaseError(error)));
      },
    );
  });

  return () => {
    active = false;
    unsubscribe();
  };
}

/** Seeds de vídeos diferentes por paciente fictício (demo) */
export const DEMO_PATIENT_VIDEO_SEEDS = {
  'demo-patient': {
    tornozelo_e: 'https://www.youtube.com/watch?v=GJz3dz5Gkmw',
    joelho_d: 'https://www.youtube.com/watch?v=2NQB7y-a0gs',
  },
  'demo-carla': {
    ombro_d: 'https://www.youtube.com/watch?v=2eA2KoIYihU',
    coluna_lombar: 'https://www.youtube.com/watch?v=4BOTvaRaDjI',
    epigastrio: 'https://www.youtube.com/watch?v=inpok4MKVLM',
  },
  'demo-ricardo': {
    joelho_e: 'https://www.youtube.com/watch?v=RqcOCBbNNqs',
    lombo_sacra: 'https://www.youtube.com/watch?v=2eA2KoIYihU',
    pescoco_posterior: 'https://www.youtube.com/watch?v=4BOTvaRaDjI',
  },
  'demo-sofia': {
    punho_d: 'https://www.youtube.com/watch?v=GJz3dz5Gkmw',
    quadril_e: 'https://www.youtube.com/watch?v=RqcOCBbNNqs',
    coluna_cervical: 'https://www.youtube.com/watch?v=inpok4MKVLM',
  },
};

export async function seedDemoPatientVideos() {
  const entries = Object.entries(DEMO_PATIENT_VIDEO_SEEDS);
  for (const [patientId, videos] of entries) {
    for (const [hotspotId, videoUrl] of Object.entries(videos)) {
      saveLocalPatientHotspot(patientId, hotspotId, {
        video_url: videoUrl,
        updated_at: new Date().toISOString(),
      });
    }
  }

  await ensureFirebaseSession();
  try {
    for (const [patientId, videos] of entries) {
      await setDoc(doc(db, ROOT, patientId), { updated_at: new Date().toISOString() }, { merge: true });
      for (const [hotspotId, videoUrl] of Object.entries(videos)) {
        await setDoc(doc(jointsCollection(patientId), hotspotId), {
          video_url: videoUrl,
          updated_at: new Date().toISOString(),
        }, { merge: true });
      }
    }
    return { ok: true, remote: true };
  } catch (error) {
    return { ok: true, remote: false, error: describeFirebaseError(error) };
  }
}

export async function fetchPatientHotspotRows(patientId) {
  await ensureFirebaseSession();
  try {
    const snapshot = await getDocs(jointsCollection(patientId));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch {
    return readLocalPatientHotspots(patientId);
  }
}

// Compat
export async function updateClinicalHotspotVideo(hotspotId, videoUrl, meta = {}) {
  return updatePatientHotspotVideo(meta.patientId, hotspotId, videoUrl, meta);
}

export function subscribeClinicalHotspots(onChange, onError) {
  return subscribePatientHotspots('shared', onChange, onError);
}
