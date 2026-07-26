/* ==========================================================================
   MÚSICA — la playlist de Spotify, con reproductor propio
   --------------------------------------------------------------------------
   Spotify pone el sonido; el mando es nuestro. Su reproductor sigue en la
   página, escondido, y desde fuera se le va diciendo qué tocar.

   La clave es la lista de canciones: la sirve netlify/functions/playlist.js,
   que la lee desde el servidor (el navegador no puede, CORS lo impide). Con
   esa lista en la mano se puede:

     · enseñar SIEMPRE el nombre y el artista correctos,
     · saltar a la anterior y a la siguiente —la API de Spotify no trae esos
       botones, así que se cargan las canciones una a una con `loadUri`—,
     · encadenar sola la siguiente cuando una termina,
     · y elegir cualquiera de un vistazo.

   Si la función falla (o se abre el proyecto sin Netlify), se cae con
   elegancia al modo de antes: suena la playlist entera del tirón, el nombre
   se pregunta al oEmbed y para saltar se despliega el reproductor de Spotify.

   Sobre los adelantos: sin sesión de Spotify iniciada, los embeds sólo dan un
   trozo de 15-30 s tomado del medio de la canción. No es cosa del código y no
   hay manera de esquivarlo desde una web; el panel lo avisa y ofrece abrir la
   playlist en Spotify, donde suena entera.
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
    hueco:   $('#spotifyHueco'),

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

  let control   = null;
  let listo     = false;
  let sonando   = false;
  let pendiente = false;    // se pidió sonar antes de que el reproductor cargara

  let canciones = [];       // la lista, si la función respondió
  let indice    = 0;
  let duracion  = 0;
  let posicion  = 0;
  let uriPintada = null;
  let arrastrando = false;
  let relevo  = null;       // temporizador que encadena la canción siguiente
  let cambioEn = 0;         // cuándo se cambió de canción por última vez

  const conLista = () => canciones.length > 0;

  /* ------------------------------------------------------------- utils -- */
  const reloj = ms => {
    if (!ms || ms < 0) ms = 0;
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  /* ------------------------------------------------- carátula y respaldo --
     El oEmbed público de Spotify sí acepta peticiones de otros dominios. De
     ahí sale la portada, y también el nombre cuando no hay lista. La URL se
     arma con el tipo que trae la propia URI (`spotify:track:…`), porque dando
     por hecho que siempre es una canción, un día no lo es y la consulta falla
     entera: ahí está el "Sonando" sin portada.                               */
  const consultado = new Map();

  async function pedirOEmbed(uri) {
    if (consultado.has(uri)) return consultado.get(uri);

    const [, tipo, id] = uri.split(':');
    const url = `https://open.spotify.com/oembed?url=https://open.spotify.com/${tipo}/${id}`;
    let datos = { titulo: '', tapa: '' };
    try {
      const j = await fetch(url).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)));
      datos = { titulo: j.title || '', tapa: j.thumbnail_url || '' };
    } catch (err) {
      console.info('Spotify no supo decirme qué es', uri, '·', err.message);
    }
    consultado.set(uri, datos);
    return datos;
  }

  /* ---------------------------------------------------- nombre en pantalla */
  async function pintarCancion(uri) {
    if (uri === uriPintada) return;
    uriPintada = uri;

    // Con lista, el nombre es inmediato y fiable; sin ella hay que preguntar.
    const deLista = conLista() ? canciones[indice] : null;
    el.nombre.textContent  = deLista ? deLista.titulo : 'Sonando';
    el.artista.textContent = deLista ? deLista.artista : '';
    el.artista.hidden = !el.artista.textContent;
    el.tapa.hidden = true;
    marcarEnLista();
    pintar();

    if (!uri) return;
    const { titulo, tapa } = await pedirOEmbed(uri);
    if (uri !== uriPintada) return;      // ya cambió de canción

    if (!deLista && titulo) {
      // Sin lista, lo que suena es la playlist entera y Spotify informa de
      // ella, no de la canción. Poner ahí el nombre de la lista haría creer
      // que la canción se llama así: se dice lo que es y punto.
      if (/:(track|episode):/.test(uri)) {
        el.nombre.textContent = titulo;
      } else {
        el.nombre.textContent = 'Sonando';
        el.artista.textContent = 'de la lista ' + titulo;
        el.artista.hidden = false;
      }
    }
    el.boton.title = el.nombre.textContent;
    if (tapa) { el.tapa.src = tapa; el.tapa.hidden = false; }
    pintar();
  }

  /* ------------------------------------------------------------ pintar -- */
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

    // Los adelantos duran de 15 a 30 s y empiezan por el medio. Si dura más,
    // hay sesión de Spotify y suena entera: entonces sobra el aviso.
    const esAdelanto = duracion > 0 && duracion <= 40000;
    el.aviso.hidden = !esAdelanto;
    if (esAdelanto) {
      el.aviso.textContent = `Adelanto de ${Math.round(duracion / 1000)} s, y empieza por el ` +
                             `medio. Ábrela en Spotify para oírla entera.`;
    }
  }

  /* ----------------------------------------------------- lista desplegable */
  function pintarLista() {
    el.listaCanciones.innerHTML = '';
    canciones.forEach((c, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" class="cancion-item" data-i="${i}">
          <span class="cancion-num">${i + 1}</span>
          <span class="cancion-info">
            <span class="cancion-t">${c.titulo}</span>
            <span class="cancion-a">${c.artista}</span>
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

  /* ------------------------------------------------- carga del embed ----- */
  async function pedirLista() {
    try {
      const r = await fetch('/.netlify/functions/playlist?id=' + CFG.SPOTIFY_PLAYLIST);
      if (!r.ok) throw new Error('estado ' + r.status);
      const datos = await r.json();
      canciones = Array.isArray(datos.canciones) ? datos.canciones : [];
    } catch (err) {
      canciones = [];
      console.info('Sin lista de canciones, se usa la playlist entera:', err.message);
    }
    el.caja.classList.toggle('sin-lista', !conLista());
    if (conLista()) pintarLista();
  }

  function arrancarEmbed(API) {
    // Con lista se carga canción a canción; sin ella, la playlist del tirón.
    const uri = conLista() ? canciones[0].uri : 'spotify:playlist:' + CFG.SPOTIFY_PLAYLIST;

    API.createController(
      el.hueco,
      { uri, width: '100%', height: conLista() ? 80 : 352 },
      (ctrl) => {
        control = ctrl;
        listo = true;

        ctrl.addListener('playback_update', (e) => {
          const d = e.data || {};
          sonando  = !d.isPaused;
          duracion = d.duration || 0;
          posicion = d.position || 0;

          if (d.playingURI) pintarCancion(d.playingURI);
          programarRelevo();
          pintar();
        });

        if (conLista()) pintarCancion(canciones[0].uri);
        if (pendiente) { pendiente = false; arrancar(); }
        pintar();
      }
    );
  }

  const script = document.createElement('script');
  script.src = 'https://open.spotify.com/embed/iframe-api/v1';
  script.async = true;
  window.onSpotifyIframeApiReady = (API) => { pedirLista().then(() => arrancarEmbed(API)); };
  document.head.appendChild(script);

  /* ---------------------------------------------------- pasar de canción --
     Spotify no avisa de que una canción acabó: el cursor se queda clavado en
     el final y el reproductor sigue diciendo que suena. Así que se cuenta el
     tiempo que le queda y se salta al cumplirse; si ya está en el final, se
     salta enseguida. El plazo se recalcula en cada aviso de posición, de modo
     que una pausa o un arrastre lo corrigen solos.                          */
  function programarRelevo() {
    clearTimeout(relevo);
    if (!conLista() || !sonando || !duracion) return;

    // Justo después de cambiar de canción pueden llegar avisos rezagados de la
    // anterior, con su duración y su final: sin esta espera encadenarían un
    // salto de más.
    if (Date.now() - cambioEn < 1500) return;

    const eraIndice = indice;
    relevo = setTimeout(() => {
      if (indice === eraIndice && sonando) siguiente(true);
    }, Math.max(duracion - posicion, 0) + 350);
  }

  /* ------------------------------------------------------------ control -- */
  function arrancar() {
    if (!control) { pendiente = true; return; }
    try { control.play(); } catch (err) { console.warn('Spotify:', err); }
  }

  function alternar() {
    if (!control) { pendiente = true; return; }
    control.togglePlay();
  }

  // Cambiar de canción: se carga la nueva en el reproductor y se le da al
  // play. Hace falta un respiro entre las dos cosas, porque el embed tarda un
  // instante en tener lista la canción nueva.
  function ir(i, seguirSonando = true) {
    if (!conLista() || !control) return;
    clearTimeout(relevo);
    cambioEn = Date.now();
    indice = (i + canciones.length) % canciones.length;
    duracion = posicion = 0;

    control.loadUri(canciones[indice].uri);
    pintarCancion(canciones[indice].uri);
    if (seguirSonando) setTimeout(() => { try { control.play(); } catch {} }, 420);
  }

  const siguiente = (auto = false) => ir(indice + 1, auto || sonando);
  const anterior  = () => {
    // Como en cualquier reproductor: si ya sonó un rato, vuelve al principio.
    if (posicion > 3000) { control.restart(); return; }
    ir(indice - 1, sonando);
  };

  el.btnPlay.addEventListener('click', alternar);
  el.btnAntes.addEventListener('click', anterior);
  el.btnDespues.addEventListener('click', () => siguiente(false));
  el.btnReiniciar.addEventListener('click', () => control && control.restart());

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
    if (control && duracion) control.seek(fraccion(ev) * duracion / 1000);  // seek va en segundos
  });
  el.barra.addEventListener('pointercancel', () => {
    arrastrando = false;
    el.barra.classList.remove('tocando');
  });

  el.barra.addEventListener('keydown', ev => {
    if (!control || !duracion) return;
    const salto = ev.key === 'ArrowRight' ? 5000 : ev.key === 'ArrowLeft' ? -5000 : 0;
    if (!salto) return;
    ev.preventDefault();
    control.seek(Math.min(Math.max(posicion + salto, 0), duracion) / 1000);
  });

  /* -------------------------------------------------------- abrir panel -- */
  el.boton.addEventListener('click', () => {
    const abierto = el.caja.classList.toggle('abierta');
    el.boton.setAttribute('aria-expanded', String(abierto));
    // Sin lista, el reproductor de Spotify es lo único que enseña la canción
    // y deja saltar: se abre solo, que si no el panel se queda a medias.
    if (abierto && !conLista()) el.caja.classList.add('con-lista');
    if (abierto && !sonando) arrancar();
  });

  $('#btnCerrarMusica').addEventListener('click', () => {
    el.caja.classList.remove('abierta');
    el.boton.setAttribute('aria-expanded', 'false');
  });

  window.Musica = { arrancar, alternar, siguiente, anterior, ir };
  pintar();
})();
