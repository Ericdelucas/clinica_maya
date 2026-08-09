import { extractYoutubeVideoId } from './hotspots.js';
import { readDemoHotspotUrls, writeDemoHotspotUrls } from './demo.js';

const STORE_KEY = 'clinica-maya-hotspot-urls-v1';
const KEYVAL_GET = `https://api.keyval.org/get/${STORE_KEY}`;
const KEYVAL_SET = `https://api.keyval.org/set/${STORE_KEY}`;
const JSONBOX_URL = `https://pramod.ftp.sh/api/json/${STORE_KEY}`;

const SHORT_TO_ID = {
  od: 'ombro_d',
  oe: 'ombro_e',
  cd: 'cotovelo_d',
  ce: 'cotovelo_e',
  pd: 'punho_d',
  pe: 'punho_e',
  cc: 'coluna_cervical',
  cl: 'coluna_lombar',
  qd: 'quadril_d',
  qe: 'quadril_e',
  jd: 'joelho_d',
  je: 'joelho_e',
  td: 'tornozelo_d',
  te: 'tornozelo_e',
};

const ID_TO_SHORT = Object.fromEntries(
  Object.entries(SHORT_TO_ID).map(([short, id]) => [id, short]),
);

function youtubeWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function compactUrls(urls) {
  return Object.entries(urls || {})
    .map(([id, url]) => {
      const short = ID_TO_SHORT[id];
      const videoId = extractYoutubeVideoId(url);
      if (!short || !videoId) return '';
      return `${short}:${videoId}`;
    })
    .filter(Boolean)
    .join(',');
}

function expandCompact(payload) {
  const urls = {};
  String(payload || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const separator = part.indexOf(':');
      if (separator < 1) return;
      const short = part.slice(0, separator);
      const videoId = part.slice(separator + 1).trim();
      const id = SHORT_TO_ID[short];
      if (!id || !videoId) return;
      urls[id] = youtubeWatchUrl(videoId);
    });
  return urls;
}

function normalizeRemotePayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  if (data.urls && typeof data.urls === 'object' && !Array.isArray(data.urls)) {
    return Object.fromEntries(
      Object.entries(data.urls).filter(([, value]) => String(value || '').trim()),
    );
  }
  return {};
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    window.clearTimeout(timer);
  }
}

async function readJsonBox() {
  const response = await request(JSONBOX_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const urls = normalizeRemotePayload(data);
  return urls;
}

async function writeJsonBox(urls) {
  const response = await request(JSONBOX_URL, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      urls,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    throw new Error(`jsonbox ${response.status}`);
  }
}

function parseKeyvalBody(data) {
  if (data == null) return '';
  if (typeof data === 'string') {
    try {
      return parseKeyvalBody(JSON.parse(data));
    } catch {
      return data;
    }
  }
  if (typeof data === 'object') {
    const status = String(data.status || '');
    if (status.includes('DOESNT') || status.includes('ERROR')) return '';
    if (typeof data.val === 'string') return data.val;
  }
  return '';
}

async function readKeyval() {
  const response = await request(KEYVAL_GET, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return expandCompact(parseKeyvalBody(data));
}

async function writeKeyval(urls) {
  const compact = compactUrls(urls);
  const response = await request(`${KEYVAL_SET}/${encodeURIComponent(compact || '-')}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`keyval ${response.status}`);
  }
}

export async function fetchSharedHotspotUrls() {
  const errors = [];

  try {
    const fromBox = await readJsonBox();
    if (fromBox && Object.keys(fromBox).length) return fromBox;
  } catch (error) {
    errors.push(error);
  }

  try {
    const fromKeyval = await readKeyval();
    if (fromKeyval && Object.keys(fromKeyval).length) return fromKeyval;
  } catch (error) {
    errors.push(error);
  }

  if (errors.length && !Object.keys(readDemoHotspotUrls()).length) {
    console.warn('Falha ao ler links compartilhados', errors);
  }

  return {};
}

export async function hydrateSharedHotspotUrls() {
  const remote = await fetchSharedHotspotUrls();
  const local = readDemoHotspotUrls();
  const merged = {
    ...local,
    ...remote,
  };
  writeDemoHotspotUrls(merged);

  const hasLocalOnly = Object.keys(local).some((id) => local[id] && !remote[id]);
  if (hasLocalOnly) {
    try {
      await publishSharedHotspotUrls(merged);
    } catch {
      // Mantém o cache local se a nuvem ainda não estiver acessível.
    }
  }

  return merged;
}

export async function publishSharedHotspotUrls(urls) {
  const cleaned = Object.fromEntries(
    Object.entries(urls || {}).filter(([, value]) => String(value || '').trim()),
  );

  const attempts = await Promise.allSettled([
    writeJsonBox(cleaned),
    writeKeyval(cleaned),
  ]);

  if (attempts.every((attempt) => attempt.status === 'rejected')) {
    const reason = attempts
      .map((attempt) => (attempt.status === 'rejected' ? attempt.reason?.message : ''))
      .filter(Boolean)
      .join('; ');
    throw new Error(reason || 'Não foi possível sincronizar o link entre aparelhos.');
  }

  writeDemoHotspotUrls(cleaned);
  return cleaned;
}

export async function saveSharedHotspotUrl(hotspotId, videoUrl) {
  const remote = await fetchSharedHotspotUrls();
  const next = {
    ...readDemoHotspotUrls(),
    ...remote,
  };
  const trimmed = String(videoUrl || '').trim();
  if (trimmed) {
    next[hotspotId] = trimmed;
  } else {
    delete next[hotspotId];
  }

  writeDemoHotspotUrls(next);
  await publishSharedHotspotUrls(next);
  return next;
}
