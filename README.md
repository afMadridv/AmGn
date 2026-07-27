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
js/cielo.js        <- ciclo día/noche con la hora de Colombia
js/bichos.js       <- mariposas, abejas, mariquitas y luciérnagas
js/musica.js       <- reproductor de la playlist de Spotify
js/galeria.js      <- la galería de sus dibujos
api/playlist.js    <- lee las canciones de la playlist (funcion serverless)
sql/instalar.sql   <- tabla, permisos, fotos y realtime, todo en uno
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

### 1. Tu usuario del portal
Supabase → **Authentication → Users → Add user**: correo + contraseña, y marca
*Auto Confirm User*. Ese es el único usuario que puede sembrar notas, y también
el que comenta y retira dibujos de la galería. Va primero porque el script del
paso 2 toma el más antiguo para darle permiso.

Ella no necesita usuario: entra por el enlace y ya.

Además, en **Authentication → Sign In / Providers → Email**, apaga
*Enable Sign Ups* para que nadie más pueda crearse una cuenta.

### 2. Base de datos
Supabase → **SQL Editor** → pegar `sql/instalar.sql` entero → **Run**.

Un solo archivo hace todo: tabla, permisos, fotos y tiempo real. Se puede
ejecutar las veces que haga falta — comprueba antes de tocar nada, así que no
se rompe si la base ya estaba a medias. Al terminar muestra una fila con las
columnas, las políticas y el correo del dueño: si eso sale, quedó bien.

**No pegues varios archivos SQL seguidos.** El editor corre todo en una
transacción: si un trozo falla, se deshace también lo que ya había pasado.

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
Está en Vercel: conecta el repo y listo. Necesita hosting con funciones
(Vercel, Netlify) para que el reproductor traiga la lista de canciones; con
un hosting sólo estático la música cae al modo simple, que también funciona.

## Cómo se usa

- **Ella**: abre el enlace, toca el ramo, entra al jardín, toca una flor y lee.
La sesión del portal no se guarda: cada vez que se abre o recarga la página
empieza cerrada. Si le pasas tu teléfono con el jardín abierto, el portal le
pedirá la contraseña.

- **Tú**: en el jardín, toca la **esquina inferior derecha** (botón invisible),
  entra con tu correo y contraseña, escribe la nota, eliges flor y color,
  *Sembrar*. Aparece al instante en el teléfono de ella.

## La galería

Su sitio para colgar dibujos, con título y con lo que quiera contar de cada
uno. El botón está en el jardín, bajo el del libro.

- **Ella cuelga sin cuenta ni contraseña.** El enlace es suyo y sólo ella lo
  tiene; pedirle que inicie sesión para dibujar en su propia galería sobra.
- **Quitar un dibujo pide tu sesión** —la del portal del jardín—. Es la única
  puerta cerrada, para que nadie pueda vaciarle la galería de un golpe.
- Cada dibujo va en **marco polaroid**, igual en la miniatura y en el cuadro
  grande.
- **El corazón funciona como el de las notas, pero al revés**: allí ella se lo
  da a lo que tú escribes, aquí tú se lo das a lo que ella dibuja. Se da una
  vez y no se quita; en la rejilla queda un ♥ junto al título.
- **Tú, desde la sesión del jardín, le dejas un comentario** en cada dibujo.
  Sale firmado bajo el cuadro.

Los dibujos se reescalan a 2000 px (más que las fotos de las notas, que son
1600) antes de subirse.

> **Lo que hay que saber:** la clave pública de Supabase vive en este repo. Si
> el repo es público, cualquiera que lo encuentre puede colgar un dibujo en la
> galería —no borrar, no leer nada nuevo—. Ponlo en privado
> (Settings → General → Change visibility) y ese hueco se cierra.

## Seguridad

Conviene decirlo claro: **una página web no puede leer nada del ordenador de
quien la visita**, ni con "Inspeccionar elemento". Ahí sólo se ve lo que la
propia página trae —su HTML, su CSS, su código— y las peticiones que hace.
Ninguna de ellas toca archivos, documentos ni contraseñas de tu equipo. Eso el
navegador no lo permite, y no es algo que haya que configurar.

Lo que sí se puede endurecer, y está hecho en `vercel.json`:

- **Content-Security-Policy**: lista blanca de sitios desde los que se puede
  cargar algo. Si alguien lograra colar código —por ejemplo en el título de un
  dibujo—, el navegador no lo ejecutaría, y tampoco podría enviar nada a un
  servidor que no esté en la lista.
- **Permissions-Policy**: cámara, micrófono, ubicación, pagos y sensores
  apagados. La página no puede ni pedirlos.
- **frame-ancestors / X-Frame-Options**: nadie puede meter el jardín dentro de
  otra web para hacerlo pasar por suyo.
- Todo el texto que viene de fuera —lo que se escribe en un dibujo, lo que
  manda Spotify— se escapa antes de pintarlo, para que un `<` no se convierta
  en una etiqueta.

Lleva `'unsafe-eval'` porque la API de Spotify usa `eval()` y sin él la música
no arranca. Sólo permite que los scripts ya autorizados lo usen; meter uno
nuevo sigue estando cerrado, que es lo que importa.

Lo único realmente expuesto es la clave pública de Supabase, que está en este
repo por diseño. **Si el repo es público, ponlo en privado** — es el paso que
más cierra.

## Volver

Todo lo que se abre dentro del jardín —notas, libro, galería, un dibujo, el
portal, la música— lleva una flecha arriba a la izquierda, siempre en el mismo
sitio. Desde un dibujo, la flecha devuelve a la galería, no al jardín.

## El corazón de ella

Cada nota tiene un botón de corazón. Ella no tiene cuenta, así que no puede
escribir en la tabla: el corazón se pone llamando a `dar_corazon()`, una
función del servidor que sólo sabe hacer eso. No puede quitarlo ni tocar el
texto de la nota. En el libro y en el portal ves cuáles te marcó.

## Rincones

Cada campo aguanta 35 flores; a partir de ahí se abre otro, y se pasa de uno a
otro con las flechas de abajo. Sólo se dibuja el campo que se está mirando, así
que da igual que haya cientos de notas. El patico camina hacia el lado al que
vas.

## El libro

El botón del libro, arriba a la derecha, abre la lista de todas las notas de la
más reciente a la más antigua, con marca de las que ella aún no ha abierto, de
las que llevan foto y de las que tienen corazón. Al tocar una, el jardín salta
a su rincón y la abre.

## Bichos

De día vuelan una mariposa, una abeja y una mariquita; de noche, sólo
luciérnagas con el farol latiendo. Sobre cada flor que ella todavía no ha
abierto se posa uno —mariposa, abeja o mariquita según la nota—, y al leerla
levanta el vuelo pero **se queda a vivir en el jardín**: sigue revoloteando
por ahí, y lo seguirá haciendo la próxima vez que entre. Así el jardín se va
llenando de bichos a medida que lee. Lo leído y los bichos que se quedaron se
guardan en su propio navegador, no en la base de datos.

El patico pasea a su aire por toda la tierra y sube al campo verde: elige un
punto, va andando, se para y vuelve a elegir. Cuanto más arriba está, más
pequeño se ve y pasa por detrás de las flores cercanas. Si tocas el suelo, va
a ese punto exacto.

## Fotos en las notas

Cada nota puede llevar una foto. Antes de subirla se reescala en el propio
teléfono a 1600 px de lado y se recomprime a JPEG: una foto de cámara de 4 MB
acaba pesando unos 200 KB, sube rápido y ella la abre sin gastar datos.

El bucket de Storage lo crea `sql/instalar.sql`, con los mismos permisos que el
jardín: cualquiera ve, sólo tú subes. Si no existe, la app avisa con "Falta
crear el bucket" y todo lo demás sigue funcionando.

En modo demo la foto se guarda dentro del navegador, sin subir nada.

## Modo de prueba

Añade `?demo=1` a la URL para trabajar contra `localStorage` en vez de la base
de datos real: sirve para probar cambios sin ensuciar el jardín de verdad.
La contraseña del portal en ese modo es `demo`.

## El cielo sigue la hora de Colombia

`js/cielo.js` mira la hora en `America/Bogota` — da igual dónde esté el
teléfono que abra el enlace — y pone el jardín en uno de cuatro momentos:

| momento   | horario     | qué se ve                                          |
|-----------|-------------|----------------------------------------------------|
| amanecer  | 5:00–7:00   | cielo malva y durazno, sol grande y naranja saliendo por la izquierda |
| día       | 7:00–16:30  | cielo azul, sol alto y blanco, nubes blancas       |
| atardecer | 16:30–18:30 | cielo rosa y ámbar, sol poniéndose por la derecha  |
| noche     | 18:30–5:00  | cielo azul profundo, luna llena con sus cráteres y cielo estrellado |

El sol y la luna no están clavados: recorren un arco según la hora, salen bajos
por la izquierda, culminan arriba y se ponen por la derecha.

Para ver otra hora sin esperarla, añade `?hora=` a la URL: `?hora=22` (noche),
`?hora=6` (amanecer), `?hora=17.6` (atardecer).

## Música

Spotify pone el sonido; el mando es nuestro. Su reproductor sigue en la página
pero escondido, y desde fuera se le dice qué tocar. Lo que se ve es un panel a
juego con el jardín: carátula, nombre y artista, barra de progreso arrastrable,
anterior, play/pausa, siguiente, volver al principio y la lista entera para
elegir. En la pastilla de arriba se lee lo que suena sin abrir nada.

La pieza que lo hace posible es `api/playlist.js`. El navegador
no puede leer las canciones de una playlist —CORS bloquea la página del embed
y la API oficial pide credenciales que no pueden vivir en el frontend—, pero un
servidor sí. Esa función pide la misma página pública del embed, saca título,
artista y duración de cada canción, y las sirve. Con esa lista en la mano el
reproductor carga las canciones **una a una** con `loadUri`, y de ahí salen el
anterior/siguiente y el nombre siempre correcto.

Si la función falla, se cae con elegancia al modo simple: suena la playlist
entera del tirón, el nombre se pregunta al oEmbed público de Spotify y el botón
de la lista despliega el reproductor de Spotify para poder saltar. Los botones
de anterior y siguiente se esconden, porque ahí no hay a dónde saltar.

Añadir canciones en Spotify basta: la lista se relee en cada visita (con cinco
minutos de caché).

Lo que impone Spotify y no se puede evitar:

- **Los adelantos.** Sin sesión de Spotify iniciada en ese navegador, los
  embeds sólo dan un trozo de entre 15 y 30 s según la canción, **y empieza por
  el medio, no por el principio**. El panel lo avisa con la duración real de
  ese recorte y ofrece abrir la playlist en Spotify, donde suena entera. Con
  sesión iniciada (mejor Premium) el aviso desaparece solo.
- **Volumen.** No existe en la IFrame API: silenciar es pausar.
- **El final de una canción.** Tampoco se avisa: al llegar al final el cursor
  se queda clavado y el reproductor sigue diciendo que suena. Por eso el relevo
  a la siguiente va por temporizador, recalculado en cada aviso de posición.
- Los navegadores no dejan sonar audio sin un gesto. Arranca con el toque del
  ramo; en iOS puede hacer falta darle al play del panel.

Para probar la función en local hace falta un servidor que sepa ejecutarla
(`npx vercel dev`); con un servidor sólo estático se ve el modo simple, que
también funciona.

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
