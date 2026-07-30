# Cerebro del jardín

Lo que es el proyecto, lo que se decidió y por qué, y las trampas que ya
costaron tiempo. Punto de partida para retomarlo.

## Qué es

Regalo web para Gabriela. Portada con ramo de lirios → jardín con patico. Cada
flor es una nota que él siembra desde un portal escondido y a ella le brota en
vivo. Además: galería de sus dibujos, música de Spotify y ciclo día/noche.
HTML, CSS y JS puro, sin framework. Supabase de base de datos. **Vercel**
(antes Netlify, migrado en `8e8b0cc`). Repo `afMadridv/AmGn`.

## Montarlo de cero

1. Supabase → Authentication → Users → Add user (marca *Auto Confirm*). El
   **más antiguo** manda: el script le da a él los permisos. Apagar
   *Enable Sign Ups*.
2. SQL Editor → pegar `sql/instalar.sql` **entero** → Run. Al final imprime una
   fila con columnas, políticas y dueño: si sale, quedó bien.
3. URL y clave `anon` en `js/config.js` (nunca la `service_role`).
4. Vercel conectado al repo. Sin funciones, la música cae al modo simple.

## Quién puede qué

- **Ella** entra por el enlace, sin cuenta: lee notas, da corazón, cuelga dibujos.
- **Él** entra por el portal (esquina inferior derecha) con usuario de Supabase:
  siembra notas, comenta dibujos, borra.
- Su sesión **no persiste** a propósito (`4a5f4e5`): si le presta el móvil, el
  portal vuelve a pedir contraseña.
- Lo que ella puede hacer sin cuenta va por funciones `security definer`
  (`dar_corazon`, `dar_corazon_obra`), no por `UPDATE` abierto: así no puede
  tocar nada más.

## Decisiones que no son obvias

- **Flores en vector, rasterizadas a `<img>` y cacheadas** (`js/flores-svg.js`).
  Veinte flores en SVG vivo son miles de nodos animados y el móvil se arrastra.
- **35 flores por campo**, luego otro campo. Sólo se dibuja el visible.
- **El corazón se da una vez y no se quita.** En las notas ella se lo da a él;
  en la galería, él a ella.
- **Marco polaroid fijo.** Hubo ocho marcos y luego dos; sobraban.
- **`sql/instalar.sql` es uno solo e idempotente.** Correrlo de nuevo es la
  respuesta a casi todo. Nunca pegar varios SQL seguidos: el editor los mete en
  una transacción y un fallo deshace lo anterior.

## Trampas que ya mordieron

- **Un borrado que el RLS rechaza no da error**, devuelve cero filas. Hay que
  mirar `.select()` y avisar, o la app miente (`8e8b0cc`).
- **La API de Spotify usa `eval()`** y carga un script de `embed-cdn.spotifycdn.com`.
  Sin ambos en la CSP, la música se queda en «cargando…».
- **Spotify no avisa del final de una canción**: el cursor se clava; el salto va
  por temporizador. Y su lista no se puede leer desde el navegador (CORS): la
  sirve `api/playlist.js` desde el servidor, sin claves.
- **El zoom deformaba la escena** porque mezcla px con `vw`. Se compensa con
  `--zoom` y un `scale` (`1da87d0`).
- **`requestAnimationFrame` no dispara con la pestaña oculta**: los modales se
  quedaban invisibles. Se fuerza un reflow.
- **`vercel.json` no admite claves de comentario** (`"//"`): el build falla
  entero y el sitio se queda en el commit anterior sin avisar.
- **`.campo` chocaba** entre el suelo del jardín y los campos de formulario. Y
  al pintar texto de fuera en `innerHTML`, **escapar siempre**.

## Estado y pendientes

- Tras desplegar, comprobar que `/api/playlist?id=…` da 200 y llega la CSP.
- **El repo es público y lleva la clave anon.** Ponerlo privado cierra el único
  hueco real: que un desconocido cuelgue un dibujo.
- En local: `?demo=1` usa localStorage; `?hora=22` fuerza la hora.
