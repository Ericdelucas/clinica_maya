import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../../.preview');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const context = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  permissions: ['camera'],
});
await context.addInitScript(() => {
  localStorage.removeItem('clinica-maya-demo-session');
});
const page = await context.newPage();

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.locator('#email').fill('mayayyamamoto@gmail.com');
await page.locator('#password').fill('123');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForTimeout(1000);
await page.getByRole('button', { name: 'Visão' }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(outDir, '60-visao-mao-cotovelo-ui.png') });

await page.getByRole('button', { name: 'Iniciar câmera' }).click();
await page.waitForTimeout(6000);
await page.screenshot({ path: path.join(outDir, '61-visao-mao-cotovelo-camera.png') });

console.log(JSON.stringify({ outDir }));
await browser.close();
