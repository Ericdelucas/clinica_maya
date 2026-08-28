import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../../.preview');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ['camera'],
});
const page = await context.newPage();

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Sou profissional' }).click();
await page.waitForTimeout(800);

await page.getByRole('button', { name: 'Visão' }).click();
await page.waitForTimeout(500);
await page.screenshot({
  path: path.join(outDir, '20-visao-aba.png'),
  fullPage: false,
});

await page.getByRole('button', { name: 'Iniciar câmera' }).click();
await page.waitForTimeout(4500);
await page.screenshot({
  path: path.join(outDir, '21-visao-camera.png'),
  fullPage: false,
});

const stage = page.locator('.vision-stage');
if (await stage.count()) {
  await stage.screenshot({ path: path.join(outDir, '22-visao-stage.png') });
}

console.log('Saved screenshots to', outDir);
await browser.close();
