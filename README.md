# SmartSaúde

Monorepo do ecossistema multiplataforma para clínicas de fisioterapia.

## Workspaces

- `packages/shared`: domínio, DTOs e portas agnósticas de plataforma.
- `apps/web`: aplicação React/Vite e renderer compartilhado com Capacitor/Electron.
- `apps/desktop`: host Electron para Windows.

## Primeiros comandos

```sh
npm install
npm run version:inject
npm run typecheck
npm run dev:web
npm run dev:desktop
```

Para criar os projetos nativos após a instalação:

```sh
npm exec --workspace @smartsaude/web cap add android
npm exec --workspace @smartsaude/web cap add ios
npm run cap:sync --workspace @smartsaude/web
```

O projeto iOS exige macOS/Xcode para compilação e execução.

Copie `apps/web/.env.example` para `apps/web/.env` e preencha a URL e a chave
anônima do Supabase antes de iniciar a aplicação. O bucket privado esperado para
as fotos clínicas é `fotos-clinicas`.

Na aplicação web, acrescente `?outdated=1` à URL para visualizar o bloqueio de
atualização obrigatória do `VersionGuard`.
