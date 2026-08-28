import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.preview');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 60000 });
await page.getByRole('button', { name: /Sou profissional/i }).click();
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(out, '10-pacientes.png'), fullPage: true });

const carla = page.locator('.patient-card', { hasText: 'Carla Mendes' });
await carla.getByRole('button', { name: /Ver boneco/i }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, '11-boneco-carla.png'), fullPage: true });

await page.getByRole('button', { name: /^Pacientes$/i }).click();
await page.waitForTimeout(800);
const ricardo = page.locator('.patient-card', { hasText: 'Ricardo Alves' });
await ricardo.getByRole('button', { name: /Ver boneco/i }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, '12-boneco-ricardo.png'), fullPage: true });

await browser.close();
console.log('preview patient mannequins ok');
