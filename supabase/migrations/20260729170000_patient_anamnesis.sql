-- Ficha clínica do paciente (anamnese) + bucket de mídia (foto/vídeo)

create table if not exists public.patient_anamnesis (
  paciente_id uuid primary key references public.profiles(id) on delete cascade,
  full_name text,
  birth_date date,
  phone text,
  weight_kg numeric(6,2),
  height_cm numeric(6,2),
  blood_type text,
  allergies text,
  medications text,
  health_conditions text,
  surgeries text,
  smokes text default 'nao',
  drinks_alcohol text default 'nao',
  physical_activity text,
  pain_areas text,
  chief_complaint text,
  notes text,
  media jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.patient_anamnesis enable row level security;

drop policy if exists patient_anamnesis_select on public.patient_anamnesis;
create policy patient_anamnesis_select
  on public.patient_anamnesis
  for select
  to authenticated
  using (
    paciente_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists patient_anamnesis_upsert_own on public.patient_anamnesis;
create policy patient_anamnesis_insert_own
  on public.patient_anamnesis
  for insert
  to authenticated
  with check (paciente_id = auth.uid());

drop policy if exists patient_anamnesis_update_own on public.patient_anamnesis;
create policy patient_anamnesis_update_own
  on public.patient_anamnesis
  for update
  to authenticated
  using (paciente_id = auth.uid())
  with check (paciente_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-media',
  'patient-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists patient_media_upload_own on storage.objects;
create policy patient_media_upload_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'patient-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists patient_media_public_read on storage.objects;
create policy patient_media_public_read
  on storage.objects
  for select
  using (bucket_id = 'patient-media');
