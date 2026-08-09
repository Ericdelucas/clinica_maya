import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession } from './firebase.js';

const COLLECTION = 'clinical_hotspots';

export const FIRESTORE_OPEN_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /clinical_hotspots/{hotspotId} {
      allow read, write: if true;
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
    return 'O Firebase recusou o salvamento (regras fechadas). Abra console.firebase.google.com → projeto maya-4a18e → Firestore Database → Regras, cole o bloco abaixo e clique em Publicar.';
  }

  if (code.includes('unavailable') || message.toLowerCase().includes('offline')) {
    return 'Sem conexão com o Firebase. Confira a internet e tente de novo.';
  }

  return message || 'Não foi possível falar com o Firestore.';
}

export async function updateClinicalHotspotVideo(hotspotId, videoUrl, meta = {}) {
  await ensureFirebaseSession();

  const payload = {
    video_url: String(videoUrl || '').trim(),
    updated_at: new Date().toISOString(),
  };

  if (meta.label) payload.label = meta.label;
  if (meta.region) payload.region = meta.region;

  try {
    await setDoc(doc(db, COLLECTION, hotspotId), payload, { merge: true });
  } catch (error) {
    throw new Error(describeFirebaseError(error));
  }

  return { id: hotspotId, ...payload };
}

export function subscribeClinicalHotspots(onChange, onError) {
  let unsubscribe = () => {};
  let active = true;

  void ensureFirebaseSession().finally(() => {
    if (!active) return;

    unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        const rows = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        onChange(rows);
      },
      (error) => {
        onError?.(new Error(describeFirebaseError(error)));
      },
    );
  });

  return () => {
    active = false;
    unsubscribe();
  };
}
