/* ==========================================================================
   AVISOS — la campana del jardín
   --------------------------------------------------------------------------
   Enciende y apaga los avisos de este teléfono. Encendidos, cuando el otro
   planta, comenta, da corazón o cuelga algo, llega un aviso como el de
   cualquier app (lo manda api/avisar.js y lo enseña sw.js).

   En el iPhone sólo funciona con el jardín abierto desde la pantalla de
   inicio: en una pestaña de Safari, iOS no deja pedir permiso. Ahí la
   campana se queda, pero al tocarla explica cómo instalarlo.

   Safari exige que el permiso se pida en el mismo toque, sin esperas de red
   por delante. Por eso la clave pública se trae al cargar, no al tocar.
   ========================================================================== */
(function () {
  'use strict';

  const boton = document.getElementById('btnAvisos');
  const aviso = t => window.Jardin && Jardin.aviso(t);

  const hayPush = 'serviceWorker' in navigator && 'PushManager' in window &&
                  'Notification' in window;
  const esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalada = navigator.standalone === true ||
                    matchMedia('(display-mode: standalone)').matches;

  let registro = null;
  let clave = null;

  /* ---------------------------------------------------- el service worker */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(r => { registro = r; limpiar(); pintar(); })
      .catch(() => {});
  }

  // Abrir la app es haber visto lo que había: fuera el globo rojo del ícono
  // y los avisos que quedaban en el centro de notificaciones.
  function limpiar() {
    if (document.hidden) return;
    if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
    if (registro && registro.getNotifications) {
      registro.getNotifications().then(ns => ns.forEach(n => n.close())).catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', limpiar);

  /* ---------------------------------------------------------- la campana */
  // En modo demo no hay a quién avisar. Y si no hay push ni es un iPhone al
  // que se le pueda explicar cómo conseguirlo, la campana no aporta nada.
  if (!boton || Datos.modo !== 'supabase' || !Datos.avisos) return;
  if (!hayPush && !(esIOS && !instalada)) return;
  boton.hidden = false;

  if (hayPush) {
    fetch('/api/avisar')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        clave = d && d.clave;
        // Sin claves en el servidor no hay avisos: mejor no ofrecerlos.
        if (!clave) boton.hidden = true;
      })
      .catch(() => {});
  }

  const encendida = () => boton.dataset.activo === 'si';

  async function pintar() {
    if (!boton) return;
    let activo = false;
    if (hayPush && registro && Notification.permission === 'granted') {
      activo = Boolean(await registro.pushManager.getSubscription().catch(() => null));
    }
    boton.dataset.activo = activo ? 'si' : 'no';
    boton.setAttribute('aria-pressed', String(activo));
    boton.setAttribute('aria-label', activo ? 'Apagar los avisos' : 'Encender los avisos');
  }

  // La clave viene en base64url y pushManager la quiere en bytes.
  function aBytes(b64) {
    const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') +
                   '='.repeat((4 - b64.length % 4) % 4));
    return Uint8Array.from(s, c => c.charCodeAt(0));
  }

  async function encender() {
    // Lo primero, antes de cualquier await: es lo que Safari mira.
    const permiso = Notification.permission === 'granted'
      ? 'granted' : await Notification.requestPermission();

    if (permiso !== 'granted') {
      aviso(permiso === 'denied'
        ? 'Los avisos están bloqueados: actívalos en Ajustes › Notificaciones'
        : 'Sin permiso no puedo avisarte');
      return;
    }
    if (!await Datos.sesion()) { aviso('Entra al jardín para encender los avisos'); return; }
    if (!clave) throw new Error('el servidor no tiene las claves de los avisos');

    const reg = registro || await navigator.serviceWorker.ready;
    const sus = await reg.pushManager.getSubscription() ||
                await reg.pushManager.subscribe({
                  userVisibleOnly: true, applicationServerKey: aBytes(clave)
                });
    await Datos.avisos.guardar(sus);
    aviso('Listo: te aviso cuando pase algo en el jardín');
  }

  async function apagar() {
    const sus = registro && await registro.pushManager.getSubscription();
    if (sus) {
      await Datos.avisos.quitar(sus.endpoint).catch(() => {});
      await sus.unsubscribe();
    }
    aviso('Avisos apagados');
  }

  boton.addEventListener('click', async () => {
    if (!hayPush) {
      Jardin.aviso('Para recibir avisos, abre el jardín desde tu pantalla de inicio: ' +
                   'en Safari, Compartir › Añadir a pantalla de inicio', 6000);
      return;
    }
    boton.disabled = true;
    try {
      if (encendida()) await apagar(); else await encender();
    } catch (err) {
      aviso('No pude con los avisos: ' + (err && err.message ? err.message : err));
    } finally {
      boton.disabled = false;
      pintar();
    }
  });
})();
