import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession } from './firebase.js';

const COLLECTION = 'clinical_hotspots';

export function describeFirebaseError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');

  if (code.includes('permission-denied') || message.toLowerCase().includes('permission')) {
    return 'O Firebase bloqueou a gravação. No Console do Firebase (projeto maya-4a18e): Firestore → Regras, publique as regras de clinical_hotspots e, em Authentication, ative o login anônimo.';
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
