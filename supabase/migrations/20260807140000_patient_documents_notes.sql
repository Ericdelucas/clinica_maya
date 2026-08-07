-- Observação da profissional + metadados de arquivo nos exames

alter table public.patient_documents
  add column if not exists professional_note text;

alter table public.patient_documents
  add column if not exists file_name text;

alter table public.patient_documents
  add column if not exists file_type text;

drop policy if exists patient_documents_update_admin on public.patient_documents;
create policy patient_documents_update_admin
  on public.patient_documents
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

drop policy if exists patient_documents_delete_admin on public.patient_documents;
create policy patient_documents_delete_admin
  on public.patient_documents
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
