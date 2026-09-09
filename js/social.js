/* ==========================================================================
   COMENTARIOS Y CORAZONES FIRMADOS
   --------------------------------------------------------------------------
   El mismo bloque sirve para una nota del jardín y para un dibujo de la
   galería: lo único que cambia es `sobre` ('nota' u 'obra') y el id del
   objeto. Por eso vive aparte y no dentro de app.js o galeria.js.

   Quién firma: el correo con la sesión abierta. No se pregunta ni se elige;
   la política de la base rechaza cualquier fila cuyo `autor` no sea el de la
   sesión (ver sql/instalar.sql), así que el nombre que aparece es de fiar.

   Sin sesión se lee todo pero no se escribe: el bloque enseña el aviso y
   esconde la caja de texto.
   ========================================================================== */
(function () {
  'use strict';

  const J = () => window.Jardin;

  /* Cada bloque montado en pantalla, para poder repintarlos cuando el otro
     escriba algo. Se guardan por elemento, no por id: el mismo objeto puede
     estar abierto en dos sitios (el libro y el jardín). */
  const montados = new Set();

  let yo = null;          // { correo, nombre } o null
  let yoPedido = false;

  async function quienSoy(recargar) {
    if (!yoPedido || recargar) {
      yo = await Datos.quienSoy().catch(() => null);
      yoPedido = true;
    }
    return yo;
  }

  /* Cuando se entra o se sale, lo que se puede hacer cambia: hay que volver a
     preguntar quién es y repintar lo que esté abierto. */
  function olvidarSesion() {
    yoPedido = false;
    montados.forEach(b => refrescar(b));
  }

  /* ------------------------------------------------------------ pintar --- */
  function pintarCorazones(bloque, corazones) {
    const caja = bloque.querySelector('.social-corazones');
    if (!corazones.length) {
      caja.hidden = true;
      caja.innerHTML = '';
      return;
    }
    caja.hidden = false;
    const nombres = corazones.map(c => J().escapar(c.nombre));
    const texto = nombres.length === 1
      ? `A <b>${nombres[0]}</b> le gusta esto`
      : `A <b>${nombres.slice(0, -1).join('</b>, <b>')}</b> y <b>${nombres[nombres.length - 1]}</b> les gusta esto`;
    caja.innerHTML = `<span class="social-corazones-icono" aria-hidden="true">♥</span>
                      <span>${texto}</span>`;
  }

  function pintarComentarios(bloque, comentarios) {
    const lista = bloque.querySelector('.social-lista');
    const vacio = bloque.querySelector('.social-vacio');
    lista.innerHTML = '';
    vacio.hidden = comentarios.length > 0;

    comentarios.forEach(c => {
      const li = document.createElement('li');
      li.className = 'social-item' + (yo && c.autor === yo.correo ? ' social-item--mio' : '');
      const suyo = yo && c.autor === yo.correo;
      li.innerHTML = `
        <span class="social-avatar" aria-hidden="true">${J().escapar(c.nombre.charAt(0))}</span>
        <span class="social-cuerpo">
          <span class="social-firma">
            <b>${J().escapar(c.nombre)}</b>
            <time datetime="${J().escapar(c.fecha)}">${J().fechaCorta(c.fecha)}</time>
          </span>
          <span class="social-texto">${J().escapar(c.texto)}</span>
        </span>
        ${suyo ? '<button type="button" class="social-borrar" aria-label="Borrar mi comentario">×</button>' : ''}`;

      if (suyo) {
        li.querySelector('.social-borrar').addEventListener('click', async () => {
          try {
            await Datos.social.borrarComentario(c.id);
            refrescar(bloque);
          } catch (err) {
            J().aviso(err.message || 'No pude borrarlo');
          }
        });
      }
      lista.appendChild(li);
    });
  }

  function pintarCorazonBoton(bloque, corazones) {
    const btn = bloque._boton;
    if (!btn) return;
    const mio = Boolean(yo && corazones.some(c => c.autor === yo.correo));
    btn.classList.toggle('dado', mio);
    btn.setAttribute('aria-pressed', String(mio));
    // Con sesión el corazón se puede quitar; sin ella, ni dar ni quitar.
    btn.disabled = !yo;
    btn.setAttribute('aria-label', !yo ? 'Entra al jardín para dar corazón'
                                       : mio ? 'Quitar mi corazón' : 'Dar corazón');
  }

  /* ----------------------------------------------------------- refrescar -- */
  async function refrescar(bloque) {
    const { sobre, objeto } = bloque._que;
    await quienSoy();

    bloque.querySelector('.social-form').hidden = !yo;
    bloque.querySelector('.social-cerrado').hidden = Boolean(yo);

    let datos;
    try {
      datos = await Datos.social.listar(sobre, objeto);
    } catch (err) {
      // Lo más común: falta correr sql/instalar.sql con las tablas nuevas.
      console.info('No pude leer los comentarios:', err.message);
      bloque.hidden = false;
      pintarComentarios(bloque, []);
      pintarCorazones(bloque, []);
      return;
    }

    bloque._corazones = datos.corazones;
    pintarComentarios(bloque, datos.comentarios);
    pintarCorazones(bloque, datos.corazones);
    pintarCorazonBoton(bloque, datos.corazones);
  }

  /* -------------------------------------------------------------- montar -- */
  /* Se llama cada vez que se abre una nota o un dibujo. `boton` es el corazón
     que ya existía en ese modal: se le cambia el comportamiento para que
     ahora firme, en vez de poner un booleano suelto. */
  function abrir(bloque, sobre, objeto, boton) {
    bloque._que = { sobre, objeto };
    bloque._boton = boton || null;
    montados.add(bloque);

    if (!bloque._listo) {
      bloque._listo = true;

      bloque.querySelector('.social-form').addEventListener('submit', async e => {
        e.preventDefault();
        const caja = bloque.querySelector('.social-entrada');
        const texto = caja.value.trim();
        if (!texto) return;

        const btn = bloque.querySelector('.social-enviar');
        btn.disabled = true;
        try {
          await Datos.social.comentar(bloque._que.sobre, bloque._que.objeto, texto);
          caja.value = '';
          caja.style.height = '';
          await refrescar(bloque);
          bloque.querySelector('.social-lista').lastElementChild
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } catch (err) {
          J().aviso(err.message || 'No pude publicar tu comentario');
        } finally {
          btn.disabled = false;
        }
      });

      // La caja crece con lo que se escribe, hasta un tope.
      const caja = bloque.querySelector('.social-entrada');
      caja.addEventListener('input', () => {
        caja.style.height = 'auto';
        caja.style.height = Math.min(caja.scrollHeight, 120) + 'px';
      });
      // Enter envía, Shift+Enter hace salto de línea.
      caja.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          bloque.querySelector('.social-form').requestSubmit();
        }
      });
    }

    if (boton && !boton._social) {
      boton._social = true;
      boton.addEventListener('click', async () => {
        if (!yo) { J().aviso('Entra al jardín para dar corazón'); return; }
        const { sobre: s, objeto: o } = bloque._que;
        const mio = (bloque._corazones || []).some(c => c.autor === yo.correo);
        try {
          if (mio) {
            await Datos.social.quitarCorazon(s, o);
          } else {
            await Datos.social.darCorazon(s, o);
            boton.classList.add('latiendo');
            setTimeout(() => boton.classList.remove('latiendo'), 900);
          }
          await refrescar(bloque);
        } catch (err) {
          J().aviso(err.message || 'No pude guardar el corazón');
        }
      });
    }

    bloque.hidden = false;
    refrescar(bloque);
  }

  function cerrar(bloque) { montados.delete(bloque); }

  /* Lo que escriba el otro aparece sin recargar. */
  if (Datos.social && Datos.social.suscribir) {
    Datos.social.suscribir(() => montados.forEach(b => refrescar(b)));
  }

  window.Social = { abrir, cerrar, olvidarSesion, quienSoy };
})();
