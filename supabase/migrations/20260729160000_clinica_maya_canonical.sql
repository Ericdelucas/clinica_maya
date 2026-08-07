-- Clínica Maya: schema canônico (profiles, hotspots, documentos, RLS, storage)

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'patient',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists full_name text;

-- Normaliza roles legadas e aplica check canônico
do $$
declare
  constraint_name text;
begin
  update public.profiles
  set role = 'admin'
  where role in ('profissional', 'professional');

  update public.profiles
  set role = 'patient'
  where role is null or role not in ('admin', 'patient');

  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'profiles'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end loop;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('admin', 'patient'));
exception
  when duplicate_object then
    null;
end $$;

alter table public.profiles enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists profiles_admin_read_patients on public.profiles;
create policy profiles_admin_read_patients
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Clinical hotspots
create table if not exists public.clinical_hotspots (
  id text primary key,
  label text not null,
  region text,
  position float8[] not null check (array_length(position, 1) = 3),
  video_url text,
  updated_at timestamptz not null default now()
);

alter table public.clinical_hotspots enable row level security;

drop policy if exists clinical_hotspots_read_authenticated on public.clinical_hotspots;
create policy clinical_hotspots_read_authenticated
  on public.clinical_hotspots
  for select
  to authenticated
  using (true);

drop policy if exists clinical_hotspots_update_admin on public.clinical_hotspots;
create policy clinical_hotspots_update_admin
  on public.clinical_hotspots
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

insert into public.clinical_hotspots (id, label, region, position, video_url)
values
  ('ombro_d', 'Ombro Direito', 'Membros Superiores', array[0.34, 1.39, 0.0]::float8[], ''),
  ('ombro_e', 'Ombro Esquerdo', 'Membros Superiores', array[-0.34, 1.39, 0.0]::float8[], ''),
  ('cotovelo_d', 'Cotovelo Direito', 'Membros Superiores', array[0.58, 1.02, 0.0]::float8[], ''),
  ('cotovelo_e', 'Cotovelo Esquerdo', 'Membros Superiores', array[-0.58, 1.02, 0.0]::float8[], ''),
  ('punho_d', 'Punho Direito', 'Membros Superiores', array[0.66, 0.62, 0.0]::float8[], ''),
  ('punho_e', 'Punho Esquerdo', 'Membros Superiores', array[-0.66, 0.62, 0.0]::float8[], ''),
  ('coluna_cervical', 'Coluna Cervical', 'Coluna', array[0.0, 1.62, 0.0]::float8[], ''),
  ('coluna_lombar', 'Coluna Lombar', 'Coluna', array[0.0, 0.82, 0.0]::float8[], ''),
  ('quadril_d', 'Quadril Direito', 'Membros Inferiores', array[0.18, 0.48, 0.0]::float8[], ''),
  ('quadril_e', 'Quadril Esquerdo', 'Membros Inferiores', array[-0.18, 0.48, 0.0]::float8[], ''),
  ('joelho_d', 'Joelho Direito', 'Membros Inferiores', array[0.23, -0.08, 0.0]::float8[], ''),
  ('joelho_e', 'Joelho Esquerdo', 'Membros Inferiores', array[-0.23, -0.08, 0.0]::float8[], ''),
  ('tornozelo_d', 'Tornozelo Direito', 'Membros Inferiores', array[0.24, -0.72, 0.0]::float8[], ''),
  ('tornozelo_e', 'Tornozelo Esquerdo', 'Membros Inferiores', array[-0.24, -0.72, 0.0]::float8[], '')
on conflict (id) do update set
  label = excluded.label,
  region = excluded.region,
  position = excluded.position,
  updated_at = now();

-- Patient documents
create table if not exists public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references public.profiles(id) on delete cascade,
  notes text,
  file_url text not null,
  created_at timestamptz not null default now()
);

-- Migra coluna legado text -> uuid quando necessário
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'patient_documents'
      and column_name = 'paciente_id'
      and data_type = 'text'
  ) then
    alter table public.patient_documents
      alter column paciente_id type uuid
      using nullif(paciente_id, '')::uuid;
  end if;
exception
  when others then
    raise notice 'paciente_id migration skipped: %', sqlerrm;
end $$;

create index if not exists patient_documents_paciente_id_idx
  on public.patient_documents (paciente_id);

create index if not exists patient_documents_created_at_idx
  on public.patient_documents (created_at desc);

alter table public.patient_documents enable row level security;

drop policy if exists patient_documents_insert on public.patient_documents;
drop policy if exists patient_documents_insert_own on public.patient_documents;
create policy patient_documents_insert_own
  on public.patient_documents
  for insert
  to authenticated
  with check (paciente_id = auth.uid());

drop policy if exists patient_documents_read_own_or_professional on public.patient_documents;
drop policy if exists patient_documents_read_own_or_admin on public.patient_documents;
create policy patient_documents_read_own_or_admin
  on public.patient_documents
  for select
  to authenticated
  using (
    paciente_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  true,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists patient_documents_upload on storage.objects;
drop policy if exists patient_documents_upload_own on storage.objects;
create policy patient_documents_upload_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists patient_documents_public_read on storage.objects;
create policy patient_documents_public_read
  on storage.objects
  for select
  using (bucket_id = 'patient-documents');
