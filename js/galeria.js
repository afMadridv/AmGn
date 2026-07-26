/* ==========================================================================
   LA GALERÍA — sus dibujos
   --------------------------------------------------------------------------
   Quién puede qué:

     · Cualquiera que tenga el enlace MIRA y CUELGA, sin cuenta ni contraseña:
       el enlace es de ella y sólo ella lo tiene, así que pedirle que inicie
       sesión para dibujar en su propia galería sobra.
     · QUITAR un dibujo sí pide la sesión del jardín. Es la única puerta que
       queda cerrada, para que nadie pueda vaciarle la galería de un golpe.
     · Él, desde esa misma sesión, deja su COMENTARIO de fan.
     · El CORAZÓN funciona como el de las notas, pero al revés: allí ella se
       lo da a lo que él escribe, aquí él se lo da a lo que ella dibuja. Se da
       una vez y no se quita.

   Quien manda de verdad es el RLS de sql/instalar.sql: aquí sólo se decide
   qué botones se enseñan.
   ========================================================================== */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const el = {
    boton:    $('#btnGaleria'),
    modal:    $('#modalGaleria'),
    titulo:   $('#galeriaTitulo'),
    rejilla:  $('#galeriaRejilla'),
    vacia:    $('#galeriaVacia'),

    formColgar:  $('#formColgar'),
    zonaObra:    $('#zonaObra'),
    obraInput:   $('#obraInput'),
    obraPrevia:  $('#obraPrevia'),
    obraTexto:   $('#obraTexto'),
    obraTitulo:  $('#obraTitulo'),
    obraDesc:    $('#obraDescripcion'),
    selMarco:    $('#selectorMarco'),
    colgarError: $('#colgarError'),
    btnColgar:   $('#btnColgar'),
    btnCancelarObra: $('#btnCancelarObra'),

    btnNueva:    $('#btnNuevaObra'),

    modalObra:   $('#modalObra'),
    obraMarco:   $('#obraMarco'),
    obraImagen:  $('#obraImagen'),
    obraTituloVer: $('#obraTituloVer'),
    obraFecha:   $('#obraFecha'),
    obraDescVer: $('#obraDescripcionVer'),
    obraComentario: $('#obraComentario'),
    obraComentarioTexto: $('#obraComentarioTexto'),
    btnCorazon:  $('#btnCorazonObra'),
    obraFan:     $('#obraFan'),
    fanTexto:    $('#fanTexto'),
    btnGuardarFan: $('#btnGuardarFan'),
    btnBorrarObra: $('#btnBorrarObra')
  };
  if (!el.boton) return;

  const CFG = window.CONFIG;
  const J = () => window.Jardin;

  let obras   = [];
  let esFan   = false;     // él, con la sesión del jardín abierta
  let abierta = null;      // la obra que se está mirando
  let dibujo  = null;      // el archivo ya reducido, listo para subir
  let marco   = CFG.MARCOS[0].clave;

  el.titulo.textContent = 'La galería de ' + CFG.PARA;

  /* ------------------------------------------------------ elegir el marco */
  CFG.MARCOS.forEach((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opcion opcion--marco' + (i === 0 ? ' activa' : '');
    b.dataset.marco = m.clave;
    b.title = m.nombre;
    b.setAttribute('aria-label', 'Marco ' + m.nombre);
    // Dentro del marco, un trocito de color que hace de cuadro.
    b.innerHTML = '<span class="muestra-marco" data-marco="' + m.clave + '"><i></i></span>';
    b.addEventListener('click', () => {
      marco = m.clave;
      el.selMarco.querySelectorAll('.opcion').forEach(o => o.classList.remove('activa'));
      b.classList.add('activa');
    });
    el.selMarco.appendChild(b);
  });

  /* ---------------------------------------------------------- la rejilla */
  function pintarRejilla() {
    el.rejilla.innerHTML = '';
    el.vacia.hidden = obras.length > 0;

    obras.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'obra-tarjeta';
      b.innerHTML = `
        <span class="obra-tarjeta-marco" data-marco="${o.marco || 'blanco'}">
          <img src="${o.imagen}" alt="${(o.titulo || '').replace(/"/g, '&quot;')}"
               loading="lazy" decoding="async">
        </span>
        <span class="obra-tarjeta-pie">
          <span class="obra-tarjeta-titulo">${o.titulo || ''}</span>
          ${o.corazon ? '<span class="obra-tarjeta-marca obra-tarjeta-marca--corazon" title="Con el corazón de tu fan">♥</span>' : ''}
          ${o.comentario ? '<span class="obra-tarjeta-marca" title="Con nota de tu fan">✎</span>' : ''}
        </span>`;
      b.addEventListener('click', () => verObra(o.id));
      el.rejilla.appendChild(b);
    });
  }

  /* ------------------------------------------------------ mirar un dibujo */
  function verObra(id) {
    const o = obras.find(x => x.id === id);
    if (!o) return;
    abierta = o;

    el.obraMarco.dataset.marco = o.marco || 'blanco';
    el.obraImagen.src = o.imagen;
    el.obraImagen.alt = o.titulo || 'Dibujo';
    el.obraTituloVer.textContent = o.titulo || '';
    el.obraFecha.textContent = J().fechaLarga(o.created_at);
    el.obraDescVer.textContent = o.descripcion || '';
    el.obraDescVer.hidden = !o.descripcion;

    el.obraComentario.hidden = !o.comentario;
    el.obraComentarioTexto.textContent = o.comentario || '';

    pintarCorazon();

    // Escribir el comentario y quitar el dibujo son cosa suya, con la sesión
    // del jardín abierta.
    el.obraFan.hidden = !esFan;
    el.fanTexto.value = o.comentario || '';
    el.btnBorrarObra.hidden = !esFan;

    J().abrirModal(el.modalObra);
  }

  /* -------------------------------------------------------- el corazón -- */
  function pintarCorazon() {
    if (!abierta) return;
    el.btnCorazon.classList.toggle('dado', abierta.corazon);
    el.btnCorazon.setAttribute('aria-pressed', String(abierta.corazon));
    el.btnCorazon.disabled = abierta.corazon;   // se da una vez, no se quita
  }

  el.btnCorazon.addEventListener('click', async () => {
    if (!abierta || abierta.corazon) return;
    abierta.corazon = true;
    pintarCorazon();
    el.btnCorazon.classList.add('latiendo');
    setTimeout(() => el.btnCorazon.classList.remove('latiendo'), 900);
    try {
      await Datos.arte.darCorazon(abierta.id);
      pintarRejilla();
    } catch (err) {
      abierta.corazon = false;
      pintarCorazon();
      J().aviso('No pude guardar el corazón');
      console.error(err);
    }
  });

  el.btnGuardarFan.addEventListener('click', async () => {
    if (!abierta) return;
    const texto = el.fanTexto.value.trim();
    el.btnGuardarFan.disabled = true;
    try {
      await Datos.arte.comentar(abierta.id, texto);
      abierta.comentario = texto || null;
      el.obraComentario.hidden = !texto;
      el.obraComentarioTexto.textContent = texto;
      pintarRejilla();
      J().aviso('Se lo dejaste dicho');
    } catch (err) {
      J().aviso('No pude guardarlo');
      console.error(err);
    } finally {
      el.btnGuardarFan.disabled = false;
    }
  });

  el.btnBorrarObra.addEventListener('click', async () => {
    if (!abierta) return;
    if (!confirm('¿Quitar este dibujo de la galería? No se puede deshacer.')) return;
    try {
      await Datos.arte.borrar(abierta.id);
      obras = obras.filter(o => o.id !== abierta.id);
      pintarRejilla();
      J().cerrarModal(el.modalObra);
      J().aviso('Dibujo retirado');
    } catch (err) {
      J().aviso(err.message || 'No pude quitarlo');
    }
  });

  /* ------------------------------------------------------ colgar un dibujo */
  function limpiarFormulario() {
    dibujo = null;
    if (el.obraPrevia.src.startsWith('blob:')) URL.revokeObjectURL(el.obraPrevia.src);
    el.obraPrevia.removeAttribute('src');
    el.obraPrevia.hidden = true;
    el.zonaObra.classList.remove('con-foto');
    el.obraTexto.textContent = 'Toca para elegir tu dibujo';
    el.obraInput.value = '';
    el.obraTitulo.value = '';
    el.obraDesc.value = '';
    el.colgarError.hidden = true;
  }

  el.obraInput.addEventListener('change', async () => {
    const archivo = el.obraInput.files[0];
    if (!archivo) return;
    el.zonaObra.classList.add('cargando');
    try {
      // Los dibujos merecen más resolución que una foto de nota.
      dibujo = await Datos.reducirImagen(archivo, 2000, 0.88);
      if (el.obraPrevia.src.startsWith('blob:')) URL.revokeObjectURL(el.obraPrevia.src);
      el.obraPrevia.src = URL.createObjectURL(dibujo);
      el.obraPrevia.hidden = false;
      el.zonaObra.classList.add('con-foto');
      el.obraTexto.textContent = 'Toca para cambiarlo';
    } catch (err) {
      limpiarFormulario();
      J().aviso(err.message);
    } finally {
      el.zonaObra.classList.remove('cargando');
    }
  });

  el.formColgar.addEventListener('submit', async e => {
    e.preventDefault();
    if (!dibujo) { el.colgarError.textContent = 'Falta el dibujo'; el.colgarError.hidden = false; return; }

    el.btnColgar.disabled = true;
    el.btnColgar.textContent = 'Colgando…';
    el.colgarError.hidden = true;
    try {
      const obra = await Datos.arte.publicar({
        titulo: el.obraTitulo.value.trim(),
        descripcion: el.obraDesc.value.trim(),
        marco,
        imagen: dibujo
      });
      obras.unshift(obra);
      pintarRejilla();
      limpiarFormulario();
      el.formColgar.hidden = true;
      el.btnNueva.hidden = false;
      J().aviso('Colgado en tu galería 🎨');
    } catch (err) {
      el.colgarError.textContent = err.message || 'No pude colgarlo';
      el.colgarError.hidden = false;
    } finally {
      el.btnColgar.disabled = false;
      el.btnColgar.textContent = 'Colgar';
    }
  });

  el.btnNueva.addEventListener('click', () => {
    el.formColgar.hidden = false;
    el.btnNueva.hidden = true;
    el.formColgar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  el.btnCancelarObra.addEventListener('click', () => {
    limpiarFormulario();
    el.formColgar.hidden = true;
    el.btnNueva.hidden = false;
  });

  /* -------------------------------------------------------------- abrir -- */
  async function abrirGaleria() {
    J().abrirModal(el.modal);
    try {
      [obras, esFan] = await Promise.all([Datos.arte.listar(), Datos.sesion()]);
    } catch (err) {
      obras = [];
      J().aviso('No pude abrir la galería');
      console.error(err);
    }
    pintarRejilla();
  }

  el.boton.addEventListener('click', abrirGaleria);

  // Si ella cuelga algo mientras él mira, aparece solo.
  if (Datos.arte.suscribir) {
    Datos.arte.suscribir(async () => {
      if (el.modal.hidden) return;
      try { obras = await Datos.arte.listar(); pintarRejilla(); } catch {}
    });
  }
})();
