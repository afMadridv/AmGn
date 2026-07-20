-- ==========================================================================
-- Blindar la escritura: solo el dueño del portal puede sembrar y borrar
-- --------------------------------------------------------------------------
-- Las políticas originales daban permiso a cualquier usuario `authenticated`.
-- Como la clave pública está en el repo, si el registro por correo queda
-- abierto cualquiera podría crearse una cuenta y escribir en el jardín.
-- Estas políticas comprueban además QUIÉN es.
--
-- 1. Cambia TU_CORREO@EJEMPLO.COM por el correo de tu usuario del portal.
-- 2. Ejecuta en:  Supabase → SQL Editor → New query → Run
-- 3. Y apaga los registros en: Authentication → Sign In / Providers → Email
--    → Enable Sign Ups (off).
-- ==========================================================================

drop policy if exists "escritura del duenio" on public.flores;
drop policy if exists "borrado del duenio"   on public.flores;

create policy "escritura del duenio"
  on public.flores for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = 'TU_CORREO@EJEMPLO.COM');

create policy "borrado del duenio"
  on public.flores for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'TU_CORREO@EJEMPLO.COM');

-- La lectura sigue siendo pública: ella entra por el enlace, sin cuenta.
