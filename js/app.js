/* ==========================================================================
   APP — jardín de notas
   ========================================================================== */
(function () {
  'use strict';

  const CFG = window.CONFIG;
  const $   = s => document.querySelector(s);

  const el = {
    portada:   $('#portada'),
    ramo:      $('#ramo'),
    btnEntrar: $('#btnEntrar'),
    jardin:    $('#jardin'),
    campo:     $('#tierra'),
    pista:     $('#pista'),
    estado:    $('#estado'),
    portal:    $('#portalSecreto'),

    modalNota:  $('#modalNota'),
    notaFlor:   $('#notaFlor'),
    notaFecha:  $('#notaFecha'),
    notaTexto:  $('#notaTexto'),

    modalLogin: $('#modalLogin'),
    formLogin:  $('#formLogin'),
    loginUser:  $('#loginUser'),
    loginPass:  $('#loginPass'),
    loginError: $('#loginError'),
    btnLogin:   $('#btnLogin'),

    modalSembrar: $('#modalSembrar'),
    formSembrar:  $('#formSembrar'),
    notaInput:    $('#notaInput'),
    contador:     $('#contador'),
    selFlor:      $('#selectorFlor'),
    selColor:     $('#selectorColor'),
    sembrarError: $('#sembrarError'),
    btnSembrar:   $('#btnSembrar'),
    btnSalir:     $('#btnSalir'),
    listaFlores:  $('#listaFlores'),
    resumen:      $('#resumenSembradas'),

    brindis: $('#brindis')
  };

  let flores    = [];
  let elegido   = { especie: FloresSVG.ESPECIES[0].clave, hue: CFG.COLORES[0].hue };
  let jardinAbierto = false;

  /* ---------------------------------------------------------------- utils */
  const aviso = (txt) => {
    el.brindis.textContent = txt;
    el.brindis.classList.add('visible');
    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => el.brindis.classList.remove('visible'), 2600);
  };

  const fechaLarga = iso => new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  function abrir(modal)  {
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('abierto'));
    document.body.classList.add('sin-scroll');
    const foco = modal.querySelector('input, textarea');
    if (foco) setTimeout(() => foco.focus(), 220);
  }
  function cerrar(modal) {
    modal.classList.remove('abierto');
    document.body.classList.remove('sin-scroll');
    setTimeout(() => { modal.hidden = true; }, 240);
  }

  document.addEventListener('click', e => {
    if (e.target.matches('[data-cerrar]')) cerrar(e.target.closest('.modal'));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.abierto').forEach(cerrar);
    }
  });

  /* ------------------------------------------------------- portada -> jardín */
  function entrarAlJardin() {
    if (jardinAbierto) return;
    jardinAbierto = true;
    el.portada.classList.add('saliendo');
    el.jardin.hidden = false;
    // El toque del ramo es el gesto que los navegadores exigen para dejar
    // sonar audio. Si el reproductor aún no cargó, queda pendiente.
    if (window.Musica) window.Musica.arrancar();
    requestAnimationFrame(() => el.jardin.classList.add('visible'));
    setTimeout(() => { el.portada.hidden = true; }, 900);
  }
  el.ramo.addEventListener('click', entrarAlJardin);
  el.ramo.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entrarAlJardin(); }
  });
  el.btnEntrar.addEventListener('click', entrarAlJardin);

  /* --------------------------------------------------- posición aleatoria */
  // Evita que las flores se amontonen: intenta varias veces hasta encontrar
  // un punto lo bastante lejos de las ya sembradas.
  function posicionLibre() {
    let mejor = null, mejorDist = -1;
    for (let i = 0; i < 30; i++) {
      const x = 6 + Math.random() * 88;   // % dentro del campo
      const y = 18 + Math.random() * 68;
      let dist = Infinity;
      for (const f of flores) {
        const d = Math.hypot(f.x - x, (f.y - y) * 0.6);
        if (d < dist) dist = d;
      }
      if (dist > 14) return { x, y };
      if (dist > mejorDist) { mejorDist = dist; mejor = { x, y }; }
    }
    return mejor;
  }

  /* ------------------------------------------------------- pintar flores */
  function pintarFlor(flor, conAnimacion) {
    const b = document.createElement('button');
    b.className = 'flor-plantada' + (conAnimacion ? ' brotando' : '');
    b.type = 'button';
    b.dataset.id = flor.id;
    b.style.left = flor.x + '%';
    b.style.top  = flor.y + '%';
    // La profundidad simula perspectiva: lo de abajo es lo más cercano.
    b.style.zIndex = String(10 + Math.round(flor.y));
    b.style.setProperty('--escala', (0.78 + flor.y / 190).toFixed(2));
    b.style.setProperty('--hue', flor.hue + 'deg');
    b.style.setProperty('--bailes', (2.6 + Math.random() * 1.8).toFixed(2) + 's');
    b.style.setProperty('--retraso', (Math.random() * -3).toFixed(2) + 's');
    // Las notas viejas guardaban un emoji; si la clave no está en el catálogo
    // se pinta tal cual para no perder nada.
    b.innerHTML = `<span class="flor-tallo"></span>
      <span class="flor-cara">${
        FloresSVG.existe(flor.especie) ? FloresSVG.img(flor.especie, 54, false, flor.hue)
                                       : flor.especie
      }</span>`;
    b.setAttribute('aria-label', 'Nota del ' + fechaLarga(flor.fecha));
    b.addEventListener('click', () => leerNota(flor.id));
    el.campo.appendChild(b);
  }

  function repintar() {
    el.campo.querySelectorAll('.flor-plantada').forEach(n => n.remove());
    flores.forEach(f => pintarFlor(f, false));
    el.pista.hidden = flores.length === 0;
  }

  function leerNota(id) {
    const flor = flores.find(f => f.id === id);
    if (!flor) return;
    el.notaFlor.innerHTML = FloresSVG.existe(flor.especie)
      ? FloresSVG.img(flor.especie, 96, false, flor.hue) : flor.especie;
    el.notaFecha.textContent = fechaLarga(flor.fecha);
    el.notaTexto.textContent = flor.texto;
    abrir(el.modalNota);
  }

  /* ------------------------------------------------------------- realtime */
  function conectar() {
    Datos.alConectar(txt => {
      el.estado.querySelector('.estado-txt').textContent = txt;
      el.estado.dataset.estado = txt === 'en vivo' ? 'ok'
                               : txt === 'modo demo' ? 'demo' : 'esperando';
    });

    Datos.suscribir(async ev => {
      if (ev.tipo === 'alta') {
        if (flores.some(f => f.id === ev.flor.id)) return; // ya la pinté yo
        flores.push(ev.flor);
        pintarFlor(ev.flor, true);
        el.pista.hidden = false;
        aviso('Brotó una flor nueva 🌱');
      } else if (ev.tipo === 'baja') {
        flores = flores.filter(f => f.id !== ev.id);
        const n = el.campo.querySelector(`[data-id="${ev.id}"]`);
        if (n) { n.classList.add('marchita'); setTimeout(() => n.remove(), 500); }
      } else if (ev.tipo === 'resync') {
        await cargar();
      }
    });
  }

  async function cargar() {
    try {
      flores = await Datos.listar();
      repintar();
    } catch (err) {
      console.error(err);
      aviso('No pude leer el jardín');
    }
  }

  /* ----------------------------------------------------- portal: selectores */
  // Se construye la primera vez que se abre el portal: son 18 flores y no
  // hace falta pagar ese dibujo en la carga inicial (ella nunca lo abre).
  let selectoresListos = false;
  function construirSelectores() {
    if (selectoresListos) return;
    selectoresListos = true;

    FloresSVG.ESPECIES.forEach((f, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opcion' + (i === 0 ? ' activa' : '');
      b.innerHTML = FloresSVG.img(f.clave, 34, true);
      b.title = f.nombre;
      b.setAttribute('aria-label', f.nombre);
      b.addEventListener('click', () => {
        elegido.especie = f.clave;
        el.selFlor.querySelectorAll('.opcion').forEach(o => o.classList.remove('activa'));
        b.classList.add('activa');
      });
      el.selFlor.appendChild(b);
    });

    CFG.COLORES.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opcion opcion--color' + (i === 0 ? ' activa' : '');
      b.title = c.nombre;
      b.setAttribute('aria-label', 'Color ' + c.nombre);
      // Rosa: bien saturada, así se nota el tinte de cada opción.
      b.innerHTML = FloresSVG.img('rosa', 34, true, c.hue);
      b.addEventListener('click', () => {
        elegido.hue = c.hue;
        el.selColor.querySelectorAll('.opcion').forEach(o => o.classList.remove('activa'));
        b.classList.add('activa');
      });
      el.selColor.appendChild(b);
    });
  }

  el.notaInput.addEventListener('input', () => {
    el.contador.textContent = el.notaInput.value.length;
  });

  /* --------------------------------------------------------- portal: abrir */
  el.portal.addEventListener('click', async () => {
    if (await Datos.sesion()) { abrirPanel(); }
    else { el.loginError.hidden = true; abrir(el.modalLogin); }
  });

  el.formLogin.addEventListener('submit', async e => {
    e.preventDefault();
    el.btnLogin.disabled = true;
    el.loginError.hidden = true;
    try {
      await Datos.entrar(el.loginUser.value.trim(), el.loginPass.value);
      el.formLogin.reset();
      cerrar(el.modalLogin);
      setTimeout(abrirPanel, 260);
    } catch (err) {
      el.loginError.textContent = err.message || 'No pude entrar';
      el.loginError.hidden = false;
    } finally {
      el.btnLogin.disabled = false;
    }
  });

  function abrirPanel() {
    construirSelectores();
    listarEnPanel();
    abrir(el.modalSembrar);
  }

  function listarEnPanel() {
    el.resumen.textContent = `Flores sembradas (${flores.length})`;
    el.listaFlores.innerHTML = '';
    [...flores].reverse().forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="mini">${
          FloresSVG.existe(f.especie) ? FloresSVG.img(f.especie, 26, true, f.hue) : f.especie}</span>
        <span class="mini-txt">${f.texto.slice(0, 40)}${f.texto.length > 40 ? '…' : ''}</span>
        <button type="button" class="mini-borrar" aria-label="Borrar">&times;</button>`;
      li.querySelector('.mini-borrar').addEventListener('click', async () => {
        if (!confirm('¿Borrar esta flor y su nota? No se puede deshacer.')) return;
        try {
          await Datos.borrar(f.id);
          flores = flores.filter(x => x.id !== f.id);
          repintar();
          listarEnPanel();
        } catch (err) { aviso(err.message || 'No pude borrarla'); }
      });
      el.listaFlores.appendChild(li);
    });
  }

  el.formSembrar.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = el.notaInput.value.trim();
    if (!texto) return;

    el.btnSembrar.disabled = true;
    el.sembrarError.hidden = true;
    const pos = posicionLibre();

    try {
      const flor = await Datos.sembrar({
        texto, especie: elegido.especie, hue: elegido.hue, x: pos.x, y: pos.y
      });
      flores.push(flor);
      pintarFlor(flor, true);
      el.pista.hidden = false;
      el.notaInput.value = '';
      el.contador.textContent = '0';
      listarEnPanel();
      aviso('Flor sembrada 🌷');
    } catch (err) {
      el.sembrarError.textContent = err.message || 'No pude sembrarla';
      el.sembrarError.hidden = false;
    } finally {
      el.btnSembrar.disabled = false;
    }
  });

  el.btnSalir.addEventListener('click', async () => {
    await Datos.salir();
    cerrar(el.modalSembrar);
    aviso('Sesión cerrada');
  });

  /* ------------------------------------------------------------- arranque */
  (async function inicio() {
    document.querySelector('.portada-titulo').textContent = 'Para ' + CFG.PARA;
    el.ramo.innerHTML = FloresSVG.ramo();
    await Datos.iniciar();
    conectar();
    await cargar();
  })();
})();
