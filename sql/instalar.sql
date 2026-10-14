-- ==========================================================================
-- Jardín de notas — instalación y actualización, todo en uno
-- --------------------------------------------------------------------------
-- Pegar completo en:  Supabase → SQL Editor → New query → Run
--
-- Se puede ejecutar las veces que haga falta: comprueba antes de cambiar
-- nada, así que da igual si la base ya estaba a medio montar.
--
-- ANTES DE EJECUTAR: crea los DOS usuarios del jardín en
-- Authentication → Users → Add user, marcando "Auto Confirm User".
--
-- El script toma los dos correos MÁS ANTIGUOS y les da permiso de escribir:
-- sembrar notas, comentar y dar corazón. Si hubiera algún usuario más viejo
-- de una prueba anterior, bórralo antes o se quedará él con el sitio. Al
-- final se imprime `la_casa`: ahí se ve quiénes quedaron dentro.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. La tabla
-- --------------------------------------------------------------------------
create table if not exists public.flores (
  id         uuid primary key default gen_random_uuid(),
  texto      text         not null check (char_length(texto) between 1 and 2000),
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

-- Las notas admiten 2000 caracteres. El `create table` de arriba no toca una
-- tabla que ya existe, así que el tope viejo hay que cambiarlo a mano: se
-- quita el que hubiera sobre `texto` y se pone el nuevo.
do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.flores'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%char_length(texto)%'
  loop
    execute format('alter table public.flores drop constraint %I', c);
  end loop;

  alter table public.flores
    add constraint flores_texto_largo check (char_length(texto) between 1 and 2000);
end $$;

-- --------------------------------------------------------------------------
-- 2. Quién puede hacer qué
--    · cualquiera LEE      -> ella entra por el enlace, sin cuenta
--    · el JARDINERO siembra -> sembrar y arrancar notas es de uno solo
--    · la CASA comenta      -> los dos, en las notas y en los dibujos (2c y 2d)
--
--    Son dos permisos distintos a propósito: los dos escriben comentarios y
--    dan corazón, pero las flores las planta uno.
-- --------------------------------------------------------------------------
alter table public.flores enable row level security;

drop policy if exists "lectura publica"       on public.flores;
drop policy if exists "escritura del duenio"  on public.flores;
drop policy if exists "borrado del duenio"    on public.flores;
drop policy if exists "siembra la casa"       on public.flores;
drop policy if exists "arranca la casa"       on public.flores;
drop policy if exists "siembra el jardinero"  on public.flores;
drop policy if exists "arranca el jardinero"  on public.flores;

create policy "lectura publica"
  on public.flores for select
  to anon, authenticated
  using (true);

-- ¿QUIERES CAMBIAR QUIÉN SIEMBRA? Es el único sitio donde se dice: cambia el
-- correo de aquí y vuelve a ejecutar el script.
--
-- Va por correo y no por "el usuario más antiguo" a propósito: así no depende
-- del orden en que se crearon las cuentas, que es fácil de romper sin darse
-- cuenta al borrar y recrear un usuario.
create or replace function public.es_el_jardinero()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email' = 'pato@gmail.com', false);
$$;

revoke all on function public.es_el_jardinero() from public;
grant execute on function public.es_el_jardinero() to authenticated;

-- `es_de_la_casa()` —los dos— se define en la sección 2c, más abajo: la usan
-- los dibujos y los comentarios, no las flores.

do $$
begin
  if not exists (select 1 from auth.users) then
    raise exception
      'No hay ningún usuario todavía. Créalos en Authentication → Users y vuelve a ejecutar esto.';
  end if;
end $$;

create policy "siembra el jardinero"
  on public.flores for insert
  to authenticated
  with check (es_el_jardinero());

create policy "arranca el jardinero"
  on public.flores for delete
  to authenticated
  using (es_el_jardinero());

-- --------------------------------------------------------------------------
-- 2b. El corazón, por funciones: RETIRADO
--     Cuando ella entraba sin cuenta, el corazón se ponía con dar_corazon() y
--     dar_corazon_obra(), abiertas a `anon`: cualquiera con la clave pública
--     podía marcar notas y dibujos. Hoy los dos tienen cuenta y el corazón va
--     por la tabla `corazones` (sección 2d), firmado y con RLS. Se borran.
--     Ver SECURITY.md, punto 8.
-- --------------------------------------------------------------------------
drop function if exists public.dar_corazon(uuid);
drop function if exists public.dar_corazon_obra(uuid);

-- --------------------------------------------------------------------------
-- 2c. La galería de arte
--     Sus dibujos. Se ven sin cuenta, pero colgar, borrar y comentar piden la
--     sesión de la casa. Antes colgar estaba abierto a `anon` (para llegar a
--     la galería ya hay que entrar con usuario, pero la clave pública está en
--     el repo y un bot podía llenarla saltándose la app). SECURITY.md, punto 12.
-- --------------------------------------------------------------------------
create table if not exists public.obras (
  id          uuid primary key default gen_random_uuid(),
  titulo      text        not null check (char_length(titulo) between 1 and 120),
  descripcion text        check (char_length(descripcion) <= 2000),
  imagen      text        not null,
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

alter table public.obras add column if not exists corazon boolean not null default false;

-- Todos los dibujos van en marco polaroid, así que ya no hace falta guardar
-- cuál. La columna sólo tenía el nombre del marco: nada que perder.
alter table public.obras drop column if exists marco;

-- A sus dibujos se les da corazón y nada más: la nota escrita se quitó.
alter table public.obras drop column if exists comentario;

-- Las políticas no pueden mirar `auth.users` por su cuenta: esa tabla no la
-- lee un usuario normal. Esta función sí, y sólo contesta sí o no.
--
-- "La casa" son los dos usuarios más antiguos: los que comentan y dan
-- corazón. Sembrar flores es otra cosa y va por es_el_jardinero(), en la
-- sección 2.
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
  to authenticated
  with check (es_de_la_casa());

-- No hay política de UPDATE a propósito: a un dibujo colgado sólo se le da
-- corazón, y eso va por la tabla `corazones`. Nadie necesita poder cambiar
-- una fila entera.

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
-- 2d. Comentarios y corazones firmados
--     Los dos escriben, en las notas y en los dibujos, y en cada cosa queda
--     quién fue.
--
--     El autor NO lo decide el navegador: la política obliga a que la columna
--     `autor` sea el correo del que tiene la sesión abierta. Aunque alguien
--     trastee el JavaScript, no puede firmar como el otro.
--
--     ANTES DE EJECUTAR: los dos usuarios tienen que existir en
--     Authentication → Users (con "Auto Confirm User" marcado).
-- --------------------------------------------------------------------------
create table if not exists public.comentarios (
  id         uuid primary key default gen_random_uuid(),
  sobre      text        not null check (sobre in ('nota', 'obra')),
  objeto     uuid        not null,
  autor      text        not null,
  texto      text        not null check (char_length(texto) between 1 and 600),
  created_at timestamptz not null default now()
);

create index if not exists comentarios_objeto_idx
  on public.comentarios (sobre, objeto, created_at);

-- Un corazón por persona y por cosa: la clave primaria lo impide por sí sola,
-- así no hace falta comprobarlo desde la app.
create table if not exists public.corazones (
  sobre      text        not null check (sobre in ('nota', 'obra')),
  objeto     uuid        not null,
  autor      text        not null,
  created_at timestamptz not null default now(),
  primary key (sobre, objeto, autor)
);

alter table public.comentarios enable row level security;
alter table public.corazones   enable row level security;

drop policy if exists "comentarios a la vista"   on public.comentarios;
drop policy if exists "comenta la casa"          on public.comentarios;
drop policy if exists "borra su comentario"      on public.comentarios;
drop policy if exists "corazones a la vista"     on public.corazones;
drop policy if exists "da corazon la casa"       on public.corazones;
drop policy if exists "quita su corazon"         on public.corazones;

-- Sólo los lee la casa: la columna `autor` es el correo, y leídos sin
-- cuenta dejaban ver los dos correos a cualquiera. La app siempre los lee
-- con sesión (para llegar al jardín hay que entrar). SECURITY.md, punto 17.
create policy "comentarios a la vista"
  on public.comentarios for select to authenticated using (es_de_la_casa());

-- `autor = auth.jwt() ->> 'email'` es lo que hace fiable la firma.
create policy "comenta la casa"
  on public.comentarios for insert to authenticated
  with check (es_de_la_casa() and autor = auth.jwt() ->> 'email');

create policy "borra su comentario"
  on public.comentarios for delete to authenticated
  using (autor = auth.jwt() ->> 'email');

create policy "corazones a la vista"
  on public.corazones for select to authenticated using (es_de_la_casa());

create policy "da corazon la casa"
  on public.corazones for insert to authenticated
  with check (es_de_la_casa() and autor = auth.jwt() ->> 'email');

create policy "quita su corazon"
  on public.corazones for delete to authenticated
  using (autor = auth.jwt() ->> 'email');

-- Las columnas `corazon` de flores y obras siguen existiendo: el libro y la
-- rejilla las usan para pintar el ♥ sin tener que contar corazones. Este
-- disparador las mantiene al día solo, así nadie tiene que acordarse.
create or replace function public.sincronizar_corazon()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cual  text;
  quien uuid;
  hay   boolean;
begin
  -- En un trigger de DELETE la fila `new` no existe, y leerla revienta con
  -- "record new is not assigned yet". Hay que mirar TG_OP, no dar por hecho
  -- que una de las dos está.
  if tg_op = 'DELETE' then
    cual := old.sobre; quien := old.objeto;
  else
    cual := new.sobre; quien := new.objeto;
  end if;

  select exists (select 1 from public.corazones
                  where sobre = cual and objeto = quien) into hay;

  if cual = 'nota' then
    update public.flores set corazon = hay where id = quien;
  else
    update public.obras  set corazon = hay where id = quien;
  end if;
  return null;
end $$;

drop trigger if exists corazones_sincronizan on public.corazones;
create trigger corazones_sincronizan
  after insert or delete on public.corazones
  for each row execute function public.sincronizar_corazon();

-- Que los comentarios y los corazones del otro aparezcan sin recargar.
do $$
begin
  alter publication supabase_realtime add table public.comentarios;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.corazones;
exception when duplicate_object then null;
end $$;

-- --------------------------------------------------------------------------
-- 2e. Avisos al teléfono
--     Cada teléfono que encendió la campana deja aquí su dirección de push:
--     el `endpoint` (una URL de Apple o de Google) y las dos claves con las
--     que se le cifra el mensaje. api/avisar.js manda el aviso a los
--     teléfonos del OTRO: los de `autor` distinto de quien hizo la cosa.
--
--     Las direcciones sólo sirven con la clave privada de los avisos, que
--     vive en Vercel, así que verlas no deja mandar nada. Aun así sólo las ve
--     la casa: la función las lee con la sesión de quien llama.
-- --------------------------------------------------------------------------
create table if not exists public.avisos (
  endpoint   text primary key,
  autor      text        not null,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);

alter table public.avisos enable row level security;

drop policy if exists "avisos los ve la casa"       on public.avisos;
drop policy if exists "avisos los enciende cada uno" on public.avisos;
drop policy if exists "avisos los apaga la casa"     on public.avisos;

create policy "avisos los ve la casa"
  on public.avisos for select to authenticated
  using (es_de_la_casa());

-- Cada uno apunta su teléfono a su nombre, nunca al del otro.
create policy "avisos los enciende cada uno"
  on public.avisos for insert to authenticated
  with check (es_de_la_casa() and autor = auth.jwt() ->> 'email');

-- Borrar lo puede cualquiera de los dos: si ella entra en tu teléfono y
-- enciende la campana, la dirección pasa a su nombre (se borra y se crea), y
-- la función olvida sola los teléfonos que ya no existen.
create policy "avisos los apaga la casa"
  on public.avisos for delete to authenticated
  using (es_de_la_casa());

-- --------------------------------------------------------------------------
-- 3. Fotos de las notas
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notas', 'notas', true, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Estas fotos van dentro de las notas, así que las sube quien siembra: el
-- mismo permiso que la tabla flores. Si aquí pusiera es_de_la_casa(), el otro
-- podría subir archivos al bucket sin poder crear la nota que los usa.
drop policy if exists "fotos lectura publica"   on storage.objects;
drop policy if exists "fotos suben del duenio"  on storage.objects;
drop policy if exists "fotos borra el duenio"   on storage.objects;
drop policy if exists "fotos las sube la casa"  on storage.objects;
drop policy if exists "fotos las quita la casa" on storage.objects;
drop policy if exists "fotos las sube el jardinero"  on storage.objects;
drop policy if exists "fotos las quita el jardinero" on storage.objects;

create policy "fotos lectura publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'notas');

create policy "fotos las sube el jardinero"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'notas' and es_el_jardinero());

create policy "fotos las quita el jardinero"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'notas' and es_el_jardinero());

-- --------------------------------------------------------------------------
-- 3b. Los dibujos de la galería
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galeria', 'galeria', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "galeria a la vista"      on storage.objects;
drop policy if exists "galeria la cuelga la casa" on storage.objects;
drop policy if exists "galeria la quita la casa"  on storage.objects;

create policy "galeria a la vista"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'galeria');

create policy "galeria la cuelga la casa"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'galeria' and es_de_la_casa());

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
    where proname in ('es_de_la_casa', 'es_el_jardinero'))            as funciones,
  (select count(*) from pg_proc
    where proname in ('dar_corazon', 'dar_corazon_obra'))              as funciones_viejas,
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('comentarios', 'corazones'))                    as politicas_social,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'avisos')               as politicas_avisos,
  -- MIRA ESTO: son los dos correos que pueden sembrar, comentar y dar
  -- corazón. Si aquí no salen los dos que esperas, es que hay algún usuario
  -- más antiguo de por medio: bórralo en Authentication → Users.
  (select string_agg(email, ', ' order by created_at)
     from (select email, created_at from auth.users
            order by created_at limit 2) c)                             as la_casa,
  (select count(*) from auth.users)                                     as usuarios_totales;
