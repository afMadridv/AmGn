/* ==========================================================================
   CAPA DE DATOS
   --------------------------------------------------------------------------
   Una sola interfaz para la app (app.js), con dos implementaciones detrás:

     · Supabase  → tiempo real + auth (si hay credenciales en config.js)
     · localStorage → modo demo offline (si no las hay)

   API pública:
     Datos.modo                      -> 'supabase' | 'local'
     Datos.iniciar()                 -> Promise<void>
     Datos.listar()                  -> Promise<Flor[]>
     Datos.sembrar({texto,emoji,hue,x,y}) -> Promise<Flor>
     Datos.borrar(id)                -> Promise<void>
     Datos.suscribir(cb)             -> escucha cambios en vivo
     Datos.entrar(email, pass)       -> Promise<void>
     Datos.salir()                   -> Promise<void>
     Datos.sesion()                  -> Promise<boolean>
     Datos.alConectar(cb)            -> estado del canal realtime
     Datos.avisos.guardar(sus)       -> apunta este teléfono para los avisos
     Datos.avisos.quitar(endpoint)   -> lo borra
   ========================================================================== */
(function () {
  'use strict';

  const CFG   = window.CONFIG;
  const TABLA = 'flores';
  const LLAVE = 'patico:flores';
  const OBRAS = 'obras';
  const LLAVE_OBRAS = 'patico:obras';
  const LLAVE_SOCIAL = 'patico:social';

  // Con ?demo=1 la app trabaja contra localStorage aunque haya credenciales:
  // sirve para probar cambios sin tocar el jardín de verdad.
  const forzarDemo = new URLSearchParams(location.search).get('demo') === '1';

  const usaSupabase = !forzarDemo && Boolean(
    CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase
  );

  // Lo que se dice cuando el RLS deja pasar la petición pero no toca ninguna
  // fila: casi siempre es que la sesión del portal ya no está abierta.
  const SIN_PERMISO = 'No se pudo: abre el portal e inténtalo otra vez.';
  const SIN_SESION  = 'Entra al jardín para poder firmar esto.';

  /* El nombre con el que se firma. Sale de CFG.NOMBRES; si el correo no está
     en la lista se usa lo que hay antes de la arroba, con la inicial en alta,
     para que nunca aparezca un comentario sin nombre. */
  function nombreDe(correo) {
    const c = String(correo || '').toLowerCase();
    const puesto = (CFG.NOMBRES || {})[c];
    if (puesto) return puesto;
    const apodo = c.split('@')[0] || 'Alguien';
    return apodo.charAt(0).toUpperCase() + apodo.slice(1);
  }

  const aComentario = f => ({
    id: f.id, sobre: f.sobre, objeto: f.objeto,
    autor: f.autor, nombre: nombreDe(f.autor),
    texto: f.texto, fecha: f.created_at || new Date().toISOString()
  });

  const aCorazon = f => ({
    autor: f.autor, nombre: nombreDe(f.autor),
    fecha: f.created_at || new Date().toISOString()
  });

  let sb = null;
  let alCambiar = () => {};
  let alEstado  = () => {};

  /* Avisa al teléfono del otro de lo que uno acaba de hacer (api/avisar.js).
     Sólo se dice qué pasó y dónde; el texto lo redacta el servidor con lo
     que hay en la base. Se manda y se olvida: si falla, lo hecho ya está
     hecho. `keepalive` deja salir la petición aunque se cierre la app justo
     después de tocar el botón. */
  async function avisar(evento) {
    try {
      const { data } = await sb.auth.getSession();
      const token = data.session && data.session.access_token;
      if (!token) return;
      fetch('/api/avisar', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(evento)
      }).catch(() => {});
    } catch { /* sin avisos no se rompe nada */ }
  }

  /* ------------------------------------------------------ reducir fotos --
     Las fotos del móvil pesan varios megas. Se reescalan y recomprimen en el
     propio teléfono antes de subirlas: sube rápido y se abren sin gastar
     datos. Lo usan tanto las notas como la galería.

     Se admite cualquier formato que el navegador sepa abrir, y se procura
     devolverlo sin estropearlo: un GIF animado se sube tal cual —pasarlo por
     el lienzo lo dejaría congelado—, y lo que pueda tener transparencia sale
     en WebP, que la conserva, en vez de JPEG, que la rellenaría de negro.  */

  // Formatos que pueden traer transparencia.
  const CON_ALFA = /^image\/(png|webp|gif|avif|svg)/;
  // Formatos que casi ningún navegador sabe decodificar.
  const CRUDOS = /\.(heic|heif|tiff?|cr2|cr3|nef|arw|dng|raf|orf|rw2)$/i;

  const aBlob = (lienzo, tipo, calidad) =>
    new Promise(ok => lienzo.toBlob(b => ok(b), tipo, calidad));

  function abrirImagen(archivo) {
    return new Promise((ok, mal) => {
      const url = URL.createObjectURL(archivo);
      const im = new Image();
      im.onload  = () => { URL.revokeObjectURL(url); ok(im); };
      im.onerror = () => {
        URL.revokeObjectURL(url);
        // Decir qué formato es ayuda más que un "no se puede leer" a secas.
        const ext = (archivo.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
        mal(new Error(CRUDOS.test(archivo.name)
          ? `Este navegador no sabe abrir archivos ${ext}. Guárdala como JPG o PNG y vuelve a intentarlo.`
          : 'Esa imagen no se puede leer'));
      };
      im.src = url;
    });
  }

  async function reducirImagen(archivo, maxLado = 1600, calidad = 0.82) {
    // El lienzo se queda con el primer fotograma: un GIF animado se sube
    // entero mientras no sea enorme.
    if (archivo.type === 'image/gif' && archivo.size <= 4 * 1024 * 1024) return archivo;

    const im = await abrirImagen(archivo);
    const escala = Math.min(1, maxLado / Math.max(im.width, im.height));

    // Si ya viene pequeña y ligera, se deja como está: recomprimir lo que ya
    // está comprimido sólo le quita calidad.
    if (escala === 1 && archivo.size <= 1.5 * 1024 * 1024 &&
        /^image\/(jpeg|png|webp)$/.test(archivo.type)) {
      return archivo;
    }

    const c = document.createElement('canvas');
    c.width  = Math.max(1, Math.round(im.width  * escala));
    c.height = Math.max(1, Math.round(im.height * escala));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);

    const tipo = CON_ALFA.test(archivo.type) ? 'image/webp' : 'image/jpeg';
    // Si el navegador no sabe escribir WebP, `toBlob` devuelve el tipo por
    // defecto (PNG) en vez de fallar; se comprueba y se acepta.
    const blob = await aBlob(c, tipo, calidad) || await aBlob(c, 'image/png');
    if (!blob) throw new Error('No pude procesar la imagen');
    return blob;
  }

  // De `image/jpeg` a `jpg`, de `image/svg+xml` a `svg`.
  const extensionDe = tipo =>
    (String(tipo).split('/')[1] || 'jpg').split('+')[0].replace('jpeg', 'jpg');

  /* ---------- normalización: la fila de la BD -> objeto de la app -------- */
  function aFlor(fila) {
    return {
      id:     fila.id,
      texto:  fila.texto,
      especie: fila.especie || fila.emoji || 'lirio',
      hue:    Number(fila.hue) || 0,
      foto:   fila.foto || null,
      corazon: Boolean(fila.corazon),
      x:      Number(fila.x),
      y:      Number(fila.y),
      fecha:  fila.created_at || fila.fecha || new Date().toISOString()
    };
  }

  /* ====================================================================== */
  /*  MODO SUPABASE                                                          */
  /* ====================================================================== */
  const Remoto = {
    async iniciar() {
      // La sesión del portal NO se guarda: vive en memoria y muere al cerrar o
      // recargar la página. Así, si ella abre el enlace en tu teléfono, entra
      // al jardín como cualquiera y el portal le pide la contraseña.
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 5 } }
      });

      // Barre lo que hubiera dejado guardado una versión anterior de la app.
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-') || k.startsWith('supabase.auth'))
          .forEach(k => localStorage.removeItem(k));
      } catch { /* modo privado sin localStorage: nada que barrer */ }
    },

    async listar() {
      const { data, error } = await sb
        .from(TABLA).select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(aFlor);
    },

    async sembrar(flor) {
      const { data, error } = await sb.from(TABLA).insert({
        texto: flor.texto, especie: flor.especie, hue: flor.hue,
        foto: flor.foto || null, x: flor.x, y: flor.y
      }).select().single();
      if (error) throw error;
      avisar({ tipo: 'flor', id: data.id });
      return aFlor(data);
    },

    // Sube la imagen ya reducida y devuelve su URL pública. El nombre y el
    // tipo salen del archivo: puede llegar en JPEG, WebP, PNG o GIF.
    async subirFoto(archivo) {
      const nombre = Date.now().toString(36) + '-' +
                     Math.random().toString(36).slice(2, 8) + '.' +
                     extensionDe(archivo.type);

      const { error } = await sb.storage
        .from(CFG.BUCKET_FOTOS)
        .upload(nombre, archivo, { contentType: archivo.type, upsert: false });

      if (error) {
        // El fallo más común es no haber creado el bucket todavía.
        if (/bucket/i.test(error.message)) {
          throw new Error('Falta crear el bucket: corre sql/instalar.sql');
        }
        throw error;
      }
      const { data } = sb.storage.from(CFG.BUCKET_FOTOS).getPublicUrl(nombre);
      return data.publicUrl;
    },

    // Igual que en la galería: si el RLS no deja, no hay error, hay cero
    // filas borradas. Hay que mirarlo para no cantar victoria en falso.
    async borrar(id) {
      const { data, error } = await sb.from(TABLA).delete().eq('id', id).select();
      if (error) throw error;
      if (!data || !data.length) throw new Error(SIN_PERMISO);
    },

    // Ella no tiene cuenta: el corazón se pone con una función del servidor
    // que sólo sabe hacer eso. Ver dar_corazon() en sql/instalar.sql.
    async darCorazon(id) {
      const { error } = await sb.rpc('dar_corazon', { flor_id: id });
      if (error) throw error;
    },

    suscribir(cb) {
      alCambiar = cb;
      sb.channel('jardin')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: TABLA },
            p => alCambiar({ tipo: 'alta', flor: aFlor(p.new) }))
        .on('postgres_changes',
            { event: 'DELETE', schema: 'public', table: TABLA },
            p => alCambiar({ tipo: 'baja', id: p.old.id }))
        .subscribe(estado => {
          alEstado(estado === 'SUBSCRIBED' ? 'en vivo'
                 : estado === 'CHANNEL_ERROR' ? 'sin conexión'
                 : 'conectando…');
        });

      // Si el móvil vuelve del segundo plano, re-sincroniza por si se
      // perdieron eventos mientras la pestaña estaba dormida.
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) alCambiar({ tipo: 'resync' });
      });
    },

    async entrar(email, pass) {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
    },

    async salir() { await sb.auth.signOut(); },

    async sesion() {
      const { data } = await sb.auth.getSession();
      return Boolean(data.session);
    },

    async quienSoy() {
      const { data } = await sb.auth.getSession();
      const correo = data.session && data.session.user && data.session.user.email;
      return correo ? { correo, nombre: nombreDe(correo) } : null;
    },

    /* --------------------------------------------------- comentarios y ♥ --
       Las dos tablas van juntas porque se usan igual y siempre en pareja:
       debajo de una nota o de un dibujo se enseña quién comentó y quién dio
       corazón. `sobre` dice si el objeto es una nota o una obra.

       El autor lo pone la política de la base (ver sql/instalar.sql): aquí se
       manda, pero si no coincide con la sesión, el insert se rechaza. */
    social: {
      async listar(sobre, objeto) {
        const [com, cor] = await Promise.all([
          sb.from('comentarios').select('*')
            .eq('sobre', sobre).eq('objeto', objeto)
            .order('created_at', { ascending: true }),
          sb.from('corazones').select('*')
            .eq('sobre', sobre).eq('objeto', objeto)
            .order('created_at', { ascending: true })
        ]);
        if (com.error) throw com.error;
        if (cor.error) throw cor.error;
        return {
          comentarios: (com.data || []).map(aComentario),
          corazones:   (cor.data || []).map(aCorazon)
        };
      },

      async comentar(sobre, objeto, texto) {
        const yo = await Remoto.quienSoy();
        if (!yo) throw new Error(SIN_SESION);
        const { data, error } = await sb.from('comentarios')
          .insert({ sobre, objeto, autor: yo.correo, texto })
          .select().single();
        if (error) throw error;
        avisar({ tipo: 'comentario', id: data.id });
        return aComentario(data);
      },

      async borrarComentario(id) {
        const { data, error } = await sb.from('comentarios')
          .delete().eq('id', id).select();
        if (error) throw error;
        if (!data || !data.length) throw new Error('Ese comentario no es tuyo');
      },

      // La clave primaria (sobre, objeto, autor) impide dar dos veces el
      // mismo corazón: si ya estaba, Postgres devuelve conflicto y se ignora.
      async darCorazon(sobre, objeto) {
        const yo = await Remoto.quienSoy();
        if (!yo) throw new Error(SIN_SESION);
        const { error } = await sb.from('corazones')
          .upsert({ sobre, objeto, autor: yo.correo },
                  { onConflict: 'sobre,objeto,autor', ignoreDuplicates: true });
        if (error) throw error;
        avisar({ tipo: 'corazon', sobre, objeto });
        return aCorazon({ sobre, objeto, autor: yo.correo,
                          created_at: new Date().toISOString() });
      },

      async quitarCorazon(sobre, objeto) {
        const yo = await Remoto.quienSoy();
        if (!yo) throw new Error(SIN_SESION);
        const { error } = await sb.from('corazones').delete()
          .eq('sobre', sobre).eq('objeto', objeto).eq('autor', yo.correo);
        if (error) throw error;
      },

      // Un solo canal para las dos tablas: lo que escriba o marque el otro
      // aparece sin recargar.
      suscribir(cb) {
        sb.channel('social')
          .on('postgres_changes',
              { event: '*', schema: 'public', table: 'comentarios' }, cb)
          .on('postgres_changes',
              { event: '*', schema: 'public', table: 'corazones' }, cb)
          .subscribe();
      }
    },

    /* ------------------------------------------------------- la galería --
       Colgar no pide cuenta: el enlace es de ella. Quitar sí, y de eso se
       encarga el RLS. El corazón va por función, como en las notas.        */
    arte: {
      async listar() {
        const { data, error } = await sb
          .from(OBRAS).select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },

      async publicar({ titulo, descripcion, imagen }) {
        const nombre = Date.now().toString(36) + '-' +
                       Math.random().toString(36).slice(2, 8) + '.' +
                       extensionDe(imagen.type);

        const { error: errSubida } = await sb.storage
          .from('galeria').upload(nombre, imagen, { contentType: imagen.type });
        if (errSubida) {
          if (/bucket/i.test(errSubida.message)) {
            throw new Error('Falta crear la galería: corre sql/instalar.sql');
          }
          throw errSubida;
        }

        const { data: pub } = sb.storage.from('galeria').getPublicUrl(nombre);
        const { data, error } = await sb.from(OBRAS)
          .insert({ titulo, descripcion, imagen: pub.publicUrl })
          .select().single();
        if (error) throw error;
        avisar({ tipo: 'obra', id: data.id });
        return data;
      },

      // Ojo con el RLS: si no deja borrar, Postgres no da error, simplemente
      // no borra ninguna fila. Sin mirar cuántas cayeron, la app decía que sí
      // y el dibujo reaparecía al recargar. Por eso el `.select()`.
      async borrar(id, imagen) {
        const { data, error } = await sb.from(OBRAS).delete().eq('id', id).select();
        if (error) throw error;
        if (!data || !data.length) throw new Error(SIN_PERMISO);

        // La fila ya no está; el archivo tampoco debería quedarse ocupando
        // sitio. Si falla, no se avisa: el dibujo ya desapareció de la vista.
        const nombre = (imagen || '').split('/galeria/')[1];
        if (nombre) {
          const { error: err } = await sb.storage.from('galeria').remove([nombre]);
          if (err) console.info('El dibujo se quitó, pero su archivo sigue ahí:', err.message);
        }
      },

      // El corazón, igual que en las notas: por función, para no abrirle un
      // UPDATE a nadie. Se da una vez y no se quita.
      async darCorazon(id) {
        const { error } = await sb.rpc('dar_corazon_obra', { obra_id: id });
        if (error) throw error;
      },

      suscribir(cb) {
        sb.channel('galeria')
          .on('postgres_changes', { event: '*', schema: 'public', table: OBRAS }, cb)
          .subscribe();
      }
    },

    /* ------------------------------------------------- avisos al teléfono --
       La dirección de push de este teléfono, apuntada a nombre de quien
       tiene la sesión. Si ya estaba a nombre del otro (ella encendió la
       campana en tu teléfono), se borra y se vuelve a crear: el RLS no deja
       cambiar el autor de una fila, y así no hace falta. Ver js/avisos.js. */
    avisos: {
      async guardar(suscripcion) {
        const yo = await Remoto.quienSoy();
        if (!yo) throw new Error(SIN_SESION);
        const s = suscripcion.toJSON();
        await sb.from('avisos').delete().eq('endpoint', s.endpoint);
        const { error } = await sb.from('avisos').insert({
          endpoint: s.endpoint, autor: yo.correo,
          p256dh: s.keys.p256dh, auth: s.keys.auth
        });
        if (error) throw error;
      },

      async quitar(endpoint) {
        const { error } = await sb.from('avisos').delete().eq('endpoint', endpoint);
        if (error) throw error;
      }
    }
  };

  /* ====================================================================== */
  /*  MODO LOCAL (demo)                                                      */
  /* ====================================================================== */
  const Local = {
    _leer() {
      try { return JSON.parse(localStorage.getItem(LLAVE)) || []; }
      catch { return []; }
    },
    _guardar(v) { localStorage.setItem(LLAVE, JSON.stringify(v)); },

    async iniciar() {
      // Igual que en Supabase: cada visita empieza sin sesión.
      sessionStorage.removeItem('patico:sesion');
    },

    async listar() { return this._leer().map(aFlor); },

    async sembrar(flor) {
      const nueva = Object.assign(
        { id: 'l_' + Date.now().toString(36), fecha: new Date().toISOString() },
        flor
      );
      const todas = this._leer(); todas.push(nueva); this._guardar(todas);
      return aFlor(nueva);
    },

    // En demo la foto se queda como data URL dentro del propio navegador.
    async subirFoto(archivo) {
      return await new Promise((ok, mal) => {
        const fr = new FileReader();
        fr.onload = () => ok(fr.result);
        fr.onerror = () => mal(new Error('No pude leer la imagen'));
        fr.readAsDataURL(archivo);
      });
    },

    async borrar(id) {
      this._guardar(this._leer().filter(f => f.id !== id));
    },

    async darCorazon(id) {
      const todas = this._leer();
      const f = todas.find(x => x.id === id);
      if (f) { f.corazon = true; this._guardar(todas); }
    },

    suscribir(cb) {
      alCambiar = cb;
      // Sincroniza entre pestañas del mismo navegador.
      window.addEventListener('storage', e => {
        if (e.key === LLAVE) alCambiar({ tipo: 'resync' });
      });
      alEstado('modo demo');
    },

    /* --------------------------------- la galería, guardada en el propio
       navegador. La imagen se queda como data URL.                       */
    arte: {
      _leer() {
        try { return JSON.parse(localStorage.getItem(LLAVE_OBRAS)) || []; }
        catch { return []; }
      },
      _guardar(v) { localStorage.setItem(LLAVE_OBRAS, JSON.stringify(v)); },

      async listar() { return this._leer(); },

      async publicar({ titulo, descripcion, imagen }) {
        const url = await new Promise((ok, mal) => {
          const fr = new FileReader();
          fr.onload = () => ok(fr.result);
          fr.onerror = () => mal(new Error('No pude leer la imagen'));
          fr.readAsDataURL(imagen);
        });
        const obra = {
          id: 'o_' + Date.now().toString(36),
          titulo, descripcion, imagen: url,
          corazon: false,
          created_at: new Date().toISOString()
        };
        const todas = this._leer(); todas.unshift(obra); this._guardar(todas);
        return obra;
      },

      async borrar(id) { this._guardar(this._leer().filter(o => o.id !== id)); },

      async darCorazon(id) {
        const t = this._leer();
        const o = t.find(x => x.id === id);
        if (o) { o.corazon = true; this._guardar(t); }
      },

      suscribir() {}
    },

    /* Comentarios y corazones de mentira, guardados en el propio navegador.
       Sirven para probar la pantalla sin tocar el jardín de verdad. */
    social: {
      _leer() {
        try { return JSON.parse(localStorage.getItem(LLAVE_SOCIAL)) || { c: [], k: [] }; }
        catch { return { c: [], k: [] }; }
      },
      _guardar(v) { localStorage.setItem(LLAVE_SOCIAL, JSON.stringify(v)); },

      async listar(sobre, objeto) {
        const d = this._leer();
        const mio = x => x.sobre === sobre && String(x.objeto) === String(objeto);
        return {
          comentarios: d.c.filter(mio).map(aComentario),
          corazones:   d.k.filter(mio).map(aCorazon)
        };
      },

      async comentar(sobre, objeto, texto) {
        const yo = await Local.quienSoy();
        if (!yo) throw new Error(SIN_SESION);
        const nuevo = { id: 'c_' + Date.now().toString(36), sobre, objeto,
                        autor: yo.correo, texto, created_at: new Date().toISOString() };
        const d = this._leer(); d.c.push(nuevo); this._guardar(d);
        return aComentario(nuevo);
      },

      async borrarComentario(id) {
        const d = this._leer();
        d.c = d.c.filter(x => x.id !== id);
        this._guardar(d);
      },

      async darCorazon(sobre, objeto) {
        const yo = await Local.quienSoy();
        if (!yo) throw new Error(SIN_SESION);
        const d = this._leer();
        if (!d.k.some(x => x.sobre === sobre && String(x.objeto) === String(objeto) &&
                           x.autor === yo.correo)) {
          d.k.push({ sobre, objeto, autor: yo.correo,
                     created_at: new Date().toISOString() });
          this._guardar(d);
        }
        return aCorazon({ sobre, objeto, autor: yo.correo });
      },

      async quitarCorazon(sobre, objeto) {
        const yo = await Local.quienSoy();
        if (!yo) return;
        const d = this._leer();
        d.k = d.k.filter(x => !(x.sobre === sobre && String(x.objeto) === String(objeto) &&
                                x.autor === yo.correo));
        this._guardar(d);
      },

      suscribir() {}
    },

    // En demo la contraseña es 'demo' para cualquiera de los dos correos: así
    // se puede probar cómo se ve firmando como uno o como el otro.
    async entrar(email, pass) {
      if (pass !== 'demo') throw new Error('En modo demo la contraseña es: demo');
      sessionStorage.setItem('patico:sesion', String(email || '').toLowerCase());
    },
    async salir()  { sessionStorage.removeItem('patico:sesion'); },
    async sesion() { return Boolean(sessionStorage.getItem('patico:sesion')); },
    async quienSoy() {
      const correo = sessionStorage.getItem('patico:sesion');
      return correo ? { correo, nombre: nombreDe(correo) } : null;
    }
  };

  const impl = usaSupabase ? Remoto : Local;

  window.Datos = {
    modo: usaSupabase ? 'supabase' : 'local',
    iniciar:   ()   => impl.iniciar(),
    listar:    ()   => impl.listar(),
    sembrar:   f    => impl.sembrar(f),
    subirFoto: a    => impl.subirFoto(a),
    darCorazon: id  => impl.darCorazon(id),
    borrar:    id   => impl.borrar(id),
    suscribir: cb   => impl.suscribir(cb),
    entrar:    (e,p)=> impl.entrar(e, p),
    salir:     ()   => impl.salir(),
    sesion:    ()   => impl.sesion(),
    quienSoy:  ()   => impl.quienSoy(),
    nombreDe,
    alConectar:cb   => { alEstado = cb; },
    reducirImagen,
    arte: impl.arte,
    social: impl.social,
    avisos: impl.avisos      // sólo en Supabase: en demo no hay a quién avisar
  };
})();
