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
  viewport: { width: 1440, height: 900 },
  permissions: ['camera'],
});
await context.addInitScript(() => {
  localStorage.removeItem('clinica-maya-demo-session');
});
const page = await context.newPage();

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(outDir, '80-login.png') });

await page.locator('#email').fill('mayayyamamoto@gmail.com');
await page.locator('#password').fill('123');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(outDir, '81-home.png') });

await page.getByRole('button', { name: 'Visão' }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(outDir, '82-visao-maos.png') });

await page.getByRole('button', { name: 'Iniciar câmera' }).click();
await page.waitForTimeout(6500);
await page.screenshot({ path: path.join(outDir, '83-camera-ligada.png') });

console.log(JSON.stringify({ url: 'http://localhost:5173/', outDir }));
await browser.close();
