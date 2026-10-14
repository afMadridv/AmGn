# Seguridad del jardín

Lista de control de seguridad aplicada a este proyecto. El jardín **sí** tiene
servidor (funciones de Vercel en `api/`), base de datos (Supabase) y usuarios
(`pato@gmail.com` y `patico@gmail.com`), así que los 20 puntos cuentan.

Estados: **Cumple** · **Parcial** · **Falta** · **No aplica**.

> Los cambios de base (puntos 8, 12, 16 y 17) están en `sql/instalar.sql` y
> entran en vigor al ejecutarlo en Supabase → SQL Editor.

| # | Punto | Estado |
|---|-------|--------|
| 1 | Ocultar API keys | Cumple |
| 2 | Eliminar secretos de Git | Parcial |
| 3 | Key pública para DB | Cumple |
| 4 | Row-Level Security | Cumple |
| 5 | Encriptar datos sensibles | Parcial |
| 6 | Forzar la autenticación | Cumple |
| 7 | Restringir el acceso a registros | Cumple |
| 8 | Bloquear manipulación de campos | Cumple |
| 9 | Proteger session cookies | Parcial |
| 10 | Hashear contraseñas | Cumple |
| 11 | Rate limiting | Cumple |
| 12 | Protección contra bots | Parcial |
| 13 | Parametrizar queries | Cumple |
| 14 | Validar inputs | Cumple |
| 15 | Sanitizar contenido | Cumple |
| 16 | Restringir archivos | Parcial |
| 17 | Devolver solo datos necesarios | Cumple |
| 18 | Security headers | Cumple |
| 19 | Forzar HTTPS | Cumple |
| 20 | Escanear dependencias | Cumple |

---

## 1. Ocultar API keys — Cumple

Claves fuera del código del navegador, en variables de entorno del servidor.

- `VAPID_PRIVATE_KEY` (avisos al teléfono) vive en Vercel → Environment
  Variables, tipo *Secret*. Sólo la lee `api/avisar.js`; la clave pública se
  deriva de ella en el servidor.
- `YOUTUBE_API_KEY` (opcional) iría igual, sólo la lee `api/youtube.js`.
- Lo que hay en `js/config.js` (URL de Supabase y clave *publishable*) es
  público por diseño: ver punto 3.

## 2. Eliminar secretos de Git — Parcial

Ninguna clave en commits ni en historial; `.env` en `.gitignore`.

- `.env` y `.env.*` están en `.gitignore`.
- Ninguna clave de servidor (`service_role`, VAPID privada, YouTube) se ha
  subido nunca.
- **Pendiente:** el historial conserva la antigua llave del jardín
  (`ACCESO_JARDIN`, quitada de `js/config.js`), cuya contraseña coincide con
  la actual de `patico@gmail.com`. El repo es público. Solución: **cambiar la
  contraseña de `patico@gmail.com`** en Supabase → Authentication → Users.
  Reescribir el historial no basta, porque ya pudo copiarse.

## 3. Key pública para DB — Cumple

El frontend sólo usa la clave pública de Supabase (`sb_publishable_…`, el
equivalente a `anon`). La `service_role` no aparece en el código ni en Vercel:
ni siquiera `api/avisar.js` la usa, entra con la sesión de quien llama.

## 4. Row-Level Security — Cumple

Todas las tablas tienen RLS (`sql/instalar.sql`). El jardín es compartido a
propósito, así que la regla no es "cada uno sus filas" sino:

- `flores`: lectura pública; sembrar y arrancar sólo `es_el_jardinero()`.
- `comentarios` / `corazones`: escribe `es_de_la_casa()` y sólo a su nombre
  (`autor = auth.jwt() ->> 'email'`); cada uno borra sólo lo suyo.
- `obras`: borrar sólo la casa (ver punto 12 sobre colgar).
- `avisos`: sólo la casa los ve; cada uno los crea a su nombre.

## 5. Encriptar datos sensibles — Parcial

- Supabase cifra la base y el Storage en reposo (AES-256) y todo viaja por
  HTTPS.
- No hay cifrado por campo: las notas y las fotos son legibles para quien
  tenga acceso a la base y, por diseño, el jardín se lee sin cuenta.
- Las fotos de los buckets `notas` y `galeria` son públicas: quien tenga la
  URL las ve.

## 6. Forzar la autenticación — Cumple

La sesión la comprueba el servidor, no la pantalla:

- Cada escritura pasa por RLS con el JWT de Supabase.
- `api/avisar.js` exige `Authorization: Bearer`, valida el token contra
  `/auth/v1/user` y responde 401 si no vale.
- `api/playlist.js` y `api/youtube.js` son públicas a propósito: no tocan
  datos del jardín.

## 7. Restringir el acceso a registros — Cumple

- RLS decide qué filas toca cada uno.
- `api/avisar.js` lee el registro con la sesión de quien llama y comprueba
  que el comentario o el corazón sean suyos (`c.autor !== correo`) y
  recientes antes de avisar.

## 8. Bloquear manipulación de campos — Cumple

- `autor` no lo decide el cliente: la política exige que sea el correo del
  JWT.
- No hay políticas de `UPDATE` en ninguna tabla: nadie puede reescribir una
  fila entera.
- `dar_corazon()` y `dar_corazon_obra()`, que dejaban poner `corazon = true`
  sin cuenta, se borraron (sección 2b del SQL). El corazón va por la tabla
  `corazones`, firmado; la columna `corazon` sólo la toca el disparador
  `sincronizar_corazon`.

## 9. Proteger session cookies — Parcial

- Supabase guarda la sesión en el navegador, no en cookies, así que
  `HttpOnly` no se puede aplicar.
- Sin "Mantener sesión", la sesión vive sólo en memoria y muere al cerrar.
  Con la casilla marcada va a `localStorage`, y un XSS podría leerla: lo
  frena la CSP (punto 18) y el escapado (punto 15).

## 10. Hashear contraseñas — Cumple

Las contraseñas las guarda Supabase Auth con bcrypt. El proyecto nunca las
almacena ni las ve.

## 11. Rate limiting — Cumple

- Supabase Auth limita los intentos de login y de emails.
- `api/youtube.js` y `api/playlist.js` se cachean en la CDN (1 día y 5 min),
  lo que frena repetir la misma petición, pero no hay límite por IP.
- `api/avisar.js` exige sesión y sólo avisa de cosas recientes y reales;
  repetir una llamada sustituye el mismo aviso (`tag`), no lo multiplica.
- Las tres funciones pasan por `api/_limite.js`: límite por IP y minuto
  (`avisar` 30, `playlist` 30, `youtube` 60), con `429` y `Retry-After`. Va
  en memoria por instancia: frena bucles y scripts, no un ataque distribuido.
  Para eso, Vercel → Firewall → Rate Limiting.

## 12. Protección contra bots — Parcial

- Ya no queda ningún formulario que escriba sin cuenta: colgar en la galería
  (tabla `obras` y bucket `galeria`) pide `es_de_la_casa()`. La app lo
  comprueba antes de subir la imagen.
- El único formulario público es el de entrar, y Supabase Auth limita los
  intentos.
- Mejora posible: Turnstile en Supabase → Authentication → Attack
  Protection.

## 13. Parametrizar queries — Cumple

- No hay SQL armado con texto: todo va por `supabase-js` / PostgREST.
- `api/avisar.js` arma filtros de PostgREST sólo con UUID validados por regex
  y `encodeURIComponent`.
- Las funciones de `sql/instalar.sql` usan parámetros, no `EXECUTE` con texto.

## 14. Validar inputs — Cumple

- En la base: `check` de longitud en notas, títulos, descripciones y
  comentarios (`1..600`), `sobre in ('nota','obra')`.
- En el servidor: `api/avisar.js` valida `tipo` y UUID; `api/youtube.js`
  corta la búsqueda a 200 caracteres; `api/playlist.js` deja sólo
  `[A-Za-z0-9]` en el id.

## 15. Sanitizar contenido — Cumple

Nada de lo que escribe el usuario entra como HTML: o va por `textContent`, o
pasa por `Jardin.escapar()` antes de un `innerHTML` (comentarios, notas,
títulos, nombres de canciones). El cuerpo de los avisos lo pinta el sistema
como texto plano.

## 16. Restringir archivos — Parcial

- Buckets con límite de tamaño (`notas` 8 MB, `galeria` 10 MB) y sólo
  `image/jpeg`, `image/png`, `image/webp` e `image/gif`. SVG ya no entra.
- El teléfono abre cada imagen y la vuelve a codificar antes de subirla:
  lo que no se pueda decodificar como imagen no se sube, y lo que sale es
  siempre JPEG, WebP o PNG (un GIF pequeño va tal cual).
- Queda: el tipo lo declara quien sube. Sin servidor propio delante de
  Storage no se revisa el contenido en el servidor; el riesgo es bajo porque
  las imágenes se sirven desde el dominio de Supabase, otro origen.

## 17. Devolver solo datos necesarios — Cumple

- `api/avisar.js` sólo devuelve cuántos avisos salieron.
- `api/youtube.js` devuelve id, título y duración; `api/playlist.js` sólo
  título, artista y duración.
- `comentarios` y `corazones` llevan el correo en `autor`. Antes se leían sin
  cuenta; ahora sólo los lee la casa (`es_de_la_casa()`). La app siempre los
  lee con sesión, y el tiempo real recibe el token al entrar.

## 18. Security headers — Cumple

`vercel.json` pone en todas las rutas: `Content-Security-Policy`,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` y
`Cross-Origin-Opener-Policy`. Vercel añade
`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.

- Mejora posible: la CSP lleva `'unsafe-eval'`; comprobar si algo lo sigue
  necesitando y quitarlo.

## 19. Forzar HTTPS — Cumple

Vercel redirige `http://` a `https://` (308) y manda HSTS con `preload`.

## 20. Escanear dependencias — Cumple

- No hay `package.json` ni `node_modules`: las funciones usan sólo módulos de
  Node, así que `npm audit` y Dependabot no tienen qué revisar.
- La única librería de terceros es `@supabase/supabase-js@2.45.4` desde
  jsDelivr, con versión fija.
- El `<script>` lleva `integrity` (SRI, sha384): si el archivo del CDN
  cambiara, el navegador no lo ejecuta. Al subir de versión hay que
  recalcular el hash (el comando está junto al `<script>` en `index.html`).
- Revisar de vez en cuando si hay versión nueva con parches.

---

## Pendientes

1. Cambiar la contraseña de `patico@gmail.com` (punto 2). Sólo se hace en
   Supabase → Authentication → Users.
2. Ejecutar `sql/instalar.sql` en Supabase para que entren los cambios de
   base (puntos 8, 12, 16 y 17).
3. Opcional: Rate Limiting en el Firewall de Vercel (punto 11), Turnstile en
   Supabase Auth (punto 12) y quitar `'unsafe-eval'` de la CSP (punto 18).
