/* ==========================================================================
   FUNCIÓN: buscar en YouTube el vídeo de una canción
   --------------------------------------------------------------------------
   Por qué existe: el embed de Spotify sólo da adelantos de 30 s salvo que
   quien escucha tenga sesión Premium abierta en ese mismo navegador. No hay
   manera de esquivarlo desde una web. El reproductor del jardín sigue usando
   la playlist de Spotify para saber QUÉ canciones hay y cómo se llaman, pero
   el sonido lo pone el reproductor incrustado de YouTube, que sí da la
   canción entera sin cuenta ni sesión.

   Esta función traduce "título + artista" al id del vídeo. Dos caminos:

     1. Con YOUTUBE_API_KEY en las variables de entorno, la API oficial.
        Es la buena: resultados estables y con cuota conocida.
     2. Sin clave, se lee la página pública de resultados desde el servidor
        (igual que hace api/playlist.js con Spotify). Funciona, pero depende
        del formato de la página: si YouTube lo cambia, deja de encontrar y
        devuelve 502.

   De los candidatos se elige el que más se acerca a la duración que dice
   Spotify. Sin ese filtro caen remixes, "sped up", vídeos de una hora y
   directos, que es el fallo típico de buscar una canción por su nombre.
   ========================================================================== */

const BUSCAR = 'https://www.youtube.com/results?search_query=';
const API    = 'https://www.googleapis.com/youtube/v3/search';
const DETALLE = 'https://www.googleapis.com/youtube/v3/videos';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/* "3:47" o "1:02:11" -> segundos */
function aSegundos(texto) {
  if (!texto) return 0;
  const p = String(texto).split(':').map(Number);
  if (p.some(isNaN)) return 0;
  return p.reduce((t, v) => t * 60 + v, 0);
}

/* "PT3M47S" -> segundos */
function isoASegundos(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if (!m) return 0;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

/* De todos los candidatos, el que mejor encaja ---------------------------
   Manda la duración: un desvío de más de 20 s casi siempre significa que no
   es la misma grabación. Si no hay ninguna duración a mano, gana el primero,
   que es el orden de relevancia de YouTube. */
function mejor(candidatos, segObjetivo) {
  if (!candidatos.length) return null;
  if (!segObjetivo) return candidatos[0];

  const conNota = candidatos.map((c, i) => {
    const desvio = c.segundos ? Math.abs(c.segundos - segObjetivo) : 999;
    // El orden de relevancia sigue contando, pero poco: 1.5 s por puesto.
    return { c, nota: desvio + i * 1.5 };
  }).sort((a, b) => a.nota - b.nota);

  const ganador = conNota[0];
  return ganador.nota < 120 ? ganador.c : candidatos[0];
}

/* --------------------------------------------- 1. la API oficial -------- */
async function porApi(consulta, segObjetivo, clave) {
  const url = `${API}?part=snippet&type=video&videoEmbeddable=true&maxResults=6` +
              `&q=${encodeURIComponent(consulta)}&key=${clave}`;
  const j = await fetch(url).then(r => {
    if (!r.ok) throw new Error('YouTube API respondió ' + r.status);
    return r.json();
  });

  const ids = (j.items || []).map(i => i.id && i.id.videoId).filter(Boolean);
  if (!ids.length) return null;

  // Segunda llamada sólo para las duraciones: sin ellas no se puede descartar
  // el remix de diez minutos.
  let duraciones = {};
  try {
    const d = await fetch(`${DETALLE}?part=contentDetails&id=${ids.join(',')}&key=${clave}`)
      .then(r => r.ok ? r.json() : null);
    (d && d.items || []).forEach(i => {
      duraciones[i.id] = isoASegundos(i.contentDetails && i.contentDetails.duration);
    });
  } catch { /* sin duraciones se decide por relevancia */ }

  const candidatos = (j.items || []).map(i => ({
    id: i.id.videoId,
    titulo: (i.snippet && i.snippet.title) || '',
    segundos: duraciones[i.id.videoId] || 0
  })).filter(c => c.id);

  return mejor(candidatos, segObjetivo);
}

/* ------------------------------- 2. la página pública de resultados ----- */
async function porPagina(consulta, segObjetivo) {
  const html = await fetch(BUSCAR + encodeURIComponent(consulta), {
    headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' }
  }).then(r => {
    if (!r.ok) throw new Error('YouTube respondió ' + r.status);
    return r.text();
  });

  const candidatos = [];
  const bruto = html.match(/ytInitialData\s*=\s*(\{[\s\S]*?\});<\/script>/);

  if (bruto) {
    let datos = null;
    try { datos = JSON.parse(bruto[1]); } catch { /* se prueba el plan B */ }

    /* El árbol de YouTube cambia de forma a menudo; en vez de seguir una ruta
       fija se recorre entero recogiendo cada videoRenderer que aparezca. */
    if (datos) (function recorrer(nodo) {
      if (!nodo || typeof nodo !== 'object' || candidatos.length > 20) return;
      if (Array.isArray(nodo)) { nodo.forEach(recorrer); return; }

      const v = nodo.videoRenderer;
      if (v && v.videoId) {
        candidatos.push({
          id: v.videoId,
          titulo: (v.title && v.title.runs && v.title.runs[0] && v.title.runs[0].text) || '',
          segundos: aSegundos(v.lengthText && v.lengthText.simpleText)
        });
      }
      Object.keys(nodo).forEach(k => recorrer(nodo[k]));
    })(datos);
  }

  /* Plan B: si el árbol cambió de forma y no salió ningún videoRenderer, se
     rascan los ids a pelo. Sin duración no se puede filtrar el remix de diez
     minutos, pero es mejor que no sonar nada. */
  if (!candidatos.length) {
    const vistos = new Set();
    const re = /"videoId":"([\w-]{11})"/g;
    let m;
    while ((m = re.exec(html)) && vistos.size < 8) {
      if (vistos.has(m[1])) continue;
      vistos.add(m[1]);
      candidatos.push({ id: m[1], titulo: '', segundos: 0 });
    }
  }
  if (!candidatos.length) throw new Error('No encontré resultados en la página');

  // Los directos no traen duración y suelen ser lo que menos interesa.
  const util = candidatos.filter(c => c.segundos > 30);
  return mejor(util.length ? util : candidatos, segObjetivo);
}

async function buscar(consulta, segObjetivo) {
  const clave = process.env.YOUTUBE_API_KEY;
  if (clave) {
    try {
      const r = await porApi(consulta, segObjetivo, clave);
      if (r) return r;
    } catch (err) {
      // Cuota agotada o clave mal puesta: se sigue por la página pública.
      console.info('YouTube API falló, voy por la página:', err.message);
    }
  }
  return porPagina(consulta, segObjetivo);
}

module.exports = async (req, res) => {
  const params = (req.query && Object.keys(req.query).length)
    ? req.query
    : Object.fromEntries(new URL(req.url, 'http://x').searchParams);

  const consulta = String(params.q || '').slice(0, 200).trim();
  const segObjetivo = Math.round(Number(params.d || 0) / 1000) || 0;

  if (!consulta) {
    res.status(400).json({ error: 'Falta la búsqueda' });
    return;
  }

  try {
    const v = await buscar(consulta, segObjetivo);
    if (!v) {
      res.status(404).json({ error: 'No encontré esa canción' });
      return;
    }
    // Un día de caché: el vídeo de una canción no cambia. Así una visita no
    // vuelve a buscar lo mismo y la cuota de la API dura.
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.status(200).json({ id: v.id, titulo: v.titulo, segundos: v.segundos });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};

module.exports.buscar = buscar;

// Para probarla sin desplegar:  node api/youtube.js "yoko alvaro diaz" 200000
if (require.main === module) {
  buscar(process.argv[2] || '', Math.round(Number(process.argv[3] || 0) / 1000))
    .then(v => console.log(v || 'sin resultados'))
    .catch(e => console.log('ERROR', e.message));
}
