/**
 * Captura a aba Visão + gera preview dos pontinhos no estilo MediaPipe.
 * node apps/web/scripts/preview-vision.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../');
const outDir = path.join(root, '.preview');
const baseUrl = process.env.VISION_PREVIEW_URL || 'http://127.0.0.1:5173';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

/** Landmarks normalizados de uma mão aberta (demo visual). */
const DEMO_HAND = [
  { x: 0.48, y: 0.78 },
  { x: 0.40, y: 0.70 }, { x: 0.34, y: 0.60 }, { x: 0.30, y: 0.50 }, { x: 0.27, y: 0.40 },
  { x: 0.44, y: 0.55 }, { x: 0.42, y: 0.40 }, { x: 0.41, y: 0.28 }, { x: 0.40, y: 0.18 },
  { x: 0.50, y: 0.53 }, { x: 0.50, y: 0.36 }, { x: 0.50, y: 0.24 }, { x: 0.50, y: 0.14 },
  { x: 0.56, y: 0.55 }, { x: 0.58, y: 0.40 }, { x: 0.59, y: 0.29 }, { x: 0.60, y: 0.20 },
  { x: 0.62, y: 0.60 }, { x: 0.66, y: 0.50 }, { x: 0.69, y: 0.42 }, { x: 0.72, y: 0.35 },
];

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok || res.status === 404) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Servidor não respondeu em ${url}`);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await waitForServer(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sou profissional' }).click();
  await page.getByRole('button', { name: 'Visão' }).click();
  await page.waitForSelector('.vision-panel');

  const uiPath = path.join(outDir, '20-visao-ui.png');
  await page.locator('.vision-panel').screenshot({ path: uiPath });

  // Preview sintético dos pontinhos (mesmo estilo do ComputerVisionPanel)
  const syntheticPath = path.join(outDir, '21-visao-pontinhos.png');
  await page.setContent(`<!doctype html>
<html><body style="margin:0;background:#111">
<canvas id="c" width="900" height="700"></canvas>
<script>
const HAND_CONNECTIONS = ${JSON.stringify(HAND_CONNECTIONS)};
const landmarks = ${JSON.stringify(DEMO_HAND)};
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const w = canvas.width, h = canvas.height;

// fundo tipo câmera
const g = ctx.createRadialGradient(w*0.5, h*0.55, 40, w*0.5, h*0.5, w*0.6);
g.addColorStop(0, '#3f3f46');
g.addColorStop(1, '#18181b');
ctx.fillStyle = g;
ctx.fillRect(0,0,w,h);

// silhueta suave da mão
ctx.fillStyle = 'rgba(212,165,140,0.55)';
ctx.beginPath();
ctx.ellipse(w*0.5, h*0.62, 110, 150, 0, 0, Math.PI*2);
ctx.fill();

ctx.strokeStyle = '#4ade80';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(6, 8); ctx.lineTo(6, h-8);
ctx.moveTo(w-6, 8); ctx.lineTo(w-6, h-8);
ctx.stroke();

const toXY = (lm) => [lm.x * w, lm.y * h];
ctx.lineWidth = 4;
ctx.lineCap = 'round';
ctx.strokeStyle = '#e879f9';
for (const [a,b] of HAND_CONNECTIONS) {
  const [ax,ay] = toXY(landmarks[a]);
  const [bx,by] = toXY(landmarks[b]);
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
}
for (const lm of landmarks) {
  const [x,y] = toXY(lm);
  ctx.beginPath(); ctx.fillStyle = '#7c3aed'; ctx.arc(x,y,7,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.fillStyle = '#faf5ff'; ctx.arc(x,y,3.2,0,Math.PI*2); ctx.fill();
}
const ids = [0,5,9,13,17];
let cx=0, cy=0;
for (const id of ids) { cx += landmarks[id].x; cy += landmarks[id].y; }
cx = (cx/ids.length)*w; cy = (cy/ids.length)*h;
ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5;
ctx.beginPath(); ctx.moveTo(cx-10,cy); ctx.lineTo(cx+10,cy);
ctx.moveTo(cx,cy-10); ctx.lineTo(cx,cy+10); ctx.stroke();

ctx.fillStyle = '#fff';
ctx.font = '600 22px system-ui';
ctx.fillText('Visão computacional — 21 landmarks (estilo MediaPipe)', 24, 40);
</script>
</body></html>`);

  await page.waitForTimeout(200);
  await page.locator('#c').screenshot({ path: syntheticPath });

  await browser.close();
  console.log(JSON.stringify({ uiPath, syntheticPath }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
