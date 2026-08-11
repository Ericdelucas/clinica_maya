/**
 * Bateria de testes: vídeos por paciente não se misturam + apagar remove só dali.
 * Roda sem Firebase: simula o mesmo mapa localStorage usado pelo app.
 *
 * node apps/web/scripts/test-patient-video-isolation.mjs
 */

const LOCAL_KEY = 'clinica-maya-patient-hotspots';

/** @type {Map<string, string>} */
const memoryStore = new Map();

const localStorage = {
  getItem(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  setItem(key, value) {
    memoryStore.set(key, String(value));
  },
  removeItem(key) {
    memoryStore.delete(key);
  },
  clear() {
    memoryStore.clear();
  },
};

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

function readLocalPatientHotspots(patientId) {
  const map = readLocalMap();
  const patient = map[patientId] || {};
  return Object.entries(patient).map(([id, value]) => ({
    id,
    ...(typeof value === 'string' ? { video_url: value } : value),
  }));
}

function videoUrlsFor(patientId) {
  return Object.fromEntries(
    readLocalPatientHotspots(patientId)
      .filter((row) => row.video_url)
      .map((row) => [row.id, row.video_url]),
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  localStorage.clear();
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
  }
}

console.log('\n=== Isolamento de vídeos por paciente ===\n');

test('salvar vídeo no paciente A não aparece no paciente B', () => {
  saveLocalPatientHotspot('carla', 'ombro_d', {
    video_url: 'https://www.youtube.com/watch?v=AAAA',
  });
  saveLocalPatientHotspot('ricardo', 'joelho_e', {
    video_url: 'https://www.youtube.com/watch?v=BBBB',
  });

  const carla = videoUrlsFor('carla');
  const ricardo = videoUrlsFor('ricardo');

  assert(carla.ombro_d === 'https://www.youtube.com/watch?v=AAAA', 'Carla deve ter ombro_d');
  assert(!carla.joelho_e, 'Carla NÃO deve ter joelho_e do Ricardo');
  assert(ricardo.joelho_e === 'https://www.youtube.com/watch?v=BBBB', 'Ricardo deve ter joelho_e');
  assert(!ricardo.ombro_d, 'Ricardo NÃO deve ter ombro_d da Carla');
});

test('mesma articulação, URLs diferentes por paciente', () => {
  saveLocalPatientHotspot('carla', 'joelho_d', {
    video_url: 'https://www.youtube.com/watch?v=CARLA-JOELHO',
  });
  saveLocalPatientHotspot('ricardo', 'joelho_d', {
    video_url: 'https://www.youtube.com/watch?v=RICARDO-JOELHO',
  });

  assert(
    videoUrlsFor('carla').joelho_d === 'https://www.youtube.com/watch?v=CARLA-JOELHO',
    'Carla mantém o próprio joelho_d',
  );
  assert(
    videoUrlsFor('ricardo').joelho_d === 'https://www.youtube.com/watch?v=RICARDO-JOELHO',
    'Ricardo mantém o próprio joelho_d',
  );
  assert(
    videoUrlsFor('carla').joelho_d !== videoUrlsFor('ricardo').joelho_d,
    'URLs não podem ser iguais entre pacientes',
  );
});

test('atualizar vídeo do paciente A não sobrescreve B', () => {
  saveLocalPatientHotspot('carla', 'coluna_lombar', {
    video_url: 'https://www.youtube.com/watch?v=OLD-A',
  });
  saveLocalPatientHotspot('ricardo', 'coluna_lombar', {
    video_url: 'https://www.youtube.com/watch?v=KEEP-B',
  });

  saveLocalPatientHotspot('carla', 'coluna_lombar', {
    video_url: 'https://www.youtube.com/watch?v=NEW-A',
  });

  assert(videoUrlsFor('carla').coluna_lombar === 'https://www.youtube.com/watch?v=NEW-A', 'A atualizou');
  assert(videoUrlsFor('ricardo').coluna_lombar === 'https://www.youtube.com/watch?v=KEEP-B', 'B intacto');
});

test('apagar vídeo remove só daquele paciente/articulação', () => {
  saveLocalPatientHotspot('carla', 'ombro_d', {
    video_url: 'https://www.youtube.com/watch?v=DEL-ME',
  });
  saveLocalPatientHotspot('carla', 'epigastrio', {
    video_url: 'https://www.youtube.com/watch?v=KEEP-ME',
  });
  saveLocalPatientHotspot('ricardo', 'ombro_d', {
    video_url: 'https://www.youtube.com/watch?v=OTHER',
  });

  removeLocalPatientHotspot('carla', 'ombro_d');

  assert(!videoUrlsFor('carla').ombro_d, 'ombro_d da Carla apagado');
  assert(videoUrlsFor('carla').epigastrio === 'https://www.youtube.com/watch?v=KEEP-ME', 'outra articulação da Carla ok');
  assert(videoUrlsFor('ricardo').ombro_d === 'https://www.youtube.com/watch?v=OTHER', 'ombro_d do Ricardo intacto');
});

test('seeds demo: cada paciente fictício tem conjunto distinto', () => {
  const DEMO = {
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

  for (const [patientId, videos] of Object.entries(DEMO)) {
    for (const [hotspotId, videoUrl] of Object.entries(videos)) {
      saveLocalPatientHotspot(patientId, hotspotId, { video_url: videoUrl });
    }
  }

  assert(deepEqual(videoUrlsFor('demo-carla'), DEMO['demo-carla']), 'Carla seed');
  assert(deepEqual(videoUrlsFor('demo-ricardo'), DEMO['demo-ricardo']), 'Ricardo seed');
  assert(deepEqual(videoUrlsFor('demo-sofia'), DEMO['demo-sofia']), 'Sofia seed');

  // Nenhuma chave de Carla deve existir em Ricardo
  for (const key of Object.keys(DEMO['demo-carla'])) {
    assert(!videoUrlsFor('demo-ricardo')[key], `Ricardo não deve ter ${key} da Carla`);
  }
});

test('mapa raiz guarda pacientes em namespaces separados (path lógico)', () => {
  saveLocalPatientHotspot('p1', 'a', { video_url: 'u1' });
  saveLocalPatientHotspot('p2', 'a', { video_url: 'u2' });

  const root = readLocalMap();
  assert(root.p1 && root.p2, 'dois pacientes no mapa');
  assert(root.p1.a.video_url === 'u1' && root.p2.a.video_url === 'u2', 'mesmo id de joint, valores distintos');
  assert(!root.shared, 'não existe bucket compartilhado implícito');
});

console.log(`\nResultado: ${passed} passou, ${failed} falhou\n`);
process.exit(failed > 0 ? 1 : 0);
