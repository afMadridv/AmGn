/* ==========================================================================
   LA GALERÍA — sus dibujos
   --------------------------------------------------------------------------
   Quién puede qué:

     · MIRAR no pide cuenta.
     · COLGAR y QUITAR piden la sesión del jardín (la de la puerta). Colgar
       estuvo abierto sin cuenta, pero con la clave pública en el repo un bot
       podía llenarle la galería saltándose la app (SECURITY.md, punto 12).
     · El CORAZÓN y los comentarios van firmados, igual que en las notas
       (js/social.js).

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
    colgarError: $('#colgarError'),
    btnColgar:   $('#btnColgar'),
    btnCancelarObra: $('#btnCancelarObra'),

    btnNueva:    $('#btnNuevaObra'),

    modalObra:   $('#modalObra'),
    obraImagen:  $('#obraImagen'),
    obraTituloVer: $('#obraTituloVer'),
    obraFecha:   $('#obraFecha'),
    obraDescVer: $('#obraDescripcionVer'),
    btnCorazon:  $('#btnCorazonObra'),
    btnBorrarObra: $('#btnBorrarObra')
  };
  if (!el.boton) return;

  const CFG = window.CONFIG;
  const J = () => window.Jardin;

  let obras   = [];
  let esFan   = false;     // él, con la sesión del jardín abierta
  let abierta = null;      // la obra que se está mirando
  let dibujo  = null;      // el archivo ya reducido, listo para subir

  el.titulo.textContent = 'La galería de ' + CFG.PARA;

  /* ---------------------------------------------------------- la rejilla */
  function pintarRejilla() {
    el.rejilla.innerHTML = '';
    el.vacia.hidden = obras.length > 0;

    obras.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'obra-tarjeta';
      b.innerHTML = `
        <span class="obra-tarjeta-marco">
          <img src="${J().escapar(o.imagen)}" alt="${J().escapar(o.titulo)}"
               loading="lazy" decoding="async">
        </span>
        <span class="obra-tarjeta-pie">
          <span class="obra-tarjeta-titulo">${J().escapar(o.titulo)}</span>
          ${o.corazon ? '<span class="obra-tarjeta-marca--corazon" title="Con el corazón de tu fan">♥</span>' : ''}
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

    el.obraImagen.src = o.imagen;
    el.obraImagen.alt = o.titulo || 'Dibujo';
    el.obraTituloVer.textContent = o.titulo || '';
    el.obraFecha.textContent = J().fechaLarga(o.created_at);
    el.obraDescVer.textContent = o.descripcion || '';
    el.obraDescVer.hidden = !o.descripcion;

    // Quitar un dibujo es cosa suya, con la sesión del jardín abierta.
    el.btnBorrarObra.hidden = !esFan;

    // El corazón y los comentarios los lleva js/social.js, igual que en las
    // notas: ahí se sabe quién firma y queda su nombre.
    if (window.Social) {
      Social.abrir(document.getElementById('socialObra'), 'obra', o.id, el.btnCorazon);
    }

    J().abrirModal(el.modalObra);
  }

  el.btnBorrarObra.addEventListener('click', async () => {
    if (!abierta) return;
    const seguro = await J().confirmar({
      titulo: '¿Descolgar este dibujo?',
      texto: `«${abierta.titulo}» sale de la galería, y con él lo que escribiste debajo.`,
      aceptar: 'Sí, descolgarlo'
    });
    if (!seguro) return;
    try {
      // La lista sólo se toca si el borrado se confirmó de verdad: si no, el
      // dibujo desaparecía de la pantalla y volvía al recargar.
      await Datos.arte.borrar(abierta.id, abierta.imagen);
      obras = obras.filter(o => o.id !== abierta.id);
      pintarRejilla();
      J().cerrarModal(el.modalObra);
      J().aviso('Dibujo retirado');
    } catch (err) {
      J().aviso(err.message || 'No pude quitarlo');
      console.error(err);
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
