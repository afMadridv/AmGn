/* ==========================================================================
   CIELO — el jardín sigue la hora real de Colombia
   --------------------------------------------------------------------------
   Cuatro momentos: amanecer, día, atardecer y noche. Cambian solos, y el sol
   y la luna recorren su arco según la hora, no en una posición fija.

   La hora se saca con Intl y la zona 'America/Bogota', así da igual dónde
   esté el teléfono que abra el enlace: el jardín va con la hora de Colombia.
   ========================================================================== */
(function () {
  'use strict';

  const jardin   = document.getElementById('jardin');
  const sol      = document.getElementById('sol');
  const luna     = document.getElementById('luna');
  const estrellas = document.getElementById('estrellas');
  if (!jardin) return;

  const ZONA = 'America/Bogota';

  // Fronteras del día, en horas decimales.
  const AMANECE = 5.0;    // empieza a clarear
  const DIA     = 7.0;    // ya es de día
  const ATARDECE = 16.5;  // empieza a dorarse
  const ANOCHECE = 18.5;  // se hace de noche

  // Para mirar el jardín a otra hora sin esperarla: ?hora=21 o ?hora=6.5
  const forzada = (() => {
    const v = new URLSearchParams(location.search).get('hora');
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) && n >= 0 && n < 24 ? n : null;
  })();

  /* --------------------------------------------------- hora de Colombia -- */
  function horaBogota() {
    if (forzada !== null) return forzada;
    const partes = new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    const n = t => Number(partes.find(p => p.type === t).value);
    return n('hour') + n('minute') / 60;
  }

  function momento(h) {
    if (h >= ANOCHECE || h < AMANECE) return 'noche';
    if (h < DIA)      return 'amanecer';
    if (h < ATARDECE) return 'dia';
    return 'atardecer';
  }

  /* ------------------------------------------------- arco del sol/luna --- */
  // Devuelve 0..1 según cuánto ha recorrido el astro su trayecto.
  function recorrido(h) {
    const esDia = h >= AMANECE && h < ANOCHECE;
    if (esDia) return (h - AMANECE) / (ANOCHECE - AMANECE);
    // La noche cruza la medianoche: se normaliza a un tramo continuo.
    const noche = 24 - ANOCHECE + AMANECE;
    const t = h >= ANOCHECE ? h - ANOCHECE : h + (24 - ANOCHECE);
    return t / noche;
  }

  function colocar(el, t) {
    // Arco: sale por la izquierda, culmina arriba en el centro, se pone a la
    // derecha. La altura es una parábola invertida.
    const x = 6 + t * 84;
    const alto = 4 + (1 - Math.sin(t * Math.PI)) * 34;
    el.style.setProperty('--x', x.toFixed(1) + '%');
    el.style.setProperty('--y', alto.toFixed(1) + '%');

    // De dónde viene la luz, para las sombras del suelo (ver .flor-plantada
    // ::after). -1 = astro a la izquierda, +1 = a la derecha; el alto va de 0
    // en el horizonte a 1 en lo más alto del arco.
    jardin.style.setProperty('--sol-x', ((t - .5) * 2).toFixed(3));
    jardin.style.setProperty('--sol-alto', Math.sin(t * Math.PI).toFixed(3));
  }

  /* ------------------------------------------------------- estrellas ----- */
  // Tres capas con box-shadow: muchas estrellas y sólo tres nodos, así el
  // parpadeo no le cuesta nada al móvil.
  function sembrarEstrellas() {
    if (!estrellas || estrellas.childElementCount) return;
    for (let capa = 0; capa < 3; capa++) {
      const puntos = [];
      const cuantas = capa === 2 ? 14 : 30;
      for (let i = 0; i < cuantas; i++) {
        const x = (Math.random() * 100).toFixed(2);
        const y = (Math.random() * 82).toFixed(2);
        // La capa 2 son las estrellas grandes; las otras, polvo de fondo.
        const r = capa === 2 ? 2.4 : (Math.random() < .35 ? 1.7 : 1.1);
        const brillo = (capa === 2 ? 1 : .72 + Math.random() * .28).toFixed(2);
        puntos.push(`${x}vw ${y}vh 0 ${r.toFixed(1)}px rgba(255,255,255,${brillo})`);
      }
      const d = document.createElement('i');
      d.className = 'capa-estrellas';
      d.style.boxShadow = puntos.join(',');
      d.style.animationDuration = (3.2 + capa * 1.6) + 's';
      d.style.animationDelay = (-capa * 1.1) + 's';
      estrellas.appendChild(d);
    }
  }

  /* ------------------------------------------------------------ ciclo ---- */
  let anterior = null;

  function actualizar() {
    const h = horaBogota();
    const m = momento(h);
    jardin.dataset.momento = m;

    const t = recorrido(h);
    colocar(m === 'noche' ? luna : sol, t);

    if (m === 'noche') sembrarEstrellas();

    // Los bichos cambian con la hora: de noche sólo luciérnagas. Se repuebla
    // sólo al cambiar de momento, no en cada repaso del minuto.
    const eraDeNoche = anterior === 'noche';
    if (window.Bichos && (anterior === null || eraDeNoche !== (m === 'noche'))) {
      Bichos.poblar(m);
    }
    anterior = m;
  }

  /* ------------------------------------------------------------ lluvia ---
     De vez en cuando llueve. Se decide una vez por minuto, en el mismo repaso
     que ya hace el ciclo del día: nada de temporizadores nuevos.

     Con ?lluvia=1 se fuerza el chaparrón, para poder verlo sin esperar a que
     toque.                                                                  */
  const LLUEVE_CADA_MINUTO = 0.012;    // ~1 vez cada 80 min de mirar el jardín
  let lloviendoHasta = 0;

  const lluviaForzada = new URLSearchParams(location.search).get('lluvia') === '1';

  function repasarLluvia() {
    if (lluviaForzada) { jardin.dataset.lluvia = 'si'; return; }

    const ahora = Date.now();
    if (ahora < lloviendoHasta) return;              // sigue el chaparrón

    if (jardin.dataset.lluvia === 'si') {
      jardin.dataset.lluvia = 'no';                  // acaba de escampar
      return;
    }
    if (Math.random() < LLUEVE_CADA_MINUTO) {
      jardin.dataset.lluvia = 'si';
      lloviendoHasta = ahora + (45 + Math.random() * 75) * 1000;   // 45-120 s
    }
  }

  function repaso() { actualizar(); repasarLluvia(); }

  repaso();
  setInterval(repaso, 60000);

  // Al volver del segundo plano puede haber pasado media tarde.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) repaso();
  });

  window.Cielo = { actualizar, momento, horaBogota,
                   llover: si => { jardin.dataset.lluvia = si ? 'si' : 'no'; } };
})();
