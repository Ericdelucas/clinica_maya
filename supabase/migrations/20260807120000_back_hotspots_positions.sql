-- Reposiciona hotspots da coluna para a superfície das costas (z negativo)

insert into public.clinical_hotspots (id, label, region, position, video_url)
values
  ('coluna_cervical', 'Costas altas / Cervical', 'Coluna', array[0.0, 1.40, -0.148]::float8[], ''),
  ('coluna_lombar', 'Costas baixas / Lombar', 'Coluna', array[0.0, 0.95, -0.108]::float8[], '')
on conflict (id) do update set
  label = excluded.label,
  region = excluded.region,
  position = excluded.position,
  updated_at = now();