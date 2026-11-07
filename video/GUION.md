# Para Gabriela — video de presentación

## Análisis del producto

**Qué es.** Un jardín web íntimo en el que cada flor es una nota de amor. Él siembra las notas desde un portal escondido; a ella le brotan en vivo en el teléfono. Ella no necesita cuenta.

**Propuesta de valor.** Un regalo digital que se vive como un lugar, no como un chat. Es lento, bonito y personal, y avisa como una app nativa.

**Interfaz.**
- Portada con un ramo de lirios.
- Jardín con cielo animado (sol, luna, estrellas, nubes), colinas y pasto.
- Flores SVG generadas en código, cada una con su especie y color.
- El patico, que camina y dispara a los bichos.
- Modal de nota con corazón y comentarios.
- Galería de dibujos.
- Reproductor de música.
- Portal de acceso abajo a la derecha, con la opción "mantener sesión".
- PWA instalable, con push de corazones, flores, comentarios y fotos.

**Paleta y tipografía.**
- Crema `#fffaf2`, rosas, lila y ciruela, con el acento rosa `#b95975`.
- Cormorant Garamond en itálica para la voz emocional.
- Quicksand para la interfaz.

**Tono.** Cálido y artesanal. Movimiento con springs suaves; nada corporativo.

**Arco narrativo.** Problema (los mensajes se pierden en el chat), luego el jardín (lo que ella ve), luego el portal (lo que él hace), luego la magia (en vivo, avisos, detalles), luego cómo está hecho, y al final la llamada a la acción.

## Guion técnico segundo a segundo (30 fps, unos 75 s)

Cada transición dura 20 fotogramas (0,67 s) y se solapa con la escena siguiente. Los tiempos son aproximados.

| Seg. | Escena | Qué pasa | Vertical 9:16 (1080×1920) | Horizontal 16:9 (1920×1080) |
|---|---|---|---|---|
| 0–6 | **Intro** | El ramo entra con un spring. "Para Gabriela" aparece letra a letra y luego el lema. | Ramo en el tercio superior, título grande centrado abajo. | Ramo a la izquierda, título y lema a la derecha. |
| 6–12 | **Concepto** | Tres frases cinéticas con su flor: "Cada nota florece.", "En tiempo real.", "Como una app de verdad." | Una frase por pantalla, en texto grande a todo lo ancho. | Frase a la izquierda y la flor que la acompaña a la derecha. |
| 12–22 | **Recorrido 1: portada** (UI real) | Ella abre el enlace, el ramo se abre, toca y entra al jardín. Rótulos: "Sin cuenta, sin app", "Toca el ramo", "Y entra al jardín". | Título arriba, teléfono de 560 u debajo con la grabación. | Teléfono a la izquierda y el texto a la derecha. |
| 22–31 | **Jardín vivo** (motion) | Brotan 12 flores y suben los contadores: 48 flores, 412 días, 126 comentarios. | Jardín en la mitad inferior y contadores apilados arriba. | Jardín a todo el ancho, contadores en fila. |
| 31–43 | **Recorrido 2: nota** (UI real) | Toca una flor, se abre la nota, da corazón y comenta. A los 4,7 s baja el aviso "Le gustó tu flor"; a los 8,3 s, "Nuevo comentario". | El teléfono ocupa el centro; los avisos caen sobre el título. | Teléfono a la izquierda; los avisos bajan centrados arriba. |
| 43–55 | **Recorrido 3: portal** (UI real) | Botón escondido, acceso con "mantener sesión", escribir la nota, elegir la especie y sembrar. El aviso "Brotó una flor nueva" cierra la escena. | Título arriba y el portátil a lo ancho (980 u). | Portátil grande (1150 u) a la izquierda y el texto a la derecha. |
| 55–66 | **Recorrido 4: detalles** (UI real) | Jardín de noche: el libro con todas las notas, la música y el patico disparando ("pum", fantasma). | Igual que el recorrido 3. | Igual que el recorrido 3. |
| 66–73 | **Tecnología** (motion) | Caen 8 fichas: Supabase, Realtime, RLS, Web Push, PWA, Vercel, SVG generativo, Web Audio. | Cuadrícula de 2×4. | Cuadrícula de 4×2. |
| 73–75 | **Cierre / CTA** | Ícono de la app, título, píldora con la URL y la firma, entre una lluvia de flores, y fundido. | Todo centrado en columna. | Igual, con márgenes más amplios. |

**Zonas seguras en vertical.** No pongas texto en los 250 px de arriba ni en los 350 px de abajo, porque ahí van los botones de Reels y TikTok. Las escenas ya dejan 130 u de padding; ten cuidado con los rótulos largos.

**Audio** (no incluido en el código). Pista acústica suave a unos 90 BPM. Pon los acentos en los cortes de escena (fotogramas 160, 340, 620…). Añade un SFX "pop" en cada aviso y el "pum" del patico. Agrégalo con `<Audio src={staticFile('musica.mp3')} />` en `Video.tsx`.

## Implementación (ya en este repositorio)

- Hay una sola composición, `Reel({vertical})`, registrada dos veces en `src/Root.tsx`: `Reel` a 1080×1920 y `Wide` a 1920×1080.
- Todas las medidas usan `u = min(w, h) / 1080` (`useLayout()`), así que los mismos números sirven en los dos formatos. Las escenas cambian `flexDirection` y la cuadrícula según `vertical`.
- `src/scenes/Recorrido.tsx` mete un `OffthreadVideo` con el primer video de `public/<carpeta>/` dentro del mockup `Telefono` o `Portatil`, con rótulos y avisos push sincronizados por fotograma. Si falta el archivo, muestra un hueco rayado con su nombre, así puedes revisar el montaje antes de grabar.
- Para ajustar un recorrido, cambia `rotulos[].desde`, `avisos[].desde`, `inicio` (el segundo de la grabación desde el que empieza) y `velocidad` en `src/Video.tsx`.

```bash
cd video
npm run studio        # vista previa en vivo
npm run render:reel   # out/jardin-reel-9x16.mp4
npm run render:wide   # out/jardin-16x9.mp4
```

## Guía de grabación

**Reglas generales.**
- Graba a 30 o 60 fps, en MP4 H.264 y sin audio.
- No muestres el cursor del sistema en el teléfono. En el portátil, el cursor sí ayuda.
- Usa datos bonitos: flores con títulos reales (que no sean privados) y unas 8 a 12 flores sembradas.
- Que nunca se vean contraseñas ni correos. El portal se graba con la sesión ya recordada, o tapando el campo.
- Ve despacio y haz una pausa de 1 s después de cada toque, para que dé tiempo a leer el rótulo.

**Teléfono: graba en 9:16.** Pantalla del iPhone a 1170×2532 o en DevTools a 390×844 con escala 3, desde la app instalada (sin la barra de Safari). El mockup recorta con `cover`, así que deja unos 60 px libres arriba y abajo.

1. `public/portada/` (unos 10 s). Abre la app desde la pantalla de inicio. Espera 2 s con el ramo, tócalo, deja que termine la animación y entra al jardín. Deja 2 s de jardín quieto.
2. `public/nota/` (unos 12 s). Ya en el jardín, toca una flor visible. Lee 2 s y toca el corazón: el rótulo "Dale corazón" sale a los 3,7 s, así que tócalo hacia los 4 s. Escribe un comentario corto y envíalo hacia los 8 s. Cierra la nota.

**Portátil: graba en 16:10 o 16:9.** Ventana del navegador a 1440×900, sin marcadores ni extensiones, con zoom al 100 %. El mockup ya dibuja su propia barra con la URL, así que graba **sin** la barra del navegador: usa F11 o recorta.

3. `public/portal/` (unos 12 s). Desde el jardín, haz clic en el portal escondido, abajo a la derecha. Entra con la sesión ya recordada o con el campo de contraseña fuera de cuadro. Escribe un título y una nota corta, elige la especie y el color, y siembra. Muestra cómo brota la flor en el jardín.
   - Opcional, para el efecto "en vivo": pon dos ventanas lado a lado, portal y jardín, y graba las dos a la vez.
4. `public/extras/` (unos 11 s, unos 2,5 s por bloque). Abre la galería y pasa un dibujo. Abre la música y dale play. Haz clic en un bicho para que el patico dispare. Cambia a la noche: el cielo con la luna y las estrellas.

**Material extra opcional para versiones más largas.**
- Una captura del aviso push real en la pantalla bloqueada del iPhone.
- La instalación con "Añadir a pantalla de inicio".

**Dónde va cada archivo.** Cada video va dentro de su carpeta en `video/public/` (`portada`, `nota`, `portal`, `extras`). El nombre da igual: se usa el primer `.mp4`, `.webm` o `.mov` en orden alfabético. Vuelve a renderizar. Si una toma dura más o menos, ajusta `inicio`, `velocidad` o la `dur` de la escena.
