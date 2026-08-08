import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const expDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(expDir, '..');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('→ Instalando dependências na raiz do monorepo…');
run('npm', ['install'], rootDir);

console.log('→ Gerando build de @clinica-maya/web…');
run('npm', ['run', 'build'], rootDir);

const sourceDist = path.join(rootDir, 'dist');
const targetDist = path.join(expDir, 'dist');

if (!existsSync(sourceDist)) {
  console.error('Falha: pasta dist não foi gerada na raiz do repositório.');
  process.exit(1);
}

rmSync(targetDist, { recursive: true, force: true });
cpSync(sourceDist, targetDist, { recursive: true });
console.log('→ Publish pronto em exp/dist');
