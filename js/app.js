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

    patico:    $('#patico'),
    rincones:  $('#rincones'),
    rinconAtras: $('#rinconAtras'),
    rinconSiguiente: $('#rinconSiguiente'),
    rinconPuntos: $('#rinconPuntos'),

    btnLibro:   $('#btnLibro'),
    modalLibro: $('#modalLibro'),
    libroLista: $('#libroLista'),
    libroCuenta: $('#libroCuenta'),

    btnCorazon: $('#btnCorazon'),

    modalNota:  $('#modalNota'),
    notaFlor:   $('#notaFlor'),
    notaEspecie: $('#notaEspecie'),
    notaFecha:  $('#notaFecha'),
    notaFigura: $('#notaFigura'),
    notaFoto:   $('#notaFoto'),
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
    fotoInput:    $('#fotoInput'),
    fotoPrevia:   $('#fotoPrevia'),
    fotoTexto:    $('#fotoTexto'),
    zonaFoto:     $('#zonaFoto'),
    btnQuitarFoto: $('#btnQuitarFoto'),
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

  // El campo se recorre por rincones: sólo se dibuja el tramo que se está
  // mirando. Además de dar sitio a muchas notas, mantiene el jardín ligero.
  const POR_RINCON = 35;
  let rincon = 0;
  let florAbierta = null;

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
    // Un reflow forzado, no requestAnimationFrame: con la pestaña en segundo
    // plano rAF no dispara y el modal se quedaba transparente para siempre.
    void modal.offsetWidth;
    modal.classList.add('abierto');
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
    void el.jardin.offsetWidth;   // mismo motivo que en abrir()
    el.jardin.classList.add('visible');
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
      if (dist > 9) return { x, y };
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
    b.innerHTML = `${FloresSVG.tallo(flor.id)}
      <span class="flor-cara">${
        FloresSVG.existe(flor.especie) ? FloresSVG.img(flor.especie, 54, false, flor.hue)
                                       : flor.especie
      }</span>`;
    b.setAttribute('aria-label', 'Nota del ' + fechaLarga(flor.fecha));
    b.addEventListener('click', () => leerNota(flor.id));
    el.campo.appendChild(b);

    // Un bicho se posa en las que ella todavía no ha abierto.
    if (window.Bichos && Bichos.esNueva(flor.id)) Bichos.posarEn(b, flor.id);
  }

  /* --------------------------------------------------------- rincones ---- */
  function totalRincones() {
    return Math.max(1, Math.ceil(flores.length / POR_RINCON));
  }

  function floresDelRincon() {
    return flores.slice(rincon * POR_RINCON, (rincon + 1) * POR_RINCON);
  }

  function rinconDe(id) {
    const i = flores.findIndex(f => f.id === id);
    return i < 0 ? 0 : Math.floor(i / POR_RINCON);
  }

  function pintarRincones() {
    const total = totalRincones();
    el.rincones.hidden = total < 2;
    el.rinconAtras.disabled = rincon === 0;
    el.rinconSiguiente.disabled = rincon >= total - 1;

    el.rinconPuntos.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const p = document.createElement('button');
      p.className = 'rincon-punto' + (i === rincon ? ' activo' : '');
      p.type = 'button';
      p.setAttribute('aria-label', 'Rincón ' + (i + 1));
      p.addEventListener('click', () => irAlRincon(i));
      el.rinconPuntos.appendChild(p);
    }
  }

  function repintar() {
    const total = totalRincones();
    if (rincon > total - 1) rincon = total - 1;
    if (rincon < 0) rincon = 0;

    el.campo.querySelectorAll('.flor-plantada').forEach(n => n.remove());
    floresDelRincon().forEach(f => pintarFlor(f, false));
    el.pista.hidden = flores.length === 0;
    pintarRincones();
  }

  function irAlRincon(n) {
    const total = totalRincones();
    n = Math.min(Math.max(n, 0), total - 1);
    if (n === rincon) return;

    const haciaLaDerecha = n > rincon;
    rincon = n;

    // Las flores del rincón anterior se van por el lado contrario al que
    // caminamos, como si el jardín se desplazara bajo los pies.
    el.campo.querySelectorAll('.flor-plantada').forEach(nodo => {
      nodo.classList.add(haciaLaDerecha ? 'sale-izq' : 'sale-der');
    });
    paticoCamina(haciaLaDerecha ? 'derecha' : 'izquierda');

    setTimeout(() => {
      repintar();
      el.campo.querySelectorAll('.flor-plantada').forEach(nodo => {
        nodo.classList.add(haciaLaDerecha ? 'entra-der' : 'entra-izq');
        setTimeout(() => nodo.classList.remove('entra-der', 'entra-izq'), 700);
      });
    }, 330);
  }

  el.rinconAtras.addEventListener('click', () => irAlRincon(rincon - 1));
  el.rinconSiguiente.addEventListener('click', () => irAlRincon(rincon + 1));

  // Una flor recién sembrada: si cae en el rincón que se está mirando brota a
  // la vista y el patico se acerca a curiosear; si no, sólo cambia el índice.
  function brotarEnPantalla(flor) {
    el.pista.hidden = false;
    if (rinconDe(flor.id) === rincon) {
      pintarFlor(flor, true);
      paticoIrA(flor.x - 4);
    }
    pintarRincones();
  }

  function nombreDe(clave) {
    const e = FloresSVG.ESPECIES.find(x => x.clave === clave);
    return e ? e.nombre : '';
  }

  function nombreColor(hue) {
    const c = CFG.COLORES.find(x => x.hue === Number(hue));
    return c && c.nombre !== 'natural' ? c.nombre : '';
  }

  function pintarCorazon(flor) {
    el.btnCorazon.classList.toggle('dado', flor.corazon);
    el.btnCorazon.setAttribute('aria-pressed', String(flor.corazon));
    el.btnCorazon.disabled = flor.corazon;   // se da una vez, no se quita
  }

  el.btnCorazon.addEventListener('click', async () => {
    if (!florAbierta || florAbierta.corazon) return;
    florAbierta.corazon = true;
    pintarCorazon(florAbierta);
    el.btnCorazon.classList.add('latiendo');
    setTimeout(() => el.btnCorazon.classList.remove('latiendo'), 900);
    try {
      await Datos.darCorazon(florAbierta.id);
    } catch (err) {
      florAbierta.corazon = false;
      pintarCorazon(florAbierta);
      aviso('No pude guardar el corazón');
      console.error(err);
    }
  });

  function leerNota(id) {
    const flor = flores.find(f => f.id === id);
    if (!flor) return;
    florAbierta = flor;

    // Deja de ser nueva: el bicho posado se va.
    if (window.Bichos) {
      Bichos.marcarLeida(id);
      const nodo = el.campo.querySelector(`[data-id="${id}"]`);
      if (nodo) Bichos.quitarDe(nodo);
    }
    pintarCorazon(flor);

    el.notaFlor.innerHTML = FloresSVG.existe(flor.especie)
      ? FloresSVG.img(flor.especie, 96, false, flor.hue) : flor.especie;

    const color = nombreColor(flor.hue);
    el.notaEspecie.textContent = nombreDe(flor.especie) + (color ? ' ' + color : '');

    el.notaFecha.textContent = fechaLarga(flor.fecha);

    // Primero se muestra el marco y después se asigna el src: si se asigna
    // mientras el elemento sigue oculto, el navegador puede no cargarla.
    if (flor.foto) {
      el.notaFigura.hidden = false;
      if (el.notaFoto.src !== flor.foto) el.notaFoto.src = flor.foto;
    } else {
      el.notaFigura.hidden = true;
      el.notaFoto.removeAttribute('src');
    }

    el.notaTexto.textContent = flor.texto;
    abrir(el.modalNota);
  }

  /* --------------------------------------------------------- el patico ---
     Pasea por su cuenta: elige un punto cualquiera, va andando, se para un
     rato y vuelve a elegir. Se mueve por toda la tierra y sube al campo
     verde. `y` es la altura desde abajo: 3% es el filo de abajo del jardín
     y 46% ya son las lomas.                                               */
  const PATICO = { minX: 3, maxX: 90, minY: 3, maxY: 46 };
  let paticoTimer = null;
  let paticoPos = { x: 12, y: 8 };

  function paticoColocar(x, y, alLlegar) {
    if (!el.patico) return;
    x = Math.min(Math.max(x, PATICO.minX), PATICO.maxX);
    y = Math.min(Math.max(y, PATICO.minY), PATICO.maxY);

    const dx = x - paticoPos.x, dy = y - paticoPos.y;
    const viaje = Math.hypot(dx, dy * 1.6);      // subir cuesta más que andar
    const tiempo = viaje * 0.055 + 0.6;

    // Cuanto más arriba está, más lejos se ve: encoge y pasa por detrás de
    // las flores que quedan más abajo que él.
    const lejos = (1 - (y - PATICO.minY) / (PATICO.maxY - PATICO.minY) * 0.42).toFixed(3);

    clearTimeout(paticoTimer);
    el.patico.classList.remove('quieto');
    if (Math.abs(dx) > 0.6) el.patico.style.setProperty('--mira', dx > 0 ? 1 : -1);
    el.patico.style.setProperty('--paso', tiempo.toFixed(2) + 's');
    el.patico.style.setProperty('--px', x.toFixed(1) + '%');
    el.patico.style.setProperty('--py', y.toFixed(1) + '%');
    el.patico.style.setProperty('--lejos', lejos);
    el.patico.style.setProperty('--capa', String(400 - Math.round(y * 4)));
    paticoPos = { x, y };

    paticoTimer = setTimeout(() => {
      el.patico.classList.add('quieto');
      if (alLlegar) alLlegar();
      paticoTimer = setTimeout(paticoPasear, 900 + Math.random() * 2600);
    }, tiempo * 1000);
  }

  function paticoPasear() {
    // Pasos cortos y cercanos: cruzar el jardín de punta a punta cada vez
    // parecería que huye de algo.
    const x = paticoPos.x + (Math.random() * 46 - 23);

    // La altura se sortea sobre toda la banda, pero tirando hacia donde ya
    // está. Sin ese reparto se quedaba pegado al borde de abajo, porque un
    // paso al azar desde el suelo casi siempre choca con el límite.
    let y;
    if (Math.random() < .4) {
      y = PATICO.minY + Math.random() * (PATICO.maxY - PATICO.minY);
    } else {
      y = paticoPos.y + (Math.random() * 24 - 12);
      // Si el tumbo lo saca de la banda, rebota hacia dentro en vez de
      // quedarse aplastado contra el borde.
      if (y < PATICO.minY) y = PATICO.minY + (PATICO.minY - y);
      if (y > PATICO.maxY) y = PATICO.maxY - (y - PATICO.maxY);
    }
    paticoColocar(x, y);
  }

  function paticoIrA(x, y, alLlegar) {
    paticoColocar(x, y === undefined ? paticoPos.y : y, alLlegar);
  }

  function paticoCamina(direccion) {
    paticoIrA(paticoPos.x + (direccion === 'derecha' ? 24 : -24));
  }

  // Un toque en el suelo y va hasta ese punto exacto.
  function seguirToque(e) {
    if (e.target.closest('.flor-plantada, button')) return;
    const caja = el.jardin.getBoundingClientRect();
    paticoIrA((e.clientX - caja.left) / caja.width * 100,
              (caja.bottom - e.clientY) / caja.height * 100);
  }
  el.campo.addEventListener('click', seguirToque);
  document.querySelector('.colinas').addEventListener('click', seguirToque);

  paticoPasear();

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
        brotarEnPantalla(ev.flor);
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

  /* ------------------------------------------------------ foto de la nota */
  let fotoElegida = null;   // Blob ya reducido, listo para subir

  // Las fotos del móvil pesan varios megas. Se reescalan y recomprimen en el
  // propio teléfono: sube rápido y ella la abre sin gastar datos.
  function reducir(archivo) {
    return new Promise((ok, mal) => {
      const url = URL.createObjectURL(archivo);
      const im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(url);
        const lado = Math.max(im.width, im.height);
        const escala = Math.min(1, CFG.FOTO_MAX_LADO / lado);
        const c = document.createElement('canvas');
        c.width  = Math.round(im.width  * escala);
        c.height = Math.round(im.height * escala);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(
          b => b ? ok(b) : mal(new Error('No pude procesar la imagen')),
          'image/jpeg',
          CFG.FOTO_CALIDAD
        );
      };
      im.onerror = () => { URL.revokeObjectURL(url); mal(new Error('Esa imagen no se puede leer')); };
      im.src = url;
    });
  }

  function pintarPrevia(blob) {
    if (el.fotoPrevia.src.startsWith('blob:')) URL.revokeObjectURL(el.fotoPrevia.src);
    el.fotoPrevia.src = URL.createObjectURL(blob);
    el.fotoPrevia.hidden = false;
    el.zonaFoto.classList.add('con-foto');
    el.fotoTexto.textContent = 'Toca para cambiarla';
    el.btnQuitarFoto.hidden = false;
  }

  function quitarFoto() {
    fotoElegida = null;
    if (el.fotoPrevia.src.startsWith('blob:')) URL.revokeObjectURL(el.fotoPrevia.src);
    el.fotoPrevia.removeAttribute('src');
    el.fotoPrevia.hidden = true;
    el.zonaFoto.classList.remove('con-foto');
    el.fotoTexto.textContent = 'Toca para elegir una foto';
    el.btnQuitarFoto.hidden = true;
    el.fotoInput.value = '';
  }

  el.fotoInput.addEventListener('change', async () => {
    const archivo = el.fotoInput.files[0];
    if (!archivo) return;
    el.zonaFoto.classList.add('cargando');
    try {
      fotoElegida = await reducir(archivo);
      pintarPrevia(fotoElegida);
    } catch (err) {
      quitarFoto();
      aviso(err.message);
    } finally {
      el.zonaFoto.classList.remove('cargando');
    }
  });

  el.btnQuitarFoto.addEventListener('click', quitarFoto);

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

  /* ------------------------------------------------- el libro del jardín - */
  el.btnLibro.addEventListener('click', () => {
    const total = flores.length;
    el.libroCuenta.textContent = total === 0
      ? 'Todavía no hay ninguna nota.'
      : total + (total === 1 ? ' nota sembrada' : ' notas sembradas');

    el.libroLista.innerHTML = '';
    // De la más reciente a la más antigua: se lee como un diario al revés.
    [...flores].reverse().forEach(f => {
      const li = document.createElement('li');
      li.className = 'libro-item' + (Bichos.esNueva(f.id) ? ' sin-leer' : '');
      li.innerHTML = `
        <span class="libro-flor">${
          FloresSVG.existe(f.especie) ? FloresSVG.img(f.especie, 40, true, f.hue) : f.especie}</span>
        <span class="libro-txt">
          <time>${fechaLarga(f.fecha)}</time>
          <em>${f.texto.slice(0, 70)}${f.texto.length > 70 ? '…' : ''}</em>
        </span>
        ${f.foto ? '<span class="libro-marca" title="Lleva foto">▣</span>' : ''}
        ${f.corazon ? '<span class="libro-marca libro-marca--corazon" title="Con corazón">♥</span>' : ''}`;

      li.addEventListener('click', () => {
        cerrar(el.modalLibro);
        // Salta al rincón donde vive esa flor y abre su nota.
        const destino = rinconDe(f.id);
        if (destino !== rincon) { rincon = destino; repintar(); }
        setTimeout(() => leerNota(f.id), 320);
      });
      el.libroLista.appendChild(li);
    });

    abrir(el.modalLibro);
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
        <span class="mini-txt">${f.foto ? '<span class="mini-foto" title="Lleva foto">▣</span> ' : ''}${
          f.texto.slice(0, 36)}${f.texto.length > 36 ? '…' : ''}</span>
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
      let foto = null;
      if (fotoElegida) {
        el.btnSembrar.textContent = 'Subiendo foto…';
        foto = await Datos.subirFoto(fotoElegida);
      }
      el.btnSembrar.textContent = 'Sembrando…';

      const flor = await Datos.sembrar({
        texto, especie: elegido.especie, hue: elegido.hue, foto, x: pos.x, y: pos.y
      });
      flores.push(flor);
      if (window.Bichos) Bichos.marcarLeida(flor.id);  // yo la escribí, no es nueva para mí
      brotarEnPantalla(flor);
      el.notaInput.value = '';
      el.contador.textContent = '0';
      quitarFoto();
      listarEnPanel();
      aviso('Flor sembrada 🌷');
    } catch (err) {
      el.sembrarError.textContent = err.message || 'No pude sembrarla';
      el.sembrarError.hidden = false;
    } finally {
      el.btnSembrar.disabled = false;
      el.btnSembrar.textContent = 'Sembrar';
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
