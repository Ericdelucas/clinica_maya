/**
 * Teste ao vivo no Firestore: isolamento + apagar.
 * Cria patient_hotspots/_test_* e limpa no final.
 *
 * node apps/web/scripts/test-firestore-isolation-live.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBsrBYzdtgmJAWj4dFkoVCU3AW1usmyvlA',
  authDomain: 'maya-4a18e.firebaseapp.com',
  projectId: 'maya-4a18e',
  storageBucket: 'maya-4a18e.firebasestorage.app',
  messagingSenderId: '885321747185',
  appId: '1:885321747185:web:80a303811b38ad796af750',
};

const ROOT = 'patient_hotspots';
const A = `_test_iso_a_${Date.now()}`;
const B = `_test_iso_b_${Date.now()}`;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function joints(patientId) {
  return collection(db, ROOT, patientId, 'joints');
}

async function saveVideo(patientId, hotspotId, videoUrl) {
  const payload = {
    video_url: videoUrl,
    updated_at: new Date().toISOString(),
  };
  await setDoc(doc(db, ROOT, patientId), { updated_at: payload.updated_at }, { merge: true });
  await setDoc(doc(joints(patientId), hotspotId), payload, { merge: true });
}

async function clearVideo(patientId, hotspotId) {
  await deleteDoc(doc(joints(patientId), hotspotId));
}

async function listVideos(patientId) {
  const snapshot = await getDocs(joints(patientId));
  return Object.fromEntries(
    snapshot.docs
      .map((item) => [item.id, item.data()?.video_url || ''])
      .filter(([, url]) => url),
  );
}

async function wipePatient(patientId) {
  const snapshot = await getDocs(joints(patientId));
  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
  try {
    await deleteDoc(doc(db, ROOT, patientId));
  } catch {
    // parent doc may already be gone
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
  }
}

console.log('\n=== Firestore ao vivo: isolamento + apagar ===\n');
console.log(`Pacientes temporários: ${A} | ${B}\n`);

try {
  try {
    await signInAnonymously(auth);
    console.log('Auth anônima: ok\n');
  } catch (error) {
    console.log(`Auth anônima falhou (${error.code || error.message}) — tentando sem auth\n`);
  }

  await test('gravar A e B com vídeos distintos na mesma articulação', async () => {
    await saveVideo(A, 'ombro_d', 'https://www.youtube.com/watch?v=TEST-A');
    await saveVideo(B, 'ombro_d', 'https://www.youtube.com/watch?v=TEST-B');

    const a = await listVideos(A);
    const b = await listVideos(B);

    assert(a.ombro_d === 'https://www.youtube.com/watch?v=TEST-A', 'A deve ter TEST-A');
    assert(b.ombro_d === 'https://www.youtube.com/watch?v=TEST-B', 'B deve ter TEST-B');
    assert(a.ombro_d !== b.ombro_d, 'URLs não podem vazar entre pacientes');
  });

  await test('vídeo extra só em A não aparece em B', async () => {
    await saveVideo(A, 'joelho_e', 'https://www.youtube.com/watch?v=ONLY-A');
    const a = await listVideos(A);
    const b = await listVideos(B);
    assert(a.joelho_e === 'https://www.youtube.com/watch?v=ONLY-A', 'A tem joelho_e');
    assert(!b.joelho_e, 'B não tem joelho_e');
  });

  await test('apagar vídeo em A remove do Firebase sem tocar B', async () => {
    await clearVideo(A, 'ombro_d');
    const a = await listVideos(A);
    const b = await listVideos(B);
    assert(!a.ombro_d, 'ombro_d de A apagado no Firestore');
    assert(a.joelho_e === 'https://www.youtube.com/watch?v=ONLY-A', 'outra articulação de A permanece');
    assert(b.ombro_d === 'https://www.youtube.com/watch?v=TEST-B', 'ombro_d de B intacto');
  });

  await test('atualizar A não sobrescreve B', async () => {
    await saveVideo(A, 'ombro_d', 'https://www.youtube.com/watch?v=NEW-A');
    const a = await listVideos(A);
    const b = await listVideos(B);
    assert(a.ombro_d === 'https://www.youtube.com/watch?v=NEW-A', 'A atualizado');
    assert(b.ombro_d === 'https://www.youtube.com/watch?v=TEST-B', 'B intacto após update de A');
  });
} finally {
  console.log('\nLimpando pacientes de teste…');
  try {
    await wipePatient(A);
    await wipePatient(B);
    console.log('Limpeza ok.\n');
  } catch (error) {
    console.error(`Limpeza parcial: ${error.message}\n`);
  }
}

console.log(`Resultado: ${passed} passou, ${failed} falhou\n`);
if (failed > 0) {
  console.log('Se falhou por permissão: publique as regras de patient_hotspots no Console Firebase.');
}
process.exit(failed > 0 ? 1 : 0);
