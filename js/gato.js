/* ==========================================================================
   EL GATO — atigrado, amarillo-naranja, vive en el jardín con el patico
   --------------------------------------------------------------------------
   Hace cosas de gato, cada una cuando le da la gana:
     · pasea, o echa a correr de golpe;
     · desaparece y salta de la nada en otro sitio;
     · maúlla de vez en cuando;
     · le da zarpazos a una flor… y el patico lo moja con su pistola de agua;
     · caza bichos: se agazapa con las pupilas dilatadas y salta; si lo
       atrapa, sale el angelito del bicho;
     · se echa a dormir (más de noche) y el puntero lo despierta;
     · persigue al patico, y luego el patico a él.
   Pasarle el ratón por encima, o tocarlo, es sobarlo: cierra los ojos,
   frota la cabeza y ronronea.

   Posición en % del jardín, igual que el patico (--px, --py, --lejos,
   --mira). Todo se anima con transform/opacity y los sonidos se generan con
   Web Audio, como en js/disparos.js.

   Cada acción lleva un número de turno: si algo la interrumpe (una caricia,
   el agua) el turno cambia y lo que quedaba pendiente de esa acción ya no
   hace nada.
   ========================================================================== */
(function () {
  'use strict';

  const jardin = document.getElementById('jardin');
  const patico = document.getElementById('patico');
  if (!jardin || !patico) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* -------------------------------------------------------------- dibujo */
  const gato = document.createElement('div');
  gato.className = 'gato quieto';
  gato.id = 'gato';
  gato.setAttribute('aria-hidden', 'true');
  gato.innerHTML = `
    <div class="gato-salto">
      <div class="gato-cola"></div>
      <div class="gato-patas">
        <div class="gpata gpata--a"></div><div class="gpata gpata--b"></div>
        <div class="gpata gpata--c"></div><div class="gpata gpata--d"></div>
      </div>
      <div class="gato-cuerpo"></div>
      <div class="gato-cabeza">
        <div class="gato-oreja gato-oreja--izq"></div>
        <div class="gato-oreja gato-oreja--der"></div>
        <div class="gato-ojo gato-ojo--izq"><i class="gato-pupila"></i></div>
        <div class="gato-ojo gato-ojo--der"><i class="gato-pupila"></i></div>
        <div class="gato-hocico"><i class="gato-nariz"></i><i class="gato-boca"></i></div>
        <div class="gato-bigotes"></div>
      </div>
    </div>`;
  patico.after(gato);
  const salto = gato.querySelector('.gato-salto');
  const cabeza = gato.querySelector('.gato-cabeza');

  /* --------------------------------------------------------- coordenadas */
  const ZONA = { minX: 3, maxX: 90, minY: 3, maxY: 46 };
  const limitar = (v, a, b) => Math.min(Math.max(v, a), b);
  const azar = (a, b) => a + Math.random() * (b - a);

  // Píxeles de pantalla -> píxeles del jardín (va escalado, ver disparos.js).
  function local(xp, yp) {
    const r = jardin.getBoundingClientRect();
    return { x: (xp - r.left) * jardin.offsetWidth / r.width,
             y: (yp - r.top) * jardin.offsetHeight / r.height };
  }
  const centro = n => { const r = n.getBoundingClientRect(); return local(r.left + r.width / 2, r.top + r.height / 2); };

  // Un nodo cualquiera en % del jardín: x del centro, y desde abajo (base).
  function enPorcentaje(n) {
    const r = n.getBoundingClientRect(), j = jardin.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - j.left) / j.width * 100,
             y: (j.bottom - r.bottom) / j.height * 100 };
  }

  /* ---------------------------------------------------------- moverse --- */
  let pos = { x: 72, y: 12 };
  let viajeT = null;

  function fijar(x, y, paso) {
    const lejos = (1 - (y - ZONA.minY) / (ZONA.maxY - ZONA.minY) * 0.42).toFixed(3);
    gato.style.setProperty('--paso', paso.toFixed(2) + 's');
    gato.style.setProperty('--px', x.toFixed(2) + '%');
    gato.style.setProperty('--py', y.toFixed(2) + '%');
    gato.style.setProperty('--lejos', lejos);
    gato.style.setProperty('--capa', String(400 - Math.round(y * 4)));
    pos = { x, y };
  }

  function mirar(haciaX) {
    if (Math.abs(haciaX - pos.x) > 0.6) gato.style.setProperty('--mira', haciaX > pos.x ? 1 : -1);
  }

  function colocar(x, y, rapidez, alLlegar) {
    x = limitar(x, ZONA.minX, ZONA.maxX);
    y = limitar(y, ZONA.minY, ZONA.maxY);
    const tiempo = (Math.hypot(x - pos.x, (y - pos.y) * 1.6) * 0.05 + 0.4) / rapidez;
    clearTimeout(viajeT);
    gato.classList.remove('quieto');
    gato.classList.toggle('corriendo', rapidez > 1.4);
    mirar(x);
    fijar(x, y, tiempo);
    viajeT = setTimeout(() => {
      gato.classList.add('quieto');
      gato.classList.remove('corriendo');
      if (alLlegar) alLlegar();
    }, tiempo * 1000);
  }

  // Dónde está de verdad, aunque vaya a medio camino.
  function dondeAhora() {
    const cs = getComputedStyle(gato);
    return { x: parseFloat(cs.left) / jardin.offsetWidth * 100,
             y: parseFloat(cs.bottom) / jardin.offsetHeight * 100 };
  }

  // Se planta justo donde está.
  function plantar() {
    clearTimeout(viajeT);
    const p = dondeAhora();
    fijar(p.x, p.y, 0);
    gato.classList.add('quieto');
    gato.classList.remove('corriendo');
  }

  /* ------------------------------------------------------------- sonidos */
  let audio = null;
  function contexto() {
    if (window.Disparos && Disparos.contexto) return Disparos.contexto();
    if (!audio) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      audio = new C();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  // Los navegadores no dejan sonar nada hasta el primer toque.
  let tocado = false;
  document.addEventListener('pointerdown', () => { tocado = true; }, { once: true, capture: true });
  const sonar = () => (tocado ? contexto() : null);

  // "Miau": diente de sierra que sube y baja, pasado por un filtro que se
  // abre y se cierra como la boca.
  function miauSonido() {
    const a = sonar();
    if (!a) return;
    const t = a.currentTime, d = azar(0.45, 0.75), f = azar(400, 560);
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 0.8, t);
    o.frequency.linearRampToValueAtTime(f * 1.5, t + d * 0.35);
    o.frequency.linearRampToValueAtTime(f * 0.9, t + d);
    const fl = a.createBiquadFilter();
    fl.type = 'bandpass'; fl.Q.value = 3;
    fl.frequency.setValueAtTime(700, t);
    fl.frequency.linearRampToValueAtTime(1600, t + d * 0.35);
    fl.frequency.linearRampToValueAtTime(800, t + d);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.06);
    g.gain.setValueAtTime(0.45, t + d * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(fl).connect(g).connect(a.destination);
    o.start(t); o.stop(t + d + 0.05);
  }

  // Ronroneo: ruido grave que late a 26 Hz y respira despacio. Devuelve la
  // función que lo apaga.
  function ronroneo() {
    const a = sonar();
    if (!a) return () => {};
    const t = a.currentTime;
    const largo = a.sampleRate * 2;
    const buf = a.createBuffer(1, largo, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < largo; i++) d[i] = Math.random() * 2 - 1;
    const ruido = a.createBufferSource();
    ruido.buffer = buf; ruido.loop = true;
    const grave = a.createBiquadFilter();
    grave.type = 'lowpass'; grave.frequency.value = 240;
    const latido = a.createGain(); latido.gain.value = 0.5;
    const lfo = a.createOscillator(); lfo.frequency.value = 26;
    const lfoG = a.createGain(); lfoG.gain.value = 0.5;
    lfo.connect(lfoG).connect(latido.gain);
    const aire = a.createGain(); aire.gain.value = 0.6;
    const resp = a.createOscillator(); resp.frequency.value = 0.6;
    const respG = a.createGain(); respG.gain.value = 0.3;
    resp.connect(respG).connect(aire.gain);
    const salida = a.createGain();
    salida.gain.setValueAtTime(0.0001, t);
    salida.gain.exponentialRampToValueAtTime(1.2, t + 0.4);
    ruido.connect(grave).connect(latido).connect(aire).connect(salida).connect(a.destination);
    [ruido, lfo, resp].forEach(n => n.start(t));
    return () => {
      const n = a.currentTime;
      salida.gain.cancelScheduledValues(n);
      salida.gain.setValueAtTime(salida.gain.value || 0.5, n);
      salida.gain.exponentialRampToValueAtTime(0.0001, n + 0.5);
      [ruido, lfo, resp].forEach(x => x.stop(n + 0.6));
    };
  }

  // Bufido cuando lo mojan: un soplo agudo.
  function bufido() {
    const a = sonar();
    if (!a) return;
    const t = a.currentTime;
    const largo = Math.floor(a.sampleRate * 0.35);
    const buf = a.createBuffer(1, largo, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / largo);
    const r = a.createBufferSource(); r.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2800;
    const g = a.createGain(); g.gain.value = 0.35;
    r.connect(f).connect(g).connect(a.destination);
    r.start(t);
  }

  /* ------------------------------------------------- globos, zetas, ♥ --- */
  function globo(texto, clase = 'globo-gato', { dur = 1400, sube = 18, lado = 0, de = cabeza } = {}) {
    const r = de.getBoundingClientRect();
    const p = local(r.left + r.width / 2, r.top);
    const g = document.createElement('div');
    g.className = clase;
    g.textContent = texto;
    g.style.left = p.x + 'px';
    g.style.top = (p.y - 4) + 'px';
    jardin.appendChild(g);
    g.animate([
      { transform: 'translate(0,6px) scale(.6)', opacity: 0 },
      { transform: 'translate(0,0) scale(1)', opacity: 1, offset: .15 },
      { transform: `translate(${lado * .6}px,${-sube * .5}px) scale(1)`, opacity: 1, offset: .7 },
      { transform: `translate(${lado}px,${-sube}px) scale(.9)`, opacity: 0 }
    ], { duration: dur, easing: 'ease-out' }).onfinish = () => g.remove();
  }

  function miau() {
    miauSonido();
    gato.classList.add('maullando');
    setTimeout(() => gato.classList.remove('maullando'), 500);
    globo(['¡miau!', 'miau~', 'mrrr…', 'miaaau'][Math.floor(Math.random() * 4)]);
  }

  /* ------------------------------------------------- turnos y acciones -- */
  let turno = 0;
  let siguienteT = null;
  const limpiezas = new Set();   // lo que hay que deshacer si se interrumpe

  // Un setTimeout que sólo corre si el turno no cambió.
  function luego(t, ms, fn) {
    const id = setTimeout(() => { if (t === turno) fn(); }, ms);
    limpiezas.add(() => clearTimeout(id));
  }
  function ir(t, x, y, rapidez, fn) {
    colocar(x, y, rapidez, () => { if (t === turno && fn) fn(); });
  }

  const ESTADOS = ['agazapado', 'zarpazo', 'pupilas-grandes', 'ojos-cerrados', 'durmiendo',
                   'mojado', 'maullando', 'oculto', 'estirando', 'corriendo'];
  function limpiar() {
    limpiezas.forEach(f => f());
    limpiezas.clear();
    gato.classList.remove(...ESTADOS);
    salto.getAnimations().forEach(a => a.cancel());
    durmiendo = false;
  }

  function programar(ms = azar(1500, 4500)) {
    clearTimeout(siguienteT);
    siguienteT = setTimeout(decidir, ms);
  }
  function hecho(t, ms) {
    if (t !== turno) return;
    limpiar();
    programar(ms);
  }
  function interrumpir() {
    turno++;
    clearTimeout(siguienteT);
    limpiar();
    plantar();
  }

  const enPausa = () => document.hidden || jardin.hidden ||
    !jardin.classList.contains('visible') ||
    jardin.classList.contains('quieto') || jardin.classList.contains('en-pausa');

  const flores = () => [...jardin.querySelectorAll('.flor-plantada')].filter(f => {
    const r = f.getBoundingClientRect();
    return r.width && r.right > 0 && r.left < innerWidth;
  });
  const bichos = () => [...jardin.querySelectorAll('.bicho:not(.herido)')].filter(b => {
    const r = b.getBoundingClientRect();
    return r.right > 20 && r.left < innerWidth - 20;
  });

  function decidir() {
    if (enPausa() || sobado) { programar(1200); return; }
    const t = ++turno;
    const noche = jardin.dataset.momento === 'noche';
    const opciones = [
      [pasear, 30], [correr, 9], [maullar, 9],
      [molestarFlor, flores().length ? 12 : 0],
      [cazar, bichos().length ? 14 : 0],
      [dormir, noche ? 24 : 7],
      [aparecer, 7],
      [jugarConPato, window.Patico && Patico.donde ? 8 : 0]
    ];
    let r = Math.random() * opciones.reduce((s, o) => s + o[1], 0);
    for (const [accion, peso] of opciones) {
      if ((r -= peso) <= 0) { accion(t); return; }
    }
    pasear(t);
  }

  /* ------------------------------------------------------------ pasear */
  function pasear(t) {
    const x = pos.x + azar(-24, 24);
    const y = Math.random() < .4 ? azar(ZONA.minY, ZONA.maxY) : pos.y + azar(-10, 10);
    ir(t, x, y, 1, () => hecho(t));
  }

  function correr(t) {
    const x = pos.x > 50 ? azar(5, 30) : azar(65, 90);
    if (Math.random() < .3) miau();
    ir(t, x, azar(ZONA.minY, 30), 3, () => hecho(t, azar(800, 2000)));
  }

  function maullar(t) {
    plantar();
    mirar(pos.x + (Math.random() < .5 ? -5 : 5));
    miau();
    luego(t, 1400, () => hecho(t));
  }

  /* ------------------------------------------- salta de la nada -------- */
  function aparecer(t) {
    gato.classList.add('oculto');
    luego(t, azar(1500, 4000), () => {
      fijar(azar(8, 86), azar(ZONA.minY, 34), 0);
      mirar(pos.x + (Math.random() < .5 ? -5 : 5));
      void gato.offsetWidth;
      gato.classList.remove('oculto');
      gato.classList.add('pupilas-grandes');
      salto.animate([
        { transform: 'translateY(60%) scale(.3)' },
        { transform: 'translateY(-55%) scale(1.05) rotate(-10deg)', offset: .5 },
        { transform: 'translateY(0) scale(1)' }
      ], { duration: 520, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      if (Math.random() < .6) miau();
      luego(t, 1600, () => hecho(t));
    });
  }

  /* ---------------------------------------------- molestar las flores -- */
  function molestarFlor(t) {
    const lista = flores();
    const flor = lista[Math.floor(Math.random() * lista.length)];
    if (!flor) { hecho(t); return; }
    const f = enPorcentaje(flor);
    const lado = f.x > pos.x ? -1 : 1;       // se queda a un lado, mirándola
    ir(t, f.x + lado * 5, f.y, 1.4, () => {
      mirar(f.x);
      gato.classList.add('agazapado', 'pupilas-grandes');
      luego(t, 800, () => {
        gato.classList.remove('agazapado');
        gato.classList.add('zarpazo');
        flor.classList.remove('zarandeada');
        void flor.offsetWidth;
        flor.classList.add('zarandeada');
        setTimeout(() => flor.classList.remove('zarandeada'), 950);
        luego(t, 1100, () => {
          gato.classList.remove('zarpazo');
          // El patico defiende sus flores: agua.
          if (window.Disparos && Disparos.mojar && Math.random() < .6) {
            Disparos.mojar(gato, () => { if (t === turno) mojado(t); });
            luego(t, 2500, () => hecho(t));   // por si el agua no llega
          } else {
            luego(t, 700, () => hecho(t));
          }
        });
      });
    });
  }

  function mojado(t) {
    limpiar();
    gato.classList.add('mojado', 'pupilas-grandes');
    bufido();
    globo('¡fff!');
    salto.animate([
      { transform: 'translateY(0)' }, { transform: 'translateY(-60%) rotate(8deg)' }, { transform: 'translateY(0)' }
    ], { duration: 380, easing: 'ease-out' });
    luego(t, 900, () => {
      gato.classList.remove('mojado');
      const p = window.Patico ? Patico.donde() : { x: 50 };
      const x = p.x > pos.x ? azar(3, Math.max(4, pos.x - 25)) : azar(Math.min(89, pos.x + 25), 90);
      ir(t, x, azar(ZONA.minY, 30), 3.2, () => hecho(t, 2500));
    });
  }

  /* -------------------------------------------------- cazar un bicho --- */
  function cazar(t) {
    const lista = bichos();
    if (!lista.length) { hecho(t); return; }
    // El más bajo es el que tiene a tiro.
    const bicho = lista.reduce((a, b) => (centro(b).y > centro(a).y ? b : a));
    plantar();
    mirar(enPorcentaje(bicho).x);
    gato.classList.add('agazapado', 'pupilas-grandes');
    if (Math.random() < .4) globo('…', 'globo-gato', { dur: 900 });
    luego(t, 900, () => {
      gato.classList.remove('agazapado');
      if (!bicho.isConnected || bicho.classList.contains('herido')) { hecho(t); return; }
      const b = enPorcentaje(bicho);
      ir(t, b.x - (b.x > pos.x ? 4 : -4), Math.min(pos.y, 30), 2.6, () => brincar(t, bicho));
    });
  }

  function brincar(t, bicho) {
    if (!bicho.isConnected || bicho.classList.contains('herido')) { hecho(t); return; }
    const a = centro(bicho), c = centro(cabeza);
    mirar(enPorcentaje(bicho).x);
    const alcance = jardin.offsetHeight * 0.3;
    const dy = c.y - a.y, dx = a.x - c.x;
    const llega = dy > -20 && dy < alcance && Math.abs(dx) < 110;
    const exito = llega && Math.random() < .6;

    const lejos = parseFloat(getComputedStyle(gato).scale) || 1;
    const mira = parseFloat(gato.style.getPropertyValue('--mira')) || 1;
    const alto = Math.min(Math.max(dy, 30), alcance) / lejos;
    const tx = dx * mira / lejos;
    const anim = salto.animate([
      { transform: 'translate(0,0) rotate(0deg)' },
      { transform: `translate(${(tx * .5).toFixed(1)}px,${(-alto).toFixed(1)}px) rotate(-14deg)`, offset: .45 },
      { transform: `translate(${tx.toFixed(1)}px,0) rotate(0deg)` }
    ], { duration: 650, easing: 'ease-out' });
    luego(t, 290, () => {
      if (exito && window.Disparos && Disparos.atrapado(bicho)) {
        setTimeout(() => globo('¡te tengo!'), 300);
      }
    });
    anim.onfinish = () => {
      if (t !== turno) return;
      fijar(pos.x + dx / jardin.offsetWidth * 100, pos.y, 0);
      anim.cancel();
      if (!exito) globo('?', 'globo-gato', { dur: 900 });
      luego(t, 1200, () => hecho(t));
    };
  }

  /* -------------------------------------------------------- dormir ---- */
  let durmiendo = false;
  function dormir(t) {
    plantar();
    gato.classList.add('durmiendo', 'ojos-cerrados');
    durmiendo = true;
    const zz = setInterval(() => globo('z', 'zeta', { dur: 2200, sube: 34, lado: azar(4, 14) }), 1100);
    limpiezas.add(() => clearInterval(zz));
    luego(t, azar(14000, 26000), () => despertar(t, false));
  }

  function despertar(t, deGolpe) {
    limpiar();
    if (deGolpe) {
      gato.classList.add('pupilas-grandes');
      globo('¡!');
      salto.animate([
        { transform: 'translateY(0)' }, { transform: 'translateY(-70%) rotate(-6deg)' }, { transform: 'translateY(0)' }
      ], { duration: 420, easing: 'ease-out' });
      setTimeout(miau, 450);
      luego(t, 1500, () => hecho(t));
    } else {
      gato.classList.add('estirando');
      luego(t, 900, () => hecho(t, 1200));
    }
  }

  /* ------------------------------------------- jugar con el patico ---- */
  function jugarConPato(t) {
    if (!window.Patico || !Patico.donde) { hecho(t); return; }
    Patico.ocupar(true);
    limpiezas.add(() => Patico.ocupar(false));
    gato.classList.add('pupilas-grandes');
    miau();
    globo('¡cuac!', 'globo-gato', { de: patico });

    const lejosDe = x => (x > 50 ? azar(4, 28) : azar(70, 90));
    let quien = 'gato';      // quién persigue
    // Cada huida dura un rato fijo: los callbacks de llegada no sirven aquí,
    // porque el siguiente tic redirige al que corre y cancela su llegada.
    let huyeHasta = 0;
    const fin = Date.now() + 9500;
    const cambio = Date.now() + 6000;

    const tic = setInterval(() => {
      if (t !== turno) return;
      const pato = Patico.donde();
      const yo = dondeAhora();
      const cerca = Math.hypot(pato.x - yo.x, (pato.y - yo.y) * 1.6) < 14;
      if (Date.now() > fin) {
        clearInterval(tic);
        Patico.plantarse(yo.x, 600);
        Patico.ocupar(false);
        plantar();
        mirar(pato.x);
        miau();
        luego(t, 1500, () => hecho(t));
        return;
      }
      if (quien === 'gato' && Date.now() > cambio) {
        quien = 'pato';
        globo('¡ahora tú!', 'globo-gato', { de: patico });
      }
      if (quien === 'gato') {
        if (Date.now() > huyeHasta - 1200) colocar(pato.x, pato.y, 2.4);
        if (cerca && Date.now() > huyeHasta) {
          huyeHasta = Date.now() + 1800;
          Patico.correrA(lejosDe(pato.x), azar(ZONA.minY, 34));
        }
      } else {
        Patico.correrA(yo.x, yo.y);
        if (cerca && Date.now() > huyeHasta) {
          huyeHasta = Date.now() + 1800;
          colocar(lejosDe(yo.x), azar(ZONA.minY, 34), 2.8);
        }
      }
    }, 450);
    limpiezas.add(() => clearInterval(tic));
  }

  /* --------------------------------------------- las caricias -------- */
  let sobado = false, apagarRonroneo = null, soltarT = null, corazones = null;
  let despertadoEn = 0;

  function tocar() {
    if (durmiendo) {
      const t = ++turno;
      clearTimeout(siguienteT);
      despertadoEn = Date.now();
      despertar(t, true);
      return;
    }
    // Recién despertado del susto: que termine el brinco antes de dejarse sobar.
    if (Date.now() - despertadoEn < 1300) return;
    clearTimeout(soltarT);
    if (sobado) return;
    interrumpir();
    sobado = true;
    gato.classList.add('sobado', 'ojos-cerrados');
    apagarRonroneo = ronroneo();
    corazones = setInterval(() => globo('♥', 'corazoncito', { dur: 1300, sube: 26, lado: azar(-10, 10) }), 650);
  }

  function soltar(ms) {
    clearTimeout(soltarT);
    soltarT = setTimeout(() => {
      if (!sobado) return;
      sobado = false;
      clearInterval(corazones);
      if (apagarRonroneo) apagarRonroneo();
      gato.classList.remove('sobado', 'ojos-cerrados');
      programar(1500);
    }, ms);
  }

  gato.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') tocar(); });
  gato.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !sobado) tocar(); });
  gato.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') soltar(700); });
  gato.addEventListener('pointerdown', e => {
    tocado = true;
    tocar();
    if (e.pointerType !== 'mouse') soltar(2600);
  });
  // Que el toque no llegue al suelo: el patico no tiene que ir hasta ahí.
  gato.addEventListener('click', e => e.stopPropagation());

  // Para probar a mano desde la consola: Gato.hacer('cazar').
  const ACCIONES = { pasear, correr, maullar, aparecer, molestarFlor, cazar, dormir, jugarConPato };
  window.Gato = {
    hacer(nombre) {
      if (!ACCIONES[nombre]) return Object.keys(ACCIONES);
      interrumpir();
      ACCIONES[nombre](++turno);
    }
  };

  /* ----------------------------------------------------------- arranque */
  fijar(pos.x, pos.y, 0);
  gato.style.setProperty('--mira', -1);
  programar(4000);
})();
