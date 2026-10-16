/* ==========================================================================
   DISPAROS — el patico contra los bichos
   --------------------------------------------------------------------------
   Tocar un bicho de los que vuelan:
     1. el bicho se queda quieto, del susto;
     2. el patico se planta donde esté, se gira y saca su pistolita;
     3. ¡pum!: fogonazo, la bala cruza hasta el bicho y estalla;
     4. el bicho cae dando vueltas hasta el pasto;
     5. de él sale su fantasmita, que sube ondulando hasta desaparecer;
     6. al rato llega otro bicho (Bichos.abatido).

   Todo se anima con transform y opacity (Web Animations), como el resto del
   jardín: nada que repintar en cada fotograma. El sonido se genera en el
   momento con Web Audio, sin archivos.

   Sólo los bichos que vuelan sueltos (.bicho). El que está posado sobre una
   flor sin leer no se toca: tocarlo abre la nota.
   ========================================================================== */
(function () {
  'use strict';

  const jardin = document.getElementById('jardin');
  const patico = document.getElementById('patico');
  if (!jardin || !patico) return;

  /* --------------------------------------------------- coordenadas ------
     El jardín va escalado (ver --zoom en estilos.css): los píxeles de la
     pantalla no son sus píxeles. Esto pasa de unos a otros.               */
  function local(xPantalla, yPantalla) {
    const r = jardin.getBoundingClientRect();
    return {
      x: (xPantalla - r.left) * jardin.offsetWidth / r.width,
      y: (yPantalla - r.top) * jardin.offsetHeight / r.height
    };
  }
  const centro = nodo => {
    const r = nodo.getBoundingClientRect();
    return local(r.left + r.width / 2, r.top + r.height / 2);
  };

  // Un efecto suelto en el jardín, en coordenadas del jardín.
  function poner(clase, x, y, html = '') {
    const n = document.createElement('div');
    n.className = clase;
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    n.innerHTML = html;
    jardin.appendChild(n);
    return n;
  }

  /* ------------------------------------------------------------ sonido --
     El "pum": un golpe grave que baja de tono (el cuerpo del disparo) y un
     soplo de ruido corto (el chasquido). Y al caer el bicho, un silbido que
     baja, de dibujo animado. El contexto de audio se crea en el primer
     toque: los navegadores no dejan sonar nada antes de que la persona toque. */
  let audio = null;
  function contexto() {
    if (!audio) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      audio = new C();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  function pum() {
    const a = contexto();
    if (!a) return;
    const t = a.currentTime;

    const golpe = a.createOscillator();
    const gg = a.createGain();
    golpe.type = 'sine';
    golpe.frequency.setValueAtTime(170, t);
    golpe.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    gg.gain.setValueAtTime(0.0001, t);
    gg.gain.exponentialRampToValueAtTime(0.55, t + 0.008);
    gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    golpe.connect(gg).connect(a.destination);
    golpe.start(t); golpe.stop(t + 0.25);

    const largo = Math.floor(a.sampleRate * 0.09);
    const buf = a.createBuffer(1, largo, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / largo);
    const ruido = a.createBufferSource();
    ruido.buffer = buf;
    const filtro = a.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 1900;
    const gr = a.createGain();
    gr.gain.value = 0.32;
    ruido.connect(filtro).connect(gr).connect(a.destination);
    ruido.start(t);
  }

  function silbido(duracion) {
    const a = contexto();
    if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1150, t);
    o.frequency.exponentialRampToValueAtTime(260, t + duracion);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + duracion + 0.05);
  }

  /* ----------------------------------------------------------- la pistola
     Va dentro del patico, así que se gira con él (--mira). Apunta girando
     sobre la culata. `.pistola-boca` marca el cañón: de ahí sale la bala. */
  const pistola = document.createElement('span');
  pistola.className = 'pistola';
  pistola.setAttribute('aria-hidden', 'true');
  pistola.innerHTML = `
    <svg viewBox="0 0 44 26" xmlns="http://www.w3.org/2000/svg">
      <path d="M9,12 L6.5,23 Q6.3,24.6 8,24.6 L13.6,24.6 Q15,24.6 15.3,23.2 L17.6,12 Z"
            fill="#5b8def" stroke="#2c4a8a" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M8.6,15.4 L14.4,15.4 M8,18.6 L13.8,18.6" stroke="#2c4a8a" stroke-width=".8" opacity=".5"/>
      <path d="M17.2,12.4 Q18,17.4 22.6,17 Q23.4,16.8 23.2,15.6 L22.6,12.4"
            fill="none" stroke="#2c4a8a" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M19.8,12.4 L20.6,15.4" stroke="#2c4a8a" stroke-width="1.4" stroke-linecap="round"/>
      <rect x="3.6" y="3.4" width="31" height="10" rx="4.2"
            fill="#ef5b6e" stroke="#8a2433" stroke-width="1.2"/>
      <rect x="31.6" y="4.8" width="9.4" height="7.2" rx="2.2"
            fill="#ffd23f" stroke="#a87a10" stroke-width="1.1"/>
      <rect x="39" y="6.2" width="2.6" height="4.4" rx="1" fill="#3a2a1a"/>
      <path d="M7,5.8 L28,5.8" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
      <path d="M13.4,8.6 l1.1,-2.2 l1.1,2.2 l2.3,.3 l-1.7,1.6 l.4,2.3 l-2.1,-1.1 l-2.1,1.1 l.4,-2.3 l-1.7,-1.6 z"
            fill="#ffe680" stroke="#a87a10" stroke-width=".5"/>
    </svg>
    <i class="pistola-boca"></i>`;
  patico.appendChild(pistola);
  const boca = pistola.querySelector('.pistola-boca');

  let guardarT = null;
  let fuera = false;
  let apunta = 0;      // grados de giro de la pistola ahora mismo

  // Ángulo hacia el blanco, en grados: positivo es hacia arriba. Se limita
  // para que el patico no se parta el cuello apuntando a la vertical.
  function angulo(origen, destino) {
    const dx = Math.abs(destino.x - origen.x) || 1;
    const dy = origen.y - destino.y;
    return Math.max(-35, Math.min(70, Math.atan2(dy, dx) * 180 / Math.PI));
  }

  // El giro queda en la variable --apunta (lo lee el CSS de .pistola.fuera);
  // las animaciones llevan el número ya escrito, porque var() dentro de una
  // animación de Web Animations no la entienden todos los navegadores.
  function sacar(grados) {
    clearTimeout(guardarT);
    const antes = apunta;
    apunta = -grados;
    pistola.style.setProperty('--apunta', apunta.toFixed(1) + 'deg');
    if (!fuera) {
      fuera = true;
      pistola.classList.add('fuera');
      pistola.animate([
        { transform: 'rotate(60deg) scale(.2)', opacity: 0 },
        { transform: `rotate(${apunta.toFixed(1)}deg) scale(1.1)`, opacity: 1, offset: .7 },
        { transform: `rotate(${apunta.toFixed(1)}deg) scale(1)`, opacity: 1 }
      ], { duration: 200, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    } else {
      // Ya estaba fuera (disparos seguidos): sólo reapunta.
      pistola.animate([
        { transform: `rotate(${antes.toFixed(1)}deg)` },
        { transform: `rotate(${apunta.toFixed(1)}deg)` }
      ], { duration: 120, easing: 'ease-out' });
    }
  }

  function retroceso() {
    const g = apunta.toFixed(1);
    pistola.animate([
      { transform: `rotate(${g}deg) translateX(0)` },
      { transform: `rotate(${(apunta - 16).toFixed(1)}deg) translateX(-18%)`, offset: .25 },
      { transform: `rotate(${g}deg) translateX(0)` }
    ], { duration: 260, easing: 'ease-out' });
  }

  function guardarLuego() {
    clearTimeout(guardarT);
    guardarT = setTimeout(() => {
      const a = pistola.animate([
        { transform: `rotate(${apunta.toFixed(1)}deg) scale(1)`, opacity: 1 },
        { transform: 'rotate(70deg) scale(.2)', opacity: 0 }
      ], { duration: 220, easing: 'ease-in' });
      a.onfinish = () => { pistola.classList.remove('fuera'); fuera = false; };
    }, 900);
  }

  /* ------------------------------------------------------------- efectos */
  // Los efectos se centran en su punto con `translate: -50% -50%` en el CSS;
  // la animación sólo mueve `transform`, que se aplica encima.
  function fogonazo(p) {
    const f = poner('fogonazo', p.x, p.y);
    f.animate([
      { transform: 'rotate(0deg) scale(.3)', opacity: 1 },
      { transform: 'rotate(20deg) scale(1.3)', opacity: .95, offset: .4 },
      { transform: 'rotate(30deg) scale(1.6)', opacity: 0 }
    ], { duration: 170, easing: 'ease-out' }).onfinish = () => f.remove();
  }

  function bala(desde, hasta, alLlegar) {
    const dx = hasta.x - desde.x, dy = hasta.y - desde.y;
    const dist = Math.hypot(dx, dy);
    const giro = Math.atan2(dy, dx) * 180 / Math.PI;
    const b = poner('bala', desde.x, desde.y);
    const dur = Math.max(90, Math.min(260, dist / 2.6));
    b.animate([
      { transform: `rotate(${giro}deg) translateX(0) scaleX(.4)` },
      { transform: `rotate(${giro}deg) translateX(${dist.toFixed(1)}px) scaleX(1)` }
    ], { duration: dur, easing: 'linear' }).onfinish = () => { b.remove(); alLlegar(); };
  }

  function estallido(p) {
    const e = poner('estallido', p.x, p.y);
    e.animate([
      { transform: 'scale(.2) rotate(0deg)', opacity: 1 },
      { transform: 'scale(1.15) rotate(25deg)', opacity: 1, offset: .35 },
      { transform: 'scale(1.4) rotate(35deg)', opacity: 0 }
    ], { duration: 340, easing: 'ease-out' }).onfinish = () => e.remove();

    // Chispas que salen disparadas en estrella.
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + Math.random() * .5;
      const r = 18 + Math.random() * 16;
      const c = poner('chispa', p.x, p.y);
      c.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${(Math.cos(ang) * r).toFixed(1)}px,${(Math.sin(ang) * r).toFixed(1)}px) scale(.3)`, opacity: 0 }
      ], { duration: 360 + Math.random() * 120, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => c.remove();
    }
  }

  /* --------------------------------------------- el bicho cae y su alma -- */
  function caer(bicho) {
    const p = centro(bicho);
    // Cae al pasto o a la tierra, no siempre al mismo sitio.
    const suelo = jardin.offsetHeight * (0.64 + Math.random() * 0.14);
    const dy = Math.max(30, suelo - p.y);
    const dx = (Math.random() * 2 - 1) * 26;
    const vueltas = (Math.random() < .5 ? -1 : 1) * (360 + Math.random() * 260);
    const dur = Math.min(1150, 520 + dy * 1.1);

    silbido(dur / 1000);
    const caida = bicho.animate([
      { transform: 'translate(0,0) rotate(0deg)' },
      { transform: `translate(${dx * .4}px,-14px) rotate(${vueltas * .1}deg)`, offset: .12 },
      { transform: `translate(${dx}px,${dy}px) rotate(${vueltas}deg)` }
    ], { duration: dur, easing: 'cubic-bezier(.45,0,.9,.6)', fill: 'forwards' });

    caida.onfinish = () => {
      const donde = centro(bicho);
      fantasma(bicho, donde);
      bicho.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: 'forwards' })
        .onfinish = () => bicho.remove();
    };
  }

  // El fantasmita: el mismo dibujo del bicho, en blanco y translúcido, con su
  // aureola, subiendo y meciéndose hasta perderse.
  function fantasma(bicho, p) {
    const svg = bicho.querySelector('svg');
    if (!svg) return;
    const ancho = bicho.getBoundingClientRect().width * jardin.offsetWidth /
                  jardin.getBoundingClientRect().width;
    const f = poner('fantasma', p.x, p.y);
    f.style.width = Math.max(18, ancho * 1.1) + 'px';
    f.appendChild(svg.cloneNode(true));
    if (bicho.classList.contains('al-reves')) f.classList.add('al-reves');

    const lado = Math.random() < .5 ? -1 : 1;
    f.animate([
      { transform: 'translate(0,0) scale(.5)', opacity: 0 },
      { transform: `translate(${lado * 4}px,-14px) scale(1)`, opacity: .85, offset: .15 },
      { transform: `translate(${-lado * 12}px,-60px) scale(1)`, opacity: .75, offset: .45 },
      { transform: `translate(${lado * 10}px,-110px) scale(.95)`, opacity: .5, offset: .72 },
      { transform: `translate(${-lado * 6}px,-170px) scale(.85)`, opacity: 0 }
    ], { duration: 2400, easing: 'ease-in-out' }).onfinish = () => f.remove();
  }

  /* ----------------------------------------------------------- el disparo */
  function disparar(bicho) {
    bicho.classList.add('herido');      // se queda quieto en el aire, del susto
    if (window.Bichos && Bichos.abatido) Bichos.abatido(bicho);

    const blanco = centro(bicho);
    const anchoJardin = jardin.offsetWidth;
    if (window.Patico) Patico.plantarse(blanco.x / anchoJardin * 100, 2200);

    // Un fotograma para que el patico ya esté girado antes de medir el cañón.
    requestAnimationFrame(() => {
      const pato = centro(patico);
      const grados = angulo(pato, blanco);
      sacar(grados);

      setTimeout(() => {
        const desde = centro(boca);
        pum();
        fogonazo(desde);
        retroceso();
        bala(desde, centro(bicho), () => {
          estallido(centro(bicho));
          caer(bicho);
        });
        guardarLuego();
      }, 210);
    });
  }

  jardin.addEventListener('click', e => {
    const bicho = e.target.closest('.bicho');
    if (!bicho || bicho.classList.contains('herido')) return;
    // Que el toque no llegue al suelo: si no, el patico echaría a andar.
    e.stopPropagation();
    contexto();   // el audio se despierta dentro del mismo toque
    disparar(bicho);
  });
})();
