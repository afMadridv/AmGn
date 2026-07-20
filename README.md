# Jardín de notas 🌱

Regalo web: portada con ramo de lirios animado → jardín con patico → flores que
son notas. Tú siembras desde tu celular por un portal escondido; a ella le
brota la flor **en vivo**, sin recargar.

HTML + CSS + JS puro. Supabase solo como base de datos en tiempo real.

```
index.html
css/estilos.css
js/config.js       <- credenciales y colores
js/flores-svg.js   <- ramo y catálogo de 15 flores, dibujadas a mano en vector
js/datos.js        <- Supabase (tiempo real + auth) o localStorage
js/app.js          <- interfaz
sql/schema.sql     <- tabla + RLS + realtime
```

Nada de emojis. Las 15 especies —rosa, tulipán, clavel, peonía, girasol,
orquídea, lirio, alstroemeria, margarita, jacinto, amarilis, camelia, gardenia,
ranúnculo y gladiolo— están dibujadas en vector, cada una con su estructura:
capas concéntricas en la rosa, borde dentado en el clavel, espiga en el jacinto
y el gladiolo, labelo en la orquídea, copa lateral en el tulipán.

Al pintarlas se rasterizan una vez a imagen y se cachean por especie y color:
un jardín de veinte flores en SVG vivo son miles de nodos animados y el móvil
se arrastra.

Abre `muestrario.html` para verlas todas de golpe.

## Puesta en marcha (10 min)

### 1. Base de datos
Supabase → **SQL Editor** → pegar `sql/schema.sql` → **Run**.

### 2. Tu usuario del portal
Supabase → **Authentication → Users → Add user**: correo + contraseña, y marca
*Auto Confirm User*. Ese es el único usuario que puede sembrar.

Además, en **Authentication → Providers → Email**, apaga *Enable Sign Ups* para
que nadie más pueda crearse una cuenta.

### 3. Credenciales
Supabase → **Project Settings → API**. Copia la URL y la clave `anon` /
`publishable`, y pégalas en `js/config.js`:

```js
SUPABASE_URL: 'https://TU-REF.supabase.co',
SUPABASE_ANON_KEY: 'ey...'
```

La anon key es pública por diseño; lo que protege los datos es el RLS del paso 1.
**Nunca** pongas ahí la `service_role`.

### 4. Publicar
Cualquier hosting estático sirve. Netlify: arrastra la carpeta a
[app.netlify.com/drop](https://app.netlify.com/drop). También GitHub Pages,
Vercel o Cloudflare Pages. Le mandas el enlace y listo.

## Cómo se usa

- **Ella**: abre el enlace, toca el ramo, entra al jardín, toca una flor y lee.
La sesión del portal no se guarda: cada vez que se abre o recarga la página
empieza cerrada. Si le pasas tu teléfono con el jardín abierto, el portal le
pedirá la contraseña.

- **Tú**: en el jardín, toca la **esquina inferior derecha** (botón invisible),
  entra con tu correo y contraseña, escribe la nota, eliges flor y color,
  *Sembrar*. Aparece al instante en el teléfono de ella.

## Música

La playlist de Spotify se lee en vivo desde `SPOTIFY_PLAYLIST` (config.js): si
añades canciones, aparecen solas. Límites que impone Spotify, no el código:

- Los navegadores no dejan sonar audio sin un gesto del usuario. Arranca con el
  toque del ramo; en iOS puede hacer falta tocar ▶ dentro del reproductor.
- Sin sesión de Spotify iniciada suenan adelantos de 30 s. Con sesión (mejor
  Premium) suena la canción completa.
- No hay control de volumen en la IFrame API: "silenciar" pausa.
- El nombre de la canción no se puede leer por código (el iframe es de otro
  dominio). Se ve abriendo el panel, que es el reproductor de Spotify.

## Modo demo

Si `SUPABASE_ANON_KEY` queda vacío, la app guarda en `localStorage` — sirve para
probar el diseño sin cuenta. La contraseña del portal en ese modo es `demo`
(usuario: cualquier correo). Sin tiempo real entre dispositivos.

## Detalles

- Para añadir una especie nueva, agrega una entrada a `ESPECIES` en
  `js/flores-svg.js`: forma de pétalo, cuántos, colores y tipo de centro.
- Las flores se ubican al azar en el campo, pero se rechazan posiciones muy
  pegadas a otra flor (30 intentos) para que no se amontonen.
- La flor de más abajo se dibuja más grande y por encima: da sensación de
  profundidad.
- Al volver del segundo plano el cliente re-sincroniza, por si el móvil durmió
  la pestaña y se perdió algún evento realtime.
- `prefers-reduced-motion` apaga las animaciones y esconde el patico.
- Los inputs usan 16px para que iOS no haga zoom al enfocar.
