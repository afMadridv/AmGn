/* ==========================================================================
   SERVICE WORKER — los avisos
   --------------------------------------------------------------------------
   Vive en la raíz para que su alcance sea todo el sitio. Sólo hace dos cosas:
   enseñar el aviso cuando llega un push (api/avisar.js) y abrir el jardín al
   tocarlo. No guarda nada en caché a propósito: el jardín cambia a menudo y
   una copia vieja guardada aquí sería más difícil de quitar que de poner.

   En el iPhone los avisos sólo existen si el jardín se abrió desde la
   pantalla de inicio (Safari → Compartir → Añadir a pantalla de inicio).
   ========================================================================== */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch { d = { cuerpo: e.data ? e.data.text() : '' }; }

  // iOS pide que cada push termine en un aviso visible: si no, deja de
  // entregarlos. Por eso siempre se enseña algo, aunque venga vacío.
  e.waitUntil((async () => {
    await self.registration.showNotification(d.titulo || 'Para Gabriela', {
      body: d.cuerpo || 'Algo pasó en el jardín',
      tag: d.etiqueta,
      // En el iPhone el ícono es siempre el de la app; esto es para Android
      // y el ordenador.
      icon: '/img/icono-192.png',
      badge: '/img/icono-192.png',
      lang: 'es',
      data: { url: d.url || '/' }
    });

    // El globo rojo del ícono: cuántos avisos hay sin abrir.
    if (self.navigator.setAppBadge) {
      const pendientes = await self.registration.getNotifications();
      await self.navigator.setAppBadge(pendientes.length).catch(() => {});
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const destino = new URL((e.notification.data && e.notification.data.url) || '/',
                            self.location.origin).href;
    // Si el jardín ya está abierto, se trae al frente en vez de abrir otro.
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const v of abiertas) {
      if (v.url.startsWith(self.location.origin) && 'focus' in v) return v.focus();
    }
    return self.clients.openWindow(destino);
  })());
});
