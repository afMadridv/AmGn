/* ==========================================================================
   MÚSICA — la playlist de Spotify, sonando entera
   --------------------------------------------------------------------------
   El panel, los botones y la lista son los mismos de siempre. Lo que cambió
   es quién pone el sonido, y por qué:

     · Spotify sabe QUÉ canciones hay. La lista (título, artista, duración)
       la sigue trayendo api/playlist.js.
     · Spotify NO puede ponerlas enteras. Su embed sólo da 15-30 s tomados
       del medio salvo que quien escucha tenga sesión Premium abierta en ese
       mismo navegador. No es un fallo del código y no hay forma de esquivarlo
       desde una web.
     · Así que el sonido lo pone el reproductor incrustado de YouTube, que sí
       da la canción entera sin cuenta ni sesión. api/youtube.js traduce
       "título + artista" al vídeo que le corresponde, eligiendo el que cuadra
       con la duración que dijo Spotify.

   El reproductor de YouTube va escondido dentro de .lista-spotify, que tiene
   height:0 y NO display:none: si el iframe sale del flujo, el navegador puede
   cortar el sonido.

   Si no hay lista, o si no se encuentra ningún vídeo, el panel lo dice y deja
   el enlace para abrir la playlist en Spotify.
   ========================================================================== */
(function () {
  'use strict';

  const CFG = window.CONFIG;
  if (!CFG.SPOTIFY_PLAYLIST) return;

  const $ = s => document.querySelector(s);
  const el = {
    caja:    $('#musica'),
    boton:   $('#btnMusica'),
    estado:  $('#musicaEstado'),
    panel:   $('#panelMusica'),
    hueco:   $('#spotifyHueco'),   // el id se queda: es el hueco del embed

    tapa:    $('#cancionTapa'),
    nombre:  $('#cancionNombre'),
    artista: $('#cancionArtista'),
    aviso:   $('#cancionAviso'),

    barra:   $('#barraProgreso'),
    relleno: $('#barraRelleno'),
    tActual: $('#tiempoActual'),
    tTotal:  $('#tiempoTotal'),

    btnAntes:     $('#btnAntes'),
    btnPlay:      $('#btnPlay'),
    btnDespues:   $('#btnDespues'),
    btnReiniciar: $('#btnReiniciar'),
    btnLista:     $('#btnLista'),
    listaCanciones: $('#listaCanciones'),
    enlace:       $('#enlacePlaylist')
  };
  if (!el.caja) return;

  el.enlace.href = 'https://open.spotify.com/playlist/' + CFG.SPOTIFY_PLAYLIST;

  let player    = null;
  let listo     = false;
  let sonando   = false;
  let pendiente = false;    // se pidió sonar antes de que el reproductor cargara

  let canciones = [];
  let indice    = 0;
  let duracion  = 0;        // ms
  let posicion  = 0;        // ms
  let arrastrando = false;
  let reloj_ = null;        // el que refresca la barra mientras suena

  const conLista = () => canciones.length > 0;

  /* ------------------------------------------------------------- utils -- */
  // Los títulos vienen de Spotify: se escapan antes de entrar en un innerHTML.
  const esc = t => window.Jardin.escapar(t);

  const reloj = ms => {
    if (!ms || ms < 0) ms = 0;
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  /* --------------------------------------------------------- la carátula --
     El oEmbed público de Spotify sí acepta peticiones de otros dominios: de
     ahí sale la portada. La URL se arma con el tipo que trae la propia URI
     (`spotify:track:…`), porque dando por hecho que siempre es una canción,
     un día no lo es y la consulta falla entera.                             */
  const consultado = new Map();

  async function pedirTapa(uri) {
    if (consultado.has(uri)) return consultado.get(uri);

    const [, tipo, id] = uri.split(':');
    const url = `https://open.spotify.com/oembed?url=https://open.spotify.com/${tipo}/${id}`;
    let tapa = '';
    try {
      const j = await fetch(url).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)));
      tapa = j.thumbnail_url || '';
    } catch (err) {
      console.info('Spotify no supo darme la portada de', uri, '·', err.message);
    }
    consultado.set(uri, tapa);
    return tapa;
  }

  /* ------------------------------------------------- buscar en YouTube ----
     Una canción, un vídeo. Buscarlo tarda entre uno y dos segundos, así que:
       · se guarda en la propia entrada de la lista, para no volver a
         preguntar al cambiar de canción y volver;
       · se guarda también en el teléfono (localStorage, por uri de Spotify),
         y la próxima visita la primera canción suena sin esperar;
       · la siguiente se busca mientras suena la actual (ver precargar).   */
  const LLAVE_VIDEOS = 'patico:videos';
  let guardados = {};
  try { guardados = JSON.parse(localStorage.getItem(LLAVE_VIDEOS)) || {}; } catch { /* sin caché */ }

  function guardarVideo(uri, id) {
    guardados[uri] = id;
    try { localStorage.setItem(LLAVE_VIDEOS, JSON.stringify(guardados)); } catch { /* lleno o privado */ }
  }

  const buscando = new Map();   // uri -> promesa, para no buscar dos veces lo mismo a la vez

  function videoDe(i) {
    const c = canciones[i];
    if (!c) return Promise.resolve(null);
    if (c.video !== undefined) return Promise.resolve(c.video);   // null incluido: ya se buscó
    if (guardados[c.uri]) { c.video = guardados[c.uri]; return Promise.resolve(c.video); }
    if (buscando.has(c.uri)) return buscando.get(c.uri);

    const consulta = `${c.titulo} ${c.artista}`.trim();
    const p = fetch(`/api/youtube?q=${encodeURIComponent(consulta)}&d=${c.duracion || 0}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('estado ' + r.status)))
      .then(j => {
        c.video = j.id || null;
        if (c.video) guardarVideo(c.uri, c.video);
        return c.video;
      })
      .catch(err => {
        console.info('Sin vídeo para', consulta, '·', err.message);
        c.video = null;
        return null;
      })
      .finally(() => buscando.delete(c.uri));
    buscando.set(c.uri, p);
    return p;
  }

  // La de después (y la de antes) quedan buscadas mientras suena ésta: así
  // "siguiente" no espera a la red.
  function precargar() {
    if (!conLista()) return;
    videoDe((indice + 1) % canciones.length);
    videoDe((indice - 1 + canciones.length) % canciones.length);
  }

  /* ------------------------------------------------------------ pintar -- */
  async function pintarCancion() {
    const c = canciones[indice];
    if (!c) return;

    el.nombre.textContent  = c.titulo || 'Sonando';
    el.artista.textContent = c.artista || '';
    el.artista.hidden = !el.artista.textContent;
    el.boton.title = el.nombre.textContent;
    el.tapa.hidden = true;
    marcarEnLista();
    pintar();

    const tapa = await pedirTapa(c.uri);
    if (canciones[indice] !== c) return;            // ya cambió de canción
    if (tapa) { el.tapa.src = tapa; el.tapa.hidden = false; }
  }

  function pintar() {
    el.caja.dataset.sonando = sonando ? 'si' : 'no';

    const nombre = el.nombre.textContent;
    el.estado.textContent = !listo ? 'cargando…'
                          : sonando && nombre && nombre !== '…' ? nombre
                          : sonando ? 'sonando' : 'en pausa';

    el.btnPlay.classList.toggle('sonando', sonando);
    el.btnPlay.setAttribute('aria-label', sonando ? 'Pausar' : 'Reproducir');

    if (!arrastrando) {
      const pct = duracion ? Math.min(100, posicion / duracion * 100) : 0;
      el.relleno.style.width = pct.toFixed(2) + '%';
      el.barra.setAttribute('aria-valuenow', Math.round(pct));
    }
    el.tActual.textContent = reloj(posicion);
    el.tTotal.textContent  = reloj(duracion);
  }

  function avisar(texto) {
    el.aviso.textContent = texto || '';
    el.aviso.hidden = !texto;
  }

  /* ----------------------------------------------------- lista desplegable */
  function pintarLista() {
    el.listaCanciones.innerHTML = '';
    canciones.forEach((c, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" class="cancion-item" data-i="${i}">
          <span class="cancion-num">${i + 1}</span>
          <span class="cancion-info">
            <span class="cancion-t">${esc(c.titulo)}</span>
            <span class="cancion-a">${esc(c.artista)}</span>
          </span>
        </button>`;
      li.querySelector('button').addEventListener('click', () => ir(i));
      el.listaCanciones.appendChild(li);
    });
    marcarEnLista();
  }

  function marcarEnLista() {
    el.listaCanciones.querySelectorAll('.cancion-item').forEach(b => {
      b.classList.toggle('activa', Number(b.dataset.i) === indice);
    });
  }

  /* ------------------------------------------------------- carga inicial -- */
  async function pedirLista() {
    try {
      const r = await fetch('/api/playlist?id=' + CFG.SPOTIFY_PLAYLIST);
      if (!r.ok) throw new Error('estado ' + r.status);
      const datos = await r.json();
      canciones = Array.isArray(datos.canciones) ? datos.canciones : [];
    } catch (err) {
      canciones = [];
      console.info('No pude leer la lista de canciones:', err.message);
    }
    leidaEn = Date.now();
    el.caja.classList.toggle('sin-lista', !conLista());
    if (conLista()) pintarLista();
    else {
      el.nombre.textContent = 'La lista no cargó';
      avisar('No pude leer la playlist. Ábrela en Spotify con el enlace de abajo.');
      el.estado.textContent = 'sin música';
    }
  }

  /* -------------------------------------------------- la lista se refresca --
     La playlist es de verdad: si añades una canción en Spotify, tiene que
     aparecer aquí. Al cargar la página ya se lee, pero eso deja fuera el caso
     de tenerla abierta mientras añades. Así que se vuelve a leer al volver a
     la pestaña y al dar la vuelta completa a la lista.

     Al fusionar se conserva por `uri` el vídeo de YouTube ya resuelto —si no,
     cada refresco volvería a buscarlos todos— y la canción que está sonando
     se sigue por su uri, no por su número: al añadir una canción por el medio
     los números bailan.                                                      */
  let leidaEn = 0;
  let refrescando = false;

  async function refrescarLista(forzar) {
    if (refrescando || !conLista()) return;
    // Sin freno, cambiar de pestaña diez veces son diez lecturas seguidas. Al
    // dar la vuelta a la lista sí interesa mirar sin esperar.
    if (!forzar && Date.now() - leidaEn < 60000) return;
    refrescando = true;

    try {
      // no-store, y con marca de tiempo para saltarse también el caché de la
      // CDN: aquí el sentido de la petición es traer lo último de todo.
      const r = await fetch(`/api/playlist?id=${CFG.SPOTIFY_PLAYLIST}&t=${Date.now()}`,
                            { cache: 'no-store' });
      if (!r.ok) throw new Error('estado ' + r.status);
      const datos = await r.json();
      const nuevas = Array.isArray(datos.canciones) ? datos.canciones : [];
      if (!nuevas.length) return;

      const sonandoUri = canciones[indice] && canciones[indice].uri;
      const yaBuscado = new Map(canciones.map(c => [c.uri, c.video]));
      nuevas.forEach(c => { if (yaBuscado.has(c.uri)) c.video = yaBuscado.get(c.uri); });

      const cambio = nuevas.length !== canciones.length ||
                     nuevas.some((c, i) => c.uri !== canciones[i].uri);
      canciones = nuevas;

      const donde = canciones.findIndex(c => c.uri === sonandoUri);
      indice = donde < 0 ? 0 : donde;

      pintarLista();
      if (cambio) console.info('La playlist cambió:', canciones.length, 'canciones');
    } catch (err) {
      console.info('No pude refrescar la lista:', err.message);
    } finally {
      leidaEn = Date.now();
      refrescando = false;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refrescarLista();
  });

  /* ------------------------------------------------ el reproductor -------
     La API de YouTube exige un elemento al que sustituir por el iframe, y
     avisa por un global cuando está lista.                                 */
  function arrancarPlayer() {
    if (!conLista()) return;

    const hueco = document.createElement('div');
    hueco.id = 'ytHueco';
    el.hueco.appendChild(hueco);

    player = new YT.Player('ytHueco', {
      width: '100%', height: 220,
      playerVars: {
        // controls:0 porque el mando es el nuestro; playsinline para que en
        // el móvil no se abra a pantalla completa y se lleve al usuario.
        controls: 0, disablekb: 1, playsinline: 1, rel: 0,
        modestbranding: 1, iv_load_policy: 3, origin: location.origin
      },
      events: {
        onReady: async () => {
          listo = true;
          await cargar(indice, false);
          if (pendiente) { pendiente = false; arrancar(); }
          pintar();
          precargar();
        },
        onStateChange: e => {
          sonando = e.data === YT.PlayerState.PLAYING;
          if (sonando) {
            duracion = (player.getDuration() || 0) * 1000;
            avisar('');
            // Ya sonó una vez: el vídeo de respaldo se puede volver a esconder.
            clearTimeout(vigia);
            el.caja.classList.remove('con-video');
            precargar();
          }
          // ENDED: encadena la siguiente. YouTube sí avisa del final, así que
          // aquí no hace falta el temporizador que necesitaba Spotify.
          if (e.data === YT.PlayerState.ENDED) siguiente(true);
          marcha();
          pintar();
        },
        onError: () => {
          // Vídeo caído, privado o bloqueado en el país: a la siguiente.
          avisar('Esa canción no se puede reproducir aquí. Paso a la siguiente.');
          setTimeout(() => siguiente(true), 900);
        }
      }
    });
  }

  const script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';
  script.async = true;
  window.onYouTubeIframeAPIReady = arrancarPlayer;
  pedirLista().then(() => document.head.appendChild(script));

  /* La barra sólo se refresca mientras suena: un intervalo corriendo con el
     reproductor en pausa es gasto de batería para nada. */
  function marcha() {
    clearInterval(reloj_);
    if (!sonando) return;
    reloj_ = setInterval(() => {
      if (!player || arrastrando) return;
      posicion = (player.getCurrentTime() || 0) * 1000;
      duracion = (player.getDuration() || 0) * 1000;
      pintar();
    }, 250);
  }

  /* ------------------------------------------------------------ control -- */
  // Cuántas canciones seguidas han fallado. Sin esto, una playlist que no
  // resuelve ninguna se pasaría la vida saltando de la última a la primera.
  let fallos = 0;

  function cargar(i, sonar) {
    if (!player || !conLista()) return;
    const destino = (i + canciones.length) % canciones.length;
    indice = destino;
    posicion = 0;
    duracion = canciones[destino].duracion || 0;
    pintarCancion();

    // Si el vídeo ya se conoce (lo normal, gracias a precargar), se pone en
    // el acto, dentro del mismo toque: el iPhone sólo deja sonar lo que nace
    // de un toque, y una espera de red por medio lo puede romper.
    const c = canciones[destino];
    if (c.video !== undefined) return poner(destino, c.video, sonar);
    return videoDe(destino).then(video => {
      if (indice === destino) poner(destino, video, sonar);   // si no, ya se cambió de canción
    });
  }

  function poner(destino, video, sonar) {
    if (!video) {
      if (++fallos >= canciones.length) {
        fallos = 0;
        sonando = false; marcha();
        avisar('No encontré ninguna de estas canciones. Ábrelas en Spotify con el enlace de abajo.');
        pintar();
        return;
      }
      avisar('No encontré esta canción. Paso a la siguiente.');
      setTimeout(() => siguiente(true), 900);
      return;
    }
    fallos = 0;
    if (sonar) { player.loadVideoById(video); vigilar(); }
    else player.cueVideoById(video);
  }

  /* El vigía. Algunos iPhone no dejan que un vídeo de otra web (el de
     YouTube va en un iframe) empiece a sonar por un botón nuestro: sólo con
     un toque sobre el propio vídeo. Si a los pocos segundos de pedir que
     suene no está sonando ni cargando, se enseña el vídeo en el panel para
     tocarlo una vez. Después ya obedece a nuestros botones, y se esconde. */
  let vigia = null;
  function vigilar() {
    clearTimeout(vigia);
    vigia = setTimeout(() => {
      if (!player || !player.getPlayerState) return;
      const st = player.getPlayerState();
      if (st === YT.PlayerState.PLAYING || st === YT.PlayerState.BUFFERING) return;
      el.caja.classList.add('con-video');
      avisar('Toca el vídeo una vez para que empiece a sonar.');
    }, 3000);
  }

  function arrancar() {
    if (!player || !listo) { pendiente = true; return; }
    player.playVideo();
    vigilar();
  }

  function alternar() {
    if (!player || !listo) { pendiente = true; return; }
    if (sonando) player.pauseVideo();
    else { player.playVideo(); vigilar(); }
  }

  const ir = (i, sonar = true) => cargar(i, sonar);

  // Al llegar al final se relee la playlist antes de volver a la primera: es
  // el momento natural para enterarse de lo que se ha añadido mientras sonaba.
  async function siguiente(auto = false) {
    const sonar = auto || sonando;
    if (indice + 1 >= canciones.length) await refrescarLista(true);
    return ir(indice + 1, sonar);
  }
  const anterior  = () => {
    // Como en cualquier reproductor: si ya sonó un rato, vuelve al principio.
    if (posicion > 3000) { player.seekTo(0, true); return; }
    ir(indice - 1, sonando);
  };

  el.btnPlay.addEventListener('click', alternar);
  el.btnAntes.addEventListener('click', anterior);
  el.btnDespues.addEventListener('click', () => siguiente(false));
  el.btnReiniciar.addEventListener('click', () => player && player.seekTo(0, true));

  el.btnLista.addEventListener('click', () => {
    const abierta = el.caja.classList.toggle('con-lista');
    el.btnLista.setAttribute('aria-expanded', String(abierta));
  });

  /* ------------------------------------------------------- barra y seek -- */
  const fraccion = ev => {
    const caja = el.barra.getBoundingClientRect();
    return Math.min(Math.max((ev.clientX - caja.left) / caja.width, 0), 1);
  };

  el.barra.addEventListener('pointerdown', ev => {
    if (!duracion) return;
    arrastrando = true;
    el.barra.classList.add('tocando');
    el.barra.setPointerCapture(ev.pointerId);
    const f = fraccion(ev);
    el.relleno.style.width = (f * 100).toFixed(2) + '%';
    el.tActual.textContent = reloj(f * duracion);
  });
  el.barra.addEventListener('pointermove', ev => {
    if (!arrastrando) return;
    const f = fraccion(ev);
    el.relleno.style.width = (f * 100).toFixed(2) + '%';
    el.tActual.textContent = reloj(f * duracion);
  });
  el.barra.addEventListener('pointerup', ev => {
    if (!arrastrando) return;
    arrastrando = false;
    el.barra.classList.remove('tocando');
    if (player && duracion) player.seekTo(fraccion(ev) * duracion / 1000, true);
  });
  el.barra.addEventListener('pointercancel', () => {
    arrastrando = false;
    el.barra.classList.remove('tocando');
  });

  el.barra.addEventListener('keydown', ev => {
    if (!player || !duracion) return;
    const salto = ev.key === 'ArrowRight' ? 5000 : ev.key === 'ArrowLeft' ? -5000 : 0;
    if (!salto) return;
    ev.preventDefault();
    player.seekTo(Math.min(Math.max(posicion + salto, 0), duracion) / 1000, true);
  });

  /* -------------------------------------------------------- abrir panel -- */
  el.boton.addEventListener('click', () => {
    const abierto = el.caja.classList.toggle('abierta');
    el.boton.setAttribute('aria-expanded', String(abierto));
    if (abierto && !sonando) arrancar();
  });

  $('#btnCerrarMusica').addEventListener('click', () => {
    el.caja.classList.remove('abierta');
    el.boton.setAttribute('aria-expanded', 'false');
  });

  window.Musica = { arrancar, alternar, siguiente, anterior, ir };
  pintar();
})();
