import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(root, '..', '..');

const candidates = [
  path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
  path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
  path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
];

const source = candidates.find((file) => existsSync(file));
if (!source) {
  console.error('APK não encontrado. Rode: npm run apk:debug --workspace @clinica-maya/web');
  process.exit(1);
}

const outDir = path.join(repoRoot, 'release');
mkdirSync(outDir, { recursive: true });
const destination = path.join(outDir, 'ClinicaMaya.apk');
copyFileSync(source, destination);
console.log(`APK pronto para enviar no WhatsApp:\n${destination}`);
