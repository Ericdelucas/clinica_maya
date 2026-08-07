# Clínica Maya

Plataforma fisioterapêutica com manequim anatômico 3D, painel da profissional e portal do paciente (Supabase Auth + Postgres + Storage).

## Stack

- React + Vite + React Three Fiber
- Supabase (Auth, Postgres, Storage, Edge Functions)
- PWA (instalável no celular)

## Setup

```sh
npm install
cp apps/web/.env.example apps/web/.env.local
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `apps/web/.env.local`.

### Banco e function

1. Aplique as migrations em `supabase/migrations/` no projeto Supabase.
2. Faça deploy da Edge Function `create-patient`:

```sh
supabase functions deploy create-patient
```

3. Crie o usuário admin no Dashboard (Authentication) e insira o perfil:

```sql
insert into public.profiles (id, email, full_name, role)
values ('<uuid-do-auth-user>', 'maya@clinica.com', 'Maya', 'admin');
```

## Desenvolvimento

```sh
npm run dev
```

Abre em `http://localhost:5173`.

## Uso no celular (site responsivo)

O produto é web-first: funciona no navegador do computador e do celular.

```sh
npm run dev
```

- Computador: layout lado a lado (manequim + painel)
- Celular: abas **Manequim 3D** / **Painel**, toque nas esferas, formulários adaptados

No celular (mesma Wi‑Fi), abra o endereço `Network` que o Vite mostrar (ex.: `http://192.168.x.x:5173`).

No Android/iPhone, use “Adicionar à tela inicial” do navegador para atalho tipo app (PWA).

## Regras de acesso

- Sem cadastro público.
- Pacientes são criados apenas pela profissional (aba “Cadastrar Paciente”).
- A interface segue `profiles.role` (`admin` | `patient`).
