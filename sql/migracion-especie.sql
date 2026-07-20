-- ==========================================================================
-- Migración: la columna `emoji` pasa a llamarse `especie`
-- --------------------------------------------------------------------------
-- La tabla se creó con la primera versión del esquema, cuando las flores eran
-- emojis. Ahora guarda la clave del catálogo dibujado ('lirio', 'peonia'…).
--
-- Ejecutar una sola vez en:  Supabase → SQL Editor → New query → Run
-- ==========================================================================

alter table public.flores rename column emoji to especie;
alter table public.flores alter column especie set default 'lirio';

-- Las notas que ya tuvieran un emoji guardado siguen viéndose: la app pinta
-- el valor tal cual cuando no está en el catálogo.
