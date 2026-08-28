delete from public.patient_pre_exams;
delete from public.patient_documents;
delete from public.clinic_patients;

insert into public.clinic_patients (full_name, email, phone, created_by)
values ('Eric', 'ericdelucass@gmail.com', null, null)
on conflict (email) do update
set
  full_name = excluded.full_name,
  phone = excluded.phone,
  updated_at = now();
