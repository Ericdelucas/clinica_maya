-- Realtime para o paciente ver o vídeo assim que a profissional salvar
alter table public.clinical_hotspots replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.clinical_hotspots;
exception
  when duplicate_object then
    null;
end $$;
