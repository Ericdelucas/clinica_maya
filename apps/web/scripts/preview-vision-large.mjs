import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../../.preview');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Sou profissional' }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'Visão' }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(outDir, '30-visao-profissional-grande.png') });

await page.getByRole('button', { name: /Sair|sair/i }).first().click().catch(() => {});
// logout via avatar menu
await page.locator('.avatar-btn').click();
await page.getByRole('button', { name: 'Sair' }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Sou paciente' }).click();
await page.waitForTimeout(700);
const visionTab = page.getByRole('button', { name: 'Visão' });
const patientHasVision = await visionTab.count();
await page.screenshot({ path: path.join(outDir, '31-paciente-sem-visao.png') });

console.log(JSON.stringify({ patientHasVision, outDir }));
await browser.close();
