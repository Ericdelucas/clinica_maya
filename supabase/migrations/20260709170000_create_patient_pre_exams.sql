create table if not exists public.patient_pre_exams (
  id uuid primary key default gen_random_uuid(),
  paciente_id text not null,
  answers jsonb not null default '{}'::jsonb,
  document_url text,
  created_at timestamp with time zone not null default now()
);

create index if not exists patient_pre_exams_paciente_id_idx
  on public.patient_pre_exams (paciente_id);

create index if not exists patient_pre_exams_created_at_idx
  on public.patient_pre_exams (created_at desc);

alter table public.patient_pre_exams enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'patient_pre_exams'
      and policyname = 'patient_pre_exams_insert_own'
  ) then
    create policy patient_pre_exams_insert_own
      on public.patient_pre_exams
      for insert
      with check (paciente_id = auth.uid()::text);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'patient_pre_exams'
      and policyname = 'patient_pre_exams_read_own_or_professional'
  ) then
    create policy patient_pre_exams_read_own_or_professional
      on public.patient_pre_exams
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
