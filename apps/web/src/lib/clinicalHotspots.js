import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

const COLLECTION = 'clinical_hotspots';

export async function updateClinicalHotspotVideo(hotspotId, videoUrl, meta = {}) {
  const payload = {
    video_url: String(videoUrl || '').trim(),
    updated_at: new Date().toISOString(),
  };

  if (meta.label) payload.label = meta.label;
  if (meta.region) payload.region = meta.region;

  await setDoc(doc(db, COLLECTION, hotspotId), payload, { merge: true });
  return { id: hotspotId, ...payload };
}

export function subscribeClinicalHotspots(onChange, onError) {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const rows = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));
      onChange(rows);
    },
    (error) => {
      onError?.(error);
    },
  );
}
