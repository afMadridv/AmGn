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
   ========================================================================== */
(function () {
  'use strict';

  const CFG   = window.CONFIG;
  const TABLA = 'flores';
  const LLAVE = 'patico:flores';
  const OBRAS = 'obras';
  const LLAVE_OBRAS = 'patico:obras';

  // Con ?demo=1 la app trabaja contra localStorage aunque haya credenciales:
  // sirve para probar cambios sin tocar el jardín de verdad.
  const forzarDemo = new URLSearchParams(location.search).get('demo') === '1';

  const usaSupabase = !forzarDemo && Boolean(
    CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase
  );

  let sb = null;
  let alCambiar = () => {};
  let alEstado  = () => {};

  /* ------------------------------------------------------ reducir fotos --
     Las fotos del móvil pesan varios megas. Se reescalan y recomprimen en el
     propio teléfono antes de subirlas: sube rápido y se abren sin gastar
     datos. Lo usan tanto las notas como la galería.                        */
  function reducirImagen(archivo, maxLado = 1600, calidad = 0.82) {
    return new Promise((ok, mal) => {
      const url = URL.createObjectURL(archivo);
      const im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(url);
        const escala = Math.min(1, maxLado / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width  = Math.round(im.width  * escala);
        c.height = Math.round(im.height * escala);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(b => b ? ok(b) : mal(new Error('No pude procesar la imagen')),
                 'image/jpeg', calidad);
      };
      im.onerror = () => { URL.revokeObjectURL(url); mal(new Error('Esa imagen no se puede leer')); };
      im.src = url;
    });
  }

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
      return aFlor(data);
    },

    // Sube la imagen ya reducida y devuelve su URL pública.
    async subirFoto(archivo) {
      const ext = (archivo.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const nombre = Date.now().toString(36) + '-' +
                     Math.random().toString(36).slice(2, 8) + '.' + ext;

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

    async borrar(id) {
      const { error } = await sb.from(TABLA).delete().eq('id', id);
      if (error) throw error;
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

    /* ------------------------------------------------------- la galería --
       Colgar no pide cuenta: el enlace es de ella. Quitar, comentar y marcar
       favoritos sí, y de eso se encarga el RLS.                            */
    arte: {
      async listar() {
        const { data, error } = await sb
          .from(OBRAS).select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },

      async publicar({ titulo, descripcion, imagen, marco }) {
        const nombre = Date.now().toString(36) + '-' +
                       Math.random().toString(36).slice(2, 8) + '.jpg';

        const { error: errSubida } = await sb.storage
          .from('galeria').upload(nombre, imagen, { contentType: 'image/jpeg' });
        if (errSubida) {
          if (/bucket/i.test(errSubida.message)) {
            throw new Error('Falta crear la galería: corre sql/instalar.sql');
          }
          throw errSubida;
        }

        const { data: pub } = sb.storage.from('galeria').getPublicUrl(nombre);
        const { data, error } = await sb.from(OBRAS)
          .insert({ titulo, descripcion, marco, imagen: pub.publicUrl })
          .select().single();
        if (error) throw error;
        return data;
      },

      async borrar(id) {
        const { error } = await sb.from(OBRAS).delete().eq('id', id);
        if (error) throw error;
      },

      async comentar(id, texto) {
        const { error } = await sb.from(OBRAS)
          .update({ comentario: texto || null }).eq('id', id);
        if (error) throw error;
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

      async publicar({ titulo, descripcion, imagen, marco }) {
        const url = await new Promise((ok, mal) => {
          const fr = new FileReader();
          fr.onload = () => ok(fr.result);
          fr.onerror = () => mal(new Error('No pude leer la imagen'));
          fr.readAsDataURL(imagen);
        });
        const obra = {
          id: 'o_' + Date.now().toString(36),
          titulo, descripcion, marco, imagen: url,
          comentario: null, corazon: false,
          created_at: new Date().toISOString()
        };
        const todas = this._leer(); todas.unshift(obra); this._guardar(todas);
        return obra;
      },

      async borrar(id) { this._guardar(this._leer().filter(o => o.id !== id)); },

      async comentar(id, texto) {
        const t = this._leer();
        const o = t.find(x => x.id === id);
        if (o) { o.comentario = texto || null; this._guardar(t); }
      },

      async darCorazon(id) {
        const t = this._leer();
        const o = t.find(x => x.id === id);
        if (o) { o.corazon = true; this._guardar(t); }
      },

      suscribir() {}
    },

    async entrar(_email, pass) {
      if (pass !== 'demo') throw new Error('En modo demo la contraseña es: demo');
      sessionStorage.setItem('patico:sesion', '1');
    },
    async salir()  { sessionStorage.removeItem('patico:sesion'); },
    async sesion() { return sessionStorage.getItem('patico:sesion') === '1'; }
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
    alConectar:cb   => { alEstado = cb; },
    reducirImagen,
    arte: impl.arte
  };
})();
