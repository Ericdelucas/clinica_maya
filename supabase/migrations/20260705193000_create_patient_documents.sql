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

create table if not exists public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  paciente_id text,
  notes text,
  file_url text not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists patient_documents_paciente_id_idx
  on public.patient_documents (paciente_id);

create index if not exists patient_documents_created_at_idx
  on public.patient_documents (created_at desc);

alter table public.patient_documents enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'patient_documents'
      and policyname = 'patient_documents_insert'
  ) then
    create policy patient_documents_insert
      on public.patient_documents
      for insert
      with check (paciente_id is null or paciente_id = auth.uid()::text);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'patient_documents'
      and policyname = 'patient_documents_read_own_or_professional'
  ) then
    create policy patient_documents_read_own_or_professional
      on public.patient_documents
      for select
      using (
        paciente_id = auth.uid()::text
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role in ('admin', 'profissional')
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'patient_documents_upload'
  ) then
    create policy patient_documents_upload
      on storage.objects
      for insert
      with check (bucket_id = 'patient-documents');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'patient_documents_public_read'
  ) then
    create policy patient_documents_public_read
      on storage.objects
      for select
      using (bucket_id = 'patient-documents');
  end if;
end $$;
