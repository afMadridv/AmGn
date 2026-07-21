-- ==========================================================================
-- Jardín de notas — instalación y actualización, todo en uno
-- --------------------------------------------------------------------------
-- Pegar completo en:  Supabase → SQL Editor → New query → Run
--
-- Se puede ejecutar las veces que haga falta: comprueba antes de cambiar
-- nada, así que da igual si la base ya estaba a medio montar.
--
-- ANTES DE EJECUTAR: crea tu usuario en Authentication → Users → Add user
-- (marca "Auto Confirm User"). Este script toma ese correo para darle a él, y
-- sólo a él, permiso de escribir en el jardín.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. La tabla
-- --------------------------------------------------------------------------
create table if not exists public.flores (
  id         uuid primary key default gen_random_uuid(),
  texto      text         not null check (char_length(texto) between 1 and 1000),
  especie    text         not null default 'lirio',
  hue        int          not null default 0 check (hue between 0 and 360),
  foto       text,
  corazon    boolean      not null default false,
  x          numeric(5,2) not null check (x between 0 and 100),
  y          numeric(5,2) not null check (y between 0 and 100),
  created_at timestamptz  not null default now()
);

create index if not exists flores_created_at_idx on public.flores (created_at);

-- La primera versión llamaba `emoji` a la columna de la flor. Se renombra
-- sólo si hace falta: si ya se hizo, este bloque no toca nada.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'flores'
               and column_name = 'emoji')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'flores'
               and column_name = 'especie')
  then
    alter table public.flores rename column emoji to especie;
  end if;
end $$;

alter table public.flores alter column especie set default 'lirio';
alter table public.flores add column if not exists foto text;
alter table public.flores add column if not exists corazon boolean not null default false;

-- --------------------------------------------------------------------------
-- 2. Quién puede hacer qué
--    · cualquiera LEE   -> ella entra por el enlace, sin cuenta
--    · sólo tú ESCRIBES -> se comprueba el correo, no basta con tener cuenta
-- --------------------------------------------------------------------------
alter table public.flores enable row level security;

drop policy if exists "lectura publica"      on public.flores;
drop policy if exists "escritura del duenio" on public.flores;
drop policy if exists "borrado del duenio"   on public.flores;

create policy "lectura publica"
  on public.flores for select
  to anon, authenticated
  using (true);

-- El correo se toma del usuario más antiguo de Authentication → Users y se
-- graba dentro de la política. Si algún día creas otro usuario, vuelve a
-- ejecutar este script sólo si quieres cambiar de dueño.
do $$
declare
  duenio text;
begin
  select email into duenio from auth.users order by created_at limit 1;

  if duenio is null then
    raise exception
      'No hay ningún usuario todavía. Créalo en Authentication → Users y vuelve a ejecutar esto.';
  end if;

  execute format(
    'create policy "escritura del duenio" on public.flores for insert
       to authenticated with check (auth.jwt() ->> ''email'' = %L)', duenio);

  execute format(
    'create policy "borrado del duenio" on public.flores for delete
       to authenticated using (auth.jwt() ->> ''email'' = %L)', duenio);

  raise notice 'Dueño del jardín: %', duenio;
end $$;

-- --------------------------------------------------------------------------
-- 2b. El corazón de ella
--     Ella entra sin cuenta, así que no puede escribir en la tabla. En vez de
--     abrirle un UPDATE (con el que podría borrar el texto de una nota), se
--     le da una función que sólo sabe hacer una cosa: poner el corazón. No
--     puede quitarlo ni tocar nada más.
-- --------------------------------------------------------------------------
create or replace function public.dar_corazon(flor_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.flores set corazon = true where id = flor_id;
$$;

revoke all on function public.dar_corazon(uuid) from public;
grant execute on function public.dar_corazon(uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Fotos de las notas
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notas', 'notas', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "fotos lectura publica"  on storage.objects;
drop policy if exists "fotos suben del duenio" on storage.objects;
drop policy if exists "fotos borra el duenio"  on storage.objects;

create policy "fotos lectura publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'notas');

do $$
declare
  duenio text;
begin
  select email into duenio from auth.users order by created_at limit 1;

  execute format(
    'create policy "fotos suben del duenio" on storage.objects for insert
       to authenticated with check (bucket_id = ''notas''
         and auth.jwt() ->> ''email'' = %L)', duenio);

  execute format(
    'create policy "fotos borra el duenio" on storage.objects for delete
       to authenticated using (bucket_id = ''notas''
         and auth.jwt() ->> ''email'' = %L)', duenio);
end $$;

-- --------------------------------------------------------------------------
-- 4. Tiempo real
-- --------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.flores;
exception
  when duplicate_object then null;
end $$;

-- --------------------------------------------------------------------------
-- 5. Comprobación: si esto sale, quedó bien
-- --------------------------------------------------------------------------
select
  (select string_agg(column_name, ', ' order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public' and table_name = 'flores')            as columnas,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'flores')               as politicas_jardin,
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'fotos%')                                     as politicas_fotos,
  (select public from storage.buckets where id = 'notas')               as bucket_publico,
  (select count(*) from pg_proc where proname = 'dar_corazon')          as funcion_corazon,
  (select email from auth.users order by created_at limit 1)            as duenio;
