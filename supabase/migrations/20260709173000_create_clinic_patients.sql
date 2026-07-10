create table if not exists public.clinic_patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists clinic_patients_email_idx
  on public.clinic_patients (email);

alter table public.clinic_patients enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clinic_patients'
      and policyname = 'clinic_patients_professional_select'
  ) then
    create policy clinic_patients_professional_select
      on public.clinic_patients
      for select
      using (
        exists (
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
    where schemaname = 'public'
      and tablename = 'clinic_patients'
      and policyname = 'clinic_patients_professional_insert'
  ) then
    create policy clinic_patients_professional_insert
      on public.clinic_patients
      for insert
      with check (
        exists (
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
    where schemaname = 'public'
      and tablename = 'clinic_patients'
      and policyname = 'clinic_patients_professional_delete'
  ) then
    create policy clinic_patients_professional_delete
      on public.clinic_patients
      for delete
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role in ('admin', 'profissional')
        )
      );
  end if;
end $$;

alter table public.patient_documents
  add column if not exists patient_email text;

create index if not exists patient_documents_patient_email_idx
  on public.patient_documents (patient_email);

alter table public.patient_pre_exams
  add column if not exists patient_email text;

create index if not exists patient_pre_exams_patient_email_idx
  on public.patient_pre_exams (patient_email);
