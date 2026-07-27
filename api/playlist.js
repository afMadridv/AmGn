/* ==========================================================================
   FUNCIÓN: la lista de canciones de la playlist
   --------------------------------------------------------------------------
   El navegador no puede leer la lista de una playlist de Spotify: la página
   del embed está bloqueada por CORS y la API oficial pide credenciales que no
   pueden vivir en el frontend.

   Desde el servidor no hay CORS. Esta función pide la misma página del embed
   —pública, sin claves ni cuentas— y devuelve sólo lo que necesita el
   reproductor: título, artista y duración de cada canción.

   Gracias a esto el jardín puede tener botones de anterior y siguiente de
   verdad, y enseñar siempre el nombre correcto.

   Si Spotify cambia el formato de su página, esto deja de encontrar la lista
   y devuelve 502; el reproductor lo nota y sigue funcionando como antes.
   ========================================================================== */

const PAGINA = 'https://open.spotify.com/embed/playlist/';

async function leerPlaylist(id) {
  const html = await fetch(PAGINA + id, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JardinDeNotas/1.0)' }
  }).then(r => {
    if (!r.ok) throw new Error('Spotify respondió ' + r.status);
    return r.text();
  });

  const bruto = html.match(/__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!bruto) throw new Error('No encontré la lista en la página');

  const entidad = JSON.parse(bruto[1])?.props?.pageProps?.state?.data?.entity;
  const canciones = (entidad?.trackList || [])
    .filter(t => t.uri && t.isPlayable !== false)
    .map(t => ({
      uri: t.uri,
      titulo: t.title || '',
      artista: t.subtitle || '',
      duracion: t.duration || 0
    }));

  if (!canciones.length) throw new Error('La lista vino vacía');
  return { nombre: entidad?.name || '', canciones };
}

module.exports = async (req, res) => {
  // Sólo se aceptan ids con la forma de un id de Spotify: nada de meter rutas
  // raras en la URL que se pide.
  const crudo = (req.query && req.query.id) ||
                new URL(req.url, 'http://x').searchParams.get('id') || '';
  const id = String(crudo).replace(/[^A-Za-z0-9]/g, '');

  if (!id) {
    res.status(400).json({ error: 'Falta el id de la playlist' });
    return;
  }

  try {
    const datos = await leerPlaylist(id);
    // Cinco minutos: si añades canciones, aparecen enseguida sin castigar a
    // Spotify con una petición por visita.
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).json(datos);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};

// Para poder probarla sin desplegar:  node api/playlist.js <id>
module.exports.leerPlaylist = leerPlaylist;
if (require.main === module) {
  leerPlaylist(process.argv[2])
    .then(d => console.log(JSON.stringify(d).slice(0, 400)))
    .catch(e => console.log('ERROR', e.message));
}
