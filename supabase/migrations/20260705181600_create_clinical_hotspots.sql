create table if not exists public.clinical_hotspots (
  id text primary key,
  label text not null,
  region text,
  position float8[] not null check (array_length(position, 1) = 3),
  video_url text,
  updated_at timestamp with time zone not null default now()
);

insert into public.clinical_hotspots (id, label, region, position, video_url)
values
  ('ombro_d', 'Ombro Direito', 'Membros Superiores', array[0.37, 1.62, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('ombro_e', 'Ombro Esquerdo', 'Membros Superiores', array[-0.37, 1.62, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('cotovelo_d', 'Cotovelo Direito', 'Membros Superiores', array[0.63, 1.22, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('cotovelo_e', 'Cotovelo Esquerdo', 'Membros Superiores', array[-0.63, 1.22, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('punho_d', 'Punho Direito', 'Membros Superiores', array[0.71, 0.79, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('punho_e', 'Punho Esquerdo', 'Membros Superiores', array[-0.71, 0.79, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('coluna_cervical', 'Coluna Cervical', 'Coluna', array[0.0, 1.79, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('coluna_lombar', 'Coluna Lombar', 'Coluna', array[0.0, 1.01, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('quadril_d', 'Quadril Direito', 'Membros Inferiores', array[0.19, 0.64, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('quadril_e', 'Quadril Esquerdo', 'Membros Inferiores', array[-0.19, 0.64, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('joelho_d', 'Joelho Direito', 'Membros Inferiores', array[0.25, 0.03, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('joelho_e', 'Joelho Esquerdo', 'Membros Inferiores', array[-0.25, 0.03, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('tornozelo_d', 'Tornozelo Direito', 'Membros Inferiores', array[0.26, -0.66, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('tornozelo_e', 'Tornozelo Esquerdo', 'Membros Inferiores', array[-0.26, -0.66, 0.0]::float8[], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
on conflict (id) do update set
  label = excluded.label,
  region = excluded.region,
  position = excluded.position,
  video_url = excluded.video_url,
  updated_at = now();
