-- ==========================================================================
-- Jardín de notas — esquema Supabase
-- Pegar completo en:  Supabase → SQL Editor → New query → Run
-- ==========================================================================

create table if not exists public.flores (
  id         uuid primary key default gen_random_uuid(),
  texto      text        not null check (char_length(texto) between 1 and 1000),
  especie    text        not null default 'lirio',  -- clave del catálogo SVG
  hue        int         not null default 0 check (hue between 0 and 360),
  x          numeric(5,2) not null check (x between 0 and 100),
  y          numeric(5,2) not null check (y between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists flores_created_at_idx on public.flores (created_at);

-- --------------------------------------------------------------------------
-- Seguridad a nivel de fila
--   · cualquiera (anon) PUEDE LEER  -> ella entra por el enlace, sin cuenta
--   · solo usuarios autenticados PUEDEN escribir/borrar -> el portal
-- --------------------------------------------------------------------------
alter table public.flores enable row level security;

drop policy if exists "lectura publica"      on public.flores;
drop policy if exists "escritura del duenio" on public.flores;
drop policy if exists "borrado del duenio"   on public.flores;

create policy "lectura publica"
  on public.flores for select
  to anon, authenticated
  using (true);

create policy "escritura del duenio"
  on public.flores for insert
  to authenticated
  with check (true);

create policy "borrado del duenio"
  on public.flores for delete
  to authenticated
  using (true);

-- --------------------------------------------------------------------------
-- Tiempo real: publicar la tabla para que los clientes reciban los cambios
-- --------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.flores;
exception
  when duplicate_object then null;
end $$;
