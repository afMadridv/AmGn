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
  const DIBUJO = {
    mariposa: (c1, c2) => `
      <g class="alas">
        <path d="M20,20 C 12,6 2,6 4,16 C 5,22 13,22 20,20 Z"  fill="${c1}" stroke="#6b4a63" stroke-width="1.1"/>
        <path d="M20,20 C 12,34 2,34 4,25 C 5,19 13,18 20,20 Z" fill="${c2}" stroke="#6b4a63" stroke-width="1.1"/>
      </g>
      <g class="alas alas--der">
        <path d="M20,20 C 28,6 38,6 36,16 C 35,22 27,22 20,20 Z"  fill="${c1}" stroke="#6b4a63" stroke-width="1.1"/>
        <path d="M20,20 C 28,34 38,34 36,25 C 35,19 27,18 20,20 Z" fill="${c2}" stroke="#6b4a63" stroke-width="1.1"/>
      </g>
      <ellipse cx="20" cy="20" rx="2.1" ry="7" fill="#4a3550"/>
      <path d="M20,14 q -3,-5 -6,-6" stroke="#4a3550" stroke-width="1" fill="none"/>
      <path d="M20,14 q  3,-5  6,-6" stroke="#4a3550" stroke-width="1" fill="none"/>`,

    abeja: () => `
      <g class="alas">
        <ellipse cx="16" cy="13" rx="8" ry="5" fill="#dff0fb" opacity=".85" stroke="#a9c6d8" stroke-width=".8"/>
      </g>
      <g class="alas alas--der">
        <ellipse cx="24" cy="13" rx="7" ry="4.5" fill="#dff0fb" opacity=".8" stroke="#a9c6d8" stroke-width=".8"/>
      </g>
      <ellipse cx="20" cy="22" rx="10" ry="7.5" fill="#f6c527" stroke="#7a5a10" stroke-width="1.2"/>
      <path d="M17,15.2 C 16,19 16,25 17,28.8" stroke="#3b2f1a" stroke-width="2.6" fill="none"/>
      <path d="M22,15.6 C 21,19 21,25 22,28.4" stroke="#3b2f1a" stroke-width="2.6" fill="none"/>
      <circle cx="28.5" cy="20" r="4.6" fill="#3b2f1a"/>
      <circle cx="30" cy="18.6" r="1" fill="#fff" opacity=".75"/>
      <path d="M29,15 q 2,-4 4,-5" stroke="#3b2f1a" stroke-width="1" fill="none"/>`,

    mariquita: () => `
      <ellipse cx="20" cy="21" rx="10" ry="9" fill="#d63b31" stroke="#7d1a16" stroke-width="1.2"/>
      <path d="M20,12.2 C 20,18 20,24 20,29.9" stroke="#7d1a16" stroke-width="1.4"/>
      <circle cx="15" cy="18" r="2" fill="#2b1a18"/>
      <circle cx="25" cy="18" r="2" fill="#2b1a18"/>
      <circle cx="14.5" cy="24.5" r="1.7" fill="#2b1a18"/>
      <circle cx="25.5" cy="24.5" r="1.7" fill="#2b1a18"/>
      <path d="M10,21 a 10,9 0 0 1 20,0 z" fill="#fff" opacity=".12"/>
      <circle cx="20" cy="12" r="4.4" fill="#2b1a18"/>
      <path d="M18,8.6 q -1.5,-3 -3.5,-4" stroke="#2b1a18" stroke-width="1" fill="none"/>
      <path d="M22,8.6 q  1.5,-3  3.5,-4" stroke="#2b1a18" stroke-width="1" fill="none"/>`,

    luciernaga: () => `
      <ellipse cx="21" cy="20" rx="6" ry="4" fill="#4a4230" stroke="#2e2a1e" stroke-width=".9"/>
      <circle cx="26" cy="19" r="3" fill="#3a3527"/>
      <g class="farol" style="transform-origin:14px 21px">
        <ellipse cx="14" cy="21" rx="9" ry="7.5" fill="#fbf7b0" opacity=".3"/>
        <ellipse cx="14" cy="21" rx="6"  ry="4.8" fill="#fdfabf" opacity=".75"/>
        <ellipse cx="14" cy="21" rx="3.6" ry="2.9" fill="#ffffff"/>
      </g>
      <g class="alas">
        <ellipse cx="20" cy="15" rx="6" ry="3" fill="#fdfbe8" opacity=".55"/>
      </g>`
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

  function soltar(tipo, i) {
    const b = document.createElement('div');
    b.className = 'bicho bicho--' + tipo;
    b.innerHTML = svgBicho(tipo);

    // Cada uno con su ruta, su altura y su ritmo, para que no parezcan copias.
    b.style.setProperty('--alto', (18 + Math.random() * 42).toFixed(1) + '%');
    b.style.setProperty('--vuelo', (16 + Math.random() * 16).toFixed(1) + 's');
    b.style.setProperty('--sube', (2.2 + Math.random() * 2).toFixed(1) + 's');
    b.style.setProperty('--aleteo', (tipo === 'abeja' ? .12 : .34).toFixed(2) + 's');
    b.style.setProperty('--retraso', (-Math.random() * 18).toFixed(1) + 's');
    b.style.setProperty('--tam', (0.7 + Math.random() * 0.5).toFixed(2));
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

  window.Bichos = { poblar, posarEn, quitarDe, esNueva, marcarLeida, svgBicho };
})();
