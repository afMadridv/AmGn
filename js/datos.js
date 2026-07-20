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

  // Con ?demo=1 la app trabaja contra localStorage aunque haya credenciales:
  // sirve para probar cambios sin tocar el jardín de verdad.
  const forzarDemo = new URLSearchParams(location.search).get('demo') === '1';

  const usaSupabase = !forzarDemo && Boolean(
    CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase
  );

  let sb = null;
  let alCambiar = () => {};
  let alEstado  = () => {};

  /* ---------- normalización: la fila de la BD -> objeto de la app -------- */
  function aFlor(fila) {
    return {
      id:     fila.id,
      texto:  fila.texto,
      especie: fila.especie || fila.emoji || 'lirio',
      hue:    Number(fila.hue) || 0,
      foto:   fila.foto || null,
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

    suscribir(cb) {
      alCambiar = cb;
      // Sincroniza entre pestañas del mismo navegador.
      window.addEventListener('storage', e => {
        if (e.key === LLAVE) alCambiar({ tipo: 'resync' });
      });
      alEstado('modo demo');
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
    borrar:    id   => impl.borrar(id),
    suscribir: cb   => impl.suscribir(cb),
    entrar:    (e,p)=> impl.entrar(e, p),
    salir:     ()   => impl.salir(),
    sesion:    ()   => impl.sesion(),
    alConectar:cb   => { alEstado = cb; }
  };
})();
