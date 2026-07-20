/* ==========================================================================
   MÚSICA — playlist de Spotify de fondo
   --------------------------------------------------------------------------
   Usa la IFrame API oficial de Spotify. Lo que se puede y lo que no:

   · La playlist se lee en vivo. Si añades canciones, aparecen solas: el embed
     siempre sirve el contenido actual, no hay nada que actualizar aquí.
   · Los navegadores prohíben el sonido automático sin un gesto del usuario.
     Por eso arrancamos justo cuando ella toca el ramo (ese toque cuenta como
     gesto). En iOS a veces ni así: entonces queda el botón para tocarlo.
   · No hay control de volumen en la IFrame API, así que "silenciar" es pausar.
   · El nombre de la canción no se puede leer por código (el iframe es de otro
     dominio). Se muestra abriendo el panel: el propio reproductor lo enseña.
   · Sin cuenta de Spotify abierta suenan adelantos de 30 s; con sesión
     iniciada (mejor Premium) suena la canción entera.
   ========================================================================== */
(function () {
  'use strict';

  const CFG = window.CONFIG;
  if (!CFG.SPOTIFY_PLAYLIST) return;

  const el = {
    caja:    document.getElementById('musica'),
    boton:   document.getElementById('btnMusica'),
    panel:   document.getElementById('panelMusica'),
    hueco:   document.getElementById('spotifyHueco'),
    estado:  document.getElementById('musicaEstado')
  };
  if (!el.caja) return;

  let control = null;      // controlador del embed
  let sonando = false;
  let listo   = false;
  let pendiente = false;   // hubo intención de sonar antes de estar listo

  function pintar() {
    el.caja.dataset.sonando = sonando ? 'si' : 'no';
    el.boton.setAttribute('aria-label', sonando ? 'Silenciar música' : 'Poner música');
    el.boton.title = sonando ? 'Silenciar' : 'Poner música';
    el.estado.textContent = !listo ? 'cargando…'
                          : sonando ? 'sonando' : 'en silencio';
  }

  /* --------------------------------------------------- carga del embed --- */
  const script = document.createElement('script');
  script.src = 'https://open.spotify.com/embed/iframe-api/v1';
  script.async = true;
  document.head.appendChild(script);

  window.onSpotifyIframeApiReady = (API) => {
    API.createController(
      el.hueco,
      {
        uri: 'spotify:playlist:' + CFG.SPOTIFY_PLAYLIST,
        width: '100%',
        height: 152
      },
      (ctrl) => {
        control = ctrl;
        listo = true;

        ctrl.addListener('playback_update', (e) => {
          sonando = !e.data.isPaused;
          pintar();
        });

        if (pendiente) { pendiente = false; arrancar(); }
        pintar();
      }
    );
  };

  /* ------------------------------------------------------------ control -- */
  function arrancar() {
    if (!control) { pendiente = true; return; }
    try { control.play(); } catch (err) { console.warn('Spotify:', err); }
  }

  function alternar() {
    if (!control) { pendiente = true; return; }
    control.togglePlay();
  }

  el.boton.addEventListener('click', () => {
    // El primer toque abre el panel y arranca; los siguientes silencian.
    if (!el.caja.classList.contains('abierta')) {
      el.caja.classList.add('abierta');
      arrancar();
    } else {
      alternar();
    }
  });

  document.getElementById('btnCerrarMusica').addEventListener('click', () => {
    el.caja.classList.remove('abierta');
  });

  // Intento de arranque con el gesto de entrar al jardín.
  window.Musica = { arrancar, alternar };

  pintar();
})();
