/* ==========================================================================
   BICHOS DEL JARDÍN
   --------------------------------------------------------------------------
   Dos cosas distintas con el mismo dibujo:

   · Los que vuelan sueltos por el jardín (ambiente). De día mariposa, abeja o
     mariquita; de noche sólo luciérnagas.
   · El que se posa sobre una flor que ella todavía no ha abierto, para que
     sepa de un vistazo cuál es nueva.

   Lo que ella ya leyó se guarda en su propio navegador: no es un dato del
   jardín, es de su visita.
   ========================================================================== */
(function () {
  'use strict';

  const LEIDAS    = 'patico:leidas';
  const GUARDADOS = 'patico:bichos';   // los que se quedaron a vivir aquí

  /* ------------------------------------------------------------ dibujos -- */
  // viewBox 0 0 40 40, mirando a la derecha.
  //
  // Los degradados necesitan un id propio por dibujo: hay varios bichos a la
  // vez en la página y un id repetido haría que todos pintaran con el primero.
  let nId = 0;
  const uid = p => 'bi' + p + (++nId);

  // `.alas` la anima el CSS con un transform. Nunca va en un <g> que tenga ya
  // un atributo transform: el del CSS lo pisaría y el ala saltaría de sitio.
  // Por eso el ala derecha de la mariposa va en dos grupos anidados.
  const DIBUJO = {
    mariposa: (c1, c2) => {
      const fa = uid('fa'), fb = uid('fb');
      const ala = `
        <path d="M19.4,18.4 C 15,9.2 7.2,3.6 3.6,6.6 C 1.5,8.6 2.6,14.2 6.2,17.6 C 9.6,20.6 15,20.6 19.4,19.6 Z"
              fill="url(#${fa})" stroke="#6e3a5e" stroke-width=".8"/>
        <path d="M5.2,8 C 4.2,10.6 4.6,14 6.8,16.2" fill="none" stroke="#6e3a5e" stroke-width="2" opacity=".28"/>
        <circle cx="4.6" cy="9.4" r=".55" fill="#fff" opacity=".9"/>
        <circle cx="4.2" cy="12.4" r=".55" fill="#fff" opacity=".9"/>
        <circle cx="5.2" cy="15.2" r=".55" fill="#fff" opacity=".9"/>
        <path d="M19,18.6 L6,9 M19,18.8 L4.6,13 M19,19 L7,17.2" stroke="#6e3a5e" stroke-width=".4" opacity=".45"/>
        <path d="M19.4,20.6 C 14,21.2 7.6,23.2 6.6,28 C 6,31.6 9,33.6 12.6,32.6 C 16,31.6 18.6,26 19.4,21.6 Z"
              fill="url(#${fb})" stroke="#6e3a5e" stroke-width=".8"/>
        <path d="M19,21 L9,28.6 M19,21.2 L13,31" stroke="#6e3a5e" stroke-width=".4" opacity=".45"/>
        <circle cx="10.6" cy="28.4" r="1.9" fill="#fff5d6"/>
        <circle cx="10.6" cy="28.4" r="1.1" fill="#6a3a7a"/>
        <circle cx="10.3" cy="28.1" r=".4" fill="#fff"/>`;
      return `<defs>
          <linearGradient id="${fa}" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="${c2}"/><stop offset=".55" stop-color="${c1}"/>
            <stop offset="1" stop-color="#fff4f9"/></linearGradient>
          <linearGradient id="${fb}" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/></linearGradient>
        </defs>
        <g class="alas">${ala}</g>
        <g class="alas alas--der"><g transform="translate(40 0) scale(-1 1)">${ala}</g></g>
        <path d="M19.6,12.8 Q17.6,8 15,6.6" fill="none" stroke="#3d2b43" stroke-width=".7"/>
        <path d="M20.4,12.8 Q22.4,8 25,6.6" fill="none" stroke="#3d2b43" stroke-width=".7"/>
        <circle cx="15" cy="6.6" r=".8" fill="#3d2b43"/><circle cx="25" cy="6.6" r=".8" fill="#3d2b43"/>
        <circle cx="20" cy="13.8" r="1.5" fill="#3d2b43"/>
        <ellipse cx="20" cy="17.6" rx="1.9" ry="2.6" fill="#4a3550" stroke="#6b5470"
                 stroke-width=".6" stroke-dasharray=".4 .5"/>
        <ellipse cx="20" cy="24.4" rx="1.4" ry="5" fill="#4a3550"/>
        <path d="M18.8,22 Q20,22.6 21.2,22 M18.8,24 Q20,24.6 21.2,24 M18.8,26 Q20,26.6 21.2,26 M18.8,28 Q20,28.6 21.2,28"
              fill="none" stroke="#7a6480" stroke-width=".4"/>`;
    },

    // Lo que la diferencia de una avispa es la pelusa: el contorno punteado
    // del abdomen y el tórax. Las rayas se recortan al cuerpo para que sigan
    // su curva en vez de ir pegadas encima.
    abeja: () => {
      const cu = uid('cu'), to = uid('to'), al = uid('al'), cl = uid('cl');
      return `<defs>
          <radialGradient id="${cu}" cx="40%" cy="32%" r="75%">
            <stop offset="0" stop-color="#ffe476"/><stop offset=".5" stop-color="#f5b923"/>
            <stop offset="1" stop-color="#c7860c"/></radialGradient>
          <radialGradient id="${to}" cx="40%" cy="35%" r="70%">
            <stop offset="0" stop-color="#b98748"/><stop offset="1" stop-color="#6a4520"/></radialGradient>
          <linearGradient id="${al}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#f1fbff" stop-opacity=".95"/>
            <stop offset=".6" stop-color="#e3f0ff" stop-opacity=".75"/>
            <stop offset="1" stop-color="#f0e4ff" stop-opacity=".7"/></linearGradient>
          <clipPath id="${cl}"><ellipse cx="15.5" cy="23" rx="9.5" ry="7"/></clipPath>
        </defs>
        <g class="alas"><g transform="rotate(-24 17.5 11.5)">
          <ellipse cx="17.5" cy="11.5" rx="8.6" ry="4.4" fill="url(#${al})" stroke="#9dbbd3" stroke-width=".6"/>
          <path d="M24,11.6 Q18,11 10,11.2 M22.4,13 Q17.4,13.4 12.4,13" fill="none" stroke="#9dbbd3" stroke-width=".35"/>
        </g></g>
        <g class="alas alas--der"><g transform="rotate(-8 22.5 12.8)">
          <ellipse cx="22.5" cy="12.8" rx="6" ry="3.2" fill="url(#${al})" stroke="#9dbbd3" stroke-width=".6"/>
        </g></g>
        <path d="M5.2,23.6 L7.6,22.4 L7.6,24.8 Z" fill="#2e2416"/>
        <ellipse cx="15.5" cy="23" rx="9.5" ry="7" fill="url(#${cu})"/>
        <g clip-path="url(#${cl})" fill="none" stroke="#2e2416" stroke-width="2.3">
          <path d="M10.6,15.4 C 9.2,19.6 9.2,26.4 10.6,30.6"/>
          <path d="M15,15.6 C 13.8,19.6 13.8,26.4 15,30.4"/>
          <path d="M19.4,16 C 18.4,19.8 18.4,26.2 19.4,30"/></g>
        <ellipse cx="15.5" cy="23" rx="9.5" ry="7" fill="none" stroke="#f7d36a" stroke-width="1.3"
                 stroke-dasharray=".5 .8" opacity=".9"/>
        <ellipse cx="13.6" cy="19.2" rx="4.5" ry="1.6" fill="#fff" opacity=".35"/>
        <circle cx="24.4" cy="20.8" r="4.6" fill="url(#${to})"/>
        <circle cx="24.4" cy="20.8" r="4.9" fill="none" stroke="#d6ae70" stroke-width="1.2" stroke-dasharray=".45 .7"/>
        <path d="M22.4,25 L21.4,28.6 M24.6,25.4 L24.8,29.2 M26.4,24.6 L27.8,28" stroke="#2e2416"
              stroke-width=".8" stroke-linecap="round"/>
        <ellipse cx="21.5" cy="28.5" rx="1.4" ry="1.1" fill="#f39a2a"/>
        <ellipse cx="29.8" cy="21.2" rx="3.4" ry="3.8" fill="#2e2416"/>
        <ellipse cx="30.9" cy="20.2" rx="1.5" ry="2.1" fill="#0f0b07"/>
        <circle cx="31.3" cy="19.4" r=".55" fill="#fff" opacity=".9"/>
        <path d="M30.2,17.6 Q31.6,13.6 34,12.6" fill="none" stroke="#2e2416" stroke-width=".8"/>
        <path d="M29,17.8 Q29.6,14 31.4,12.2" fill="none" stroke="#2e2416" stroke-width=".8"/>`;
    },

    // La de siete puntos: el central partido por la raya, las manchas blancas
    // del pronoto, seis patas y antenas con maza. El brillo va en el borde del
    // caparazón: encima de un punto lo convertía en una mancha gris.
    mariquita: () => {
      const g = uid('mq');
      const patas = `
        <path d="M14,19 L8,16.5 L6,18.5 M13.5,23 L7.5,23.5 L5.5,26.5 M15,27 L10.5,30 L9.5,33.5"
              fill="none" stroke="#231512" stroke-width=".9" stroke-linejoin="round"/>`;
      const manchas = [[15.4, 19.6, 2.1], [13.9, 25.1, 1.9], [17.3, 28.8, 1.35]];
      return `<defs><radialGradient id="${g}" cx="36%" cy="30%" r="78%">
          <stop offset="0" stop-color="#ff8a66"/><stop offset=".42" stop-color="#e6402e"/>
          <stop offset="1" stop-color="#9c1c16"/></radialGradient></defs>
        ${patas}<g transform="translate(40 0) scale(-1 1)">${patas}</g>
        <path d="M19,8.2 Q17.4,5.4 16.2,4.2 M21,8.2 Q22.6,5.4 23.8,4.2" fill="none" stroke="#231512" stroke-width=".8"/>
        <circle cx="16" cy="4" r=".9" fill="#231512"/><circle cx="24" cy="4" r=".9" fill="#231512"/>
        <ellipse cx="20" cy="10.4" rx="4" ry="3" fill="#1d1210"/>
        <path d="M13.2,15.2 C 13.6,11.6 26.4,11.6 26.8,15.2 Z" fill="#1d1210"/>
        <ellipse cx="15.9" cy="13.9" rx="1.5" ry="1" fill="#fbf6ee"/>
        <ellipse cx="24.1" cy="13.9" rx="1.5" ry="1" fill="#fbf6ee"/>
        <path d="M20,15 C 13.2,14.6 9.6,19.4 10,24.2 C 10.5,29.6 15,32.6 20,32.1 Z"
              fill="url(#${g})" stroke="#6b1310" stroke-width=".85"/>
        <path d="M20,15 C 26.8,14.6 30.4,19.4 30,24.2 C 29.5,29.6 25,32.6 20,32.1 Z"
              fill="url(#${g})" stroke="#6b1310" stroke-width=".85"/>
        <path d="M20,15 L20,32.1" stroke="#6b1310" stroke-width="1"/>
        ${manchas.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#1d1210"/>
          <circle cx="${40 - x}" cy="${y}" r="${r}" fill="#1d1210"/>`).join('')}
        <circle cx="20" cy="16.6" r="2" fill="#1d1210"/>
        <ellipse cx="12.1" cy="21.6" rx="1.1" ry="3.2" fill="#fff" opacity=".5" transform="rotate(16 12.1 21.6)"/>
        <circle cx="11.9" cy="19.1" r=".6" fill="#fff" opacity=".9"/>`;
    },

    // La luz de verdad de una luciérnaga es verde-amarilla (#d6ff5a) y va en
    // destellos. El brillo está pintado dentro del propio dibujo: antes eran
    // tres drop-shadow encadenados por bicho, recalculándose en cada fotograma.
    luciernaga: () => {
      const gl = uid('lu');
      return `<defs><radialGradient id="${gl}">
          <stop offset="0" stop-color="#fbffd4"/>
          <stop offset=".2" stop-color="#e8ff80" stop-opacity=".9"/>
          <stop offset=".5" stop-color="#c8ff4a" stop-opacity=".32"/>
          <stop offset="1" stop-color="#b8f040" stop-opacity="0"/></radialGradient></defs>
        <g class="farol" style="transform-origin:12.5px 22px">
          <circle cx="12.5" cy="22" r="20" fill="url(#${gl})"/>
        </g>
        <ellipse cx="18.5" cy="21.3" rx="6.6" ry="3.8" fill="#3a2f22"/>
        <!-- El farol apagado no es negro: es un amarillo pálido. Encima, el
             encendido, que es el que parpadea con el halo. -->
        <ellipse cx="12.6" cy="22" rx="4.2" ry="3.3" fill="#c9d47a"/>
        <g class="farol" style="transform-origin:12.5px 22px">
          <ellipse cx="12.6" cy="22" rx="4.2" ry="3.3" fill="#f6ffc2"/>
          <ellipse cx="12.2" cy="21.8" rx="2.2" ry="1.7" fill="#fff"/>
        </g>
        <path d="M13.6,19.4 C 17,16.8 22.6,16.8 24.8,19.2 C 23,21.4 17.4,21.8 13.6,20.6 Z"
              fill="#4b3a26" stroke="#c9a35a" stroke-width=".5"/>
        <g class="alas"><ellipse cx="18" cy="17.4" rx="5.6" ry="2" fill="#f6f2ff" opacity=".28"/></g>
        <ellipse cx="26" cy="19.6" rx="3" ry="2.5" fill="#e79a6a"/>
        <ellipse cx="26.3" cy="19.4" rx="1.1" ry=".9" fill="#2a1d12"/>
        <circle cx="28.6" cy="20.6" r="1.4" fill="#2a1d12"/>
        <path d="M29.4,19.6 Q31.4,16.6 33.4,16" fill="none" stroke="#2a1d12" stroke-width=".7"/>`;
    }
  };

  const PALETAS = [
    ['#f5a3c7', '#e6739f'], ['#ffd48a', '#f0a03c'],
    ['#a9c8f5', '#6f9be0'], ['#d9b2f0', '#a877d8']
  ];

  function svgBicho(tipo) {
    const p = PALETAS[Math.floor(Math.random() * PALETAS.length)];
    return `<svg class="bicho-svg" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"
                 aria-hidden="true">${DIBUJO[tipo](p[0], p[1])}</svg>`;
  }

  /* ------------------------------------------------- bichos de ambiente -- */
  const cielo = document.getElementById('jardin');
  let sueltos = [];

  function limpiarSueltos() {
    sueltos.forEach(b => b.remove());
    sueltos = [];
  }

  // `desdeFuera`: entra por el borde en vez de aparecer a mitad de vuelo.
  function soltar(tipo, i, desdeFuera) {
    const b = document.createElement('div');
    b.className = 'bicho bicho--' + tipo;
    b.innerHTML = svgBicho(tipo);

    // Cada uno con su ruta, su altura y su ritmo, para que no parezcan copias.
    b.style.setProperty('--alto', (18 + Math.random() * 42).toFixed(1) + '%');
    b.style.setProperty('--vuelo', (16 + Math.random() * 16).toFixed(1) + 's');
    b.style.setProperty('--sube', (2.2 + Math.random() * 2).toFixed(1) + 's');
    b.style.setProperty('--aleteo', (tipo === 'abeja' ? .12 : .34).toFixed(2) + 's');
    b.style.setProperty('--retraso', desdeFuera ? '0s' : (-Math.random() * 18).toFixed(1) + 's');
    b.style.setProperty('--tam', (0.7 + Math.random() * 0.5).toFixed(2));
    // Cada luciérnaga destella a su ritmo: si fueran todas a la vez parecería
    // un letrero, no un bicho.
    if (tipo === 'luciernaga') {
      b.style.setProperty('--ritmo', (2.2 + Math.random() * 1.8).toFixed(2) + 's');
      b.style.setProperty('--desfase', (-Math.random() * 3).toFixed(2) + 's');
    }
    if (Math.random() < .5) b.classList.add('al-reves');

    cielo.appendChild(b);
    sueltos.push(b);
  }

  /* ------------------------------------------- los que se quedan a vivir --
     Cuando ella abre una nota, el bicho que estaba posado no desaparece: se
     queda revoloteando por el jardín, y sigue ahí la próxima vez que entre.
     ---------------------------------------------------------------------- */
  function leerGuardados() {
    try { return JSON.parse(localStorage.getItem(GUARDADOS)) || []; }
    catch { return []; }
  }

  function guardarBicho(tipo) {
    const lista = leerGuardados();
    lista.push(tipo);
    // Un tope, para que un jardín muy leído no acabe siendo un enjambre.
    try { localStorage.setItem(GUARDADOS, JSON.stringify(lista.slice(-14))); } catch {}
  }

  // De día los tres de siempre más los que se han ido quedando; de noche sólo
  // luciérnagas, que los demás duermen.
  function poblar(momento) {
    limpiarSueltos();
    if (momento === 'noche') {
      for (let i = 0; i < 5; i++) soltar('luciernaga', i);
    } else {
      const tipos = ['mariposa', 'abeja', 'mariquita'];
      tipos.sort(() => Math.random() - .5).forEach(soltar);
      leerGuardados().forEach(soltar);
    }
  }

  /* ----------------------------------------- el bicho de la flor nueva --- */
  function leidas() {
    try { return new Set(JSON.parse(localStorage.getItem(LEIDAS)) || []); }
    catch { return new Set(); }
  }

  function marcarLeida(id) {
    const s = leidas();
    s.add(id);
    try { localStorage.setItem(LEIDAS, JSON.stringify([...s])); } catch {}
  }

  function esNueva(id) { return !leidas().has(id); }

  // Se posa encima de la flor mientras ella no la haya abierto.
  function posarEn(nodo, semilla) {
    if (nodo.querySelector('.bicho-posado')) return;
    const tipos = ['mariposa', 'abeja', 'mariquita'];
    let s = 0;
    for (let i = 0; i < String(semilla).length; i++) {
      s = (s * 31 + String(semilla).charCodeAt(i)) % 997;
    }
    const tipo = tipos[s % 3];
    const b = document.createElement('span');
    b.className = 'bicho-posado';
    b.dataset.tipo = tipo;
    b.innerHTML = svgBicho(tipo);
    b.style.setProperty('--aleteo', '.5s');
    nodo.appendChild(b);
  }

  // Al leer la nota, el bicho levanta el vuelo y se queda en el jardín.
  function quitarDe(nodo) {
    const b = nodo.querySelector('.bicho-posado');
    if (!b || b.classList.contains('se-va')) return;
    const tipo = b.dataset.tipo || 'mariposa';
    b.classList.add('se-va');
    setTimeout(() => {
      b.remove();
      guardarBicho(tipo);
      // Sólo se une a los que vuelan si es de día; de noche esperará.
      if (cielo.dataset.momento !== 'noche') soltar(tipo);
    }, 700);
  }

  /* Un bicho abatido (js/disparos.js) deja de contar, y al rato llega otro
     del mismo tipo entrando por el borde: el jardín no se queda vacío por
     mucho que se dispare. Si entretanto cambió de día a noche, poblar() ya
     rehízo los bichos y éste no vuelve. */
  function abatido(b) {
    sueltos = sueltos.filter(x => x !== b);
    const tipo = (b.className.match(/bicho--(\w+)/) || [])[1];
    if (!DIBUJO[tipo]) return;
    const deNoche = cielo.dataset.momento === 'noche';
    setTimeout(() => {
      if ((cielo.dataset.momento === 'noche') === deNoche) soltar(tipo, 0, true);
    }, 6000 + Math.random() * 6000);
  }

  window.Bichos = { poblar, posarEn, quitarDe, esNueva, marcarLeida, svgBicho, abatido };
})();
