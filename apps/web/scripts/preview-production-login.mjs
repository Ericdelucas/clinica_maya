import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../../.preview');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await context.addInitScript(() => {
  localStorage.removeItem('clinica-maya-demo-session');
});
const page = await context.newPage();

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outDir, '40-login-producao.png') });

await page.locator('#email').fill('mayayyamamoto@gmail.com');
await page.locator('#password').fill('123');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(outDir, '41-painel-maya.png') });

await page.locator('.avatar-btn').click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Alterar e-mail e senha' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(outDir, '42-perfil-email-senha.png') });

await page.locator('.canvas-pane').screenshot({
  path: path.join(outDir, '43-boneco-lados.png'),
}).catch(() => {});

console.log(JSON.stringify({ outDir }));
await browser.close();
