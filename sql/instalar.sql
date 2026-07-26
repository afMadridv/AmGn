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
-- 2c. La galería de arte
--     Sus dibujos. Cualquiera que tenga el enlace los ve Y los cuelga, sin
--     cuenta: el enlace es de ella y sólo ella lo tiene, así que pedirle una
--     contraseña para dibujar en su propia galería sobra.
--
--     Lo que sí queda cerrado es BORRAR y COMENTAR, que piden tu sesión. Así,
--     si el enlace se le escapara a alguien, lo peor que podría hacer es
--     colgar algo —que tú quitas en dos toques—, nunca vaciarle la galería.
--
--     OJO: la clave pública está en el repo de GitHub. Si el repo es público,
--     cualquiera que lo encuentre puede colgar dibujos. Ponlo en privado
--     (Settings → General → Change visibility) y esto deja de ser un problema.
-- --------------------------------------------------------------------------
create table if not exists public.obras (
  id          uuid primary key default gen_random_uuid(),
  titulo      text        not null check (char_length(titulo) between 1 and 120),
  descripcion text        check (char_length(descripcion) <= 2000),
  imagen      text        not null,
  marco       text        not null default 'polaroid', -- el marco que ella elige
  comentario  text        check (char_length(comentario) <= 600),  -- lo que le dice su fan
  corazon     boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists obras_created_at_idx on public.obras (created_at);

-- La primera versión llamaba `favorito` al corazón. Se renombra sólo si hace
-- falta, para que este archivo se pueda ejecutar las veces que sea.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'obras'
               and column_name = 'favorito')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'obras'
               and column_name = 'corazon')
  then
    alter table public.obras rename column favorito to corazon;
  end if;
end $$;

alter table public.obras add column if not exists marco   text    not null default 'polaroid';
alter table public.obras add column if not exists corazon boolean not null default false;
alter table public.obras alter column marco set default 'polaroid';

-- Los marcos quedaron en dos: polaroid y cinta. Lo que se colgara con alguno
-- de los que ya no están se pasa al más parecido.
update public.obras set marco = 'cinta'    where marco = 'washi';
update public.obras set marco = 'polaroid' where marco not in ('polaroid', 'cinta');

-- El corazón de sus dibujos, igual que el de las notas: se da una vez y no se
-- puede quitar. Va por función para no tener que abrirle un UPDATE a nadie.
create or replace function public.dar_corazon_obra(obra_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.obras set corazon = true where id = obra_id;
$$;

revoke all on function public.dar_corazon_obra(uuid) from public;
grant execute on function public.dar_corazon_obra(uuid) to anon, authenticated;

-- Las políticas no pueden mirar `auth.users` por su cuenta: esa tabla no la
-- lee un usuario normal. Esta función sí, y sólo contesta sí o no.
create or replace function public.es_de_la_casa()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select coalesce(
    (auth.jwt() ->> 'email') in (select email from auth.users order by created_at limit 2),
    false
  );
$$;

revoke all on function public.es_de_la_casa() from public;
grant execute on function public.es_de_la_casa() to authenticated;

alter table public.obras enable row level security;

drop policy if exists "arte a la vista"   on public.obras;
drop policy if exists "arte lo cuelga la casa" on public.obras;
drop policy if exists "arte lo retoca la casa" on public.obras;
drop policy if exists "arte lo quita la casa"  on public.obras;

create policy "arte a la vista"
  on public.obras for select
  to anon, authenticated
  using (true);

create policy "arte lo cuelga la casa"
  on public.obras for insert
  to anon, authenticated
  with check (true);

create policy "arte lo retoca la casa"
  on public.obras for update
  to authenticated
  using (es_de_la_casa())
  with check (es_de_la_casa());

create policy "arte lo quita la casa"
  on public.obras for delete
  to authenticated
  using (es_de_la_casa());

do $$
begin
  alter publication supabase_realtime add table public.obras;
exception
  when duplicate_object then null;
end $$;

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
-- 3b. Los dibujos de la galería
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galeria', 'galeria', true, 10485760,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "galeria a la vista"      on storage.objects;
drop policy if exists "galeria la cuelga la casa" on storage.objects;
drop policy if exists "galeria la quita la casa"  on storage.objects;

create policy "galeria a la vista"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'galeria');

create policy "galeria la cuelga la casa"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'galeria');

create policy "galeria la quita la casa"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'galeria' and es_de_la_casa());

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
  (select public from storage.buckets where id = 'notas')               as bucket_notas,
  (select public from storage.buckets where id = 'galeria')             as bucket_galeria,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'obras')                as politicas_galeria,
  (select count(*) from auth.users)                                     as usuarios,
  (select count(*) from pg_proc
    where proname in ('dar_corazon', 'dar_corazon_obra', 'es_de_la_casa'))as funciones,
  (select email from auth.users order by created_at limit 1)            as duenio;
