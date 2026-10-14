/* ==========================================================================
   LÍMITE DE PETICIONES por IP — lo comparten las funciones de api/
   --------------------------------------------------------------------------
   Vercel no publica como ruta lo que empieza por `_`: esto no es un
   endpoint, es una pieza que las funciones importan.

   Ventana fija por minuto, en memoria. Cada instancia de la función lleva su
   propia cuenta, así que es un freno de buena fe (contra un bucle o un script
   que machaca un endpoint), no una muralla: para eso está el Firewall de
   Vercel. Los números van muy por encima del uso normal de dos personas.
   ========================================================================== */

const cuentas = new Map();   // "nombre|ip" -> { desde, n }

function ipDe(req) {
  const h = req.headers || {};
  return String(h['x-real-ip'] || h['x-forwarded-for'] || '')
    .split(',')[0].trim() || 'desconocida';
}

/* Devuelve true si la petición puede seguir. Si no, contesta 429 y avisa
   cuándo volver a intentarlo. */
function dejar(req, res, nombre, porMinuto) {
  const ahora = Date.now();
  const llave = nombre + '|' + ipDe(req);
  let c = cuentas.get(llave);
  if (!c || ahora - c.desde >= 60000) {
    c = { desde: ahora, n: 0 };
    cuentas.set(llave, c);
  }
  c.n++;

  // Limpieza de vez en cuando, para que el mapa no crezca sin fin.
  if (cuentas.size > 2000) {
    for (const [k, v] of cuentas) if (ahora - v.desde >= 60000) cuentas.delete(k);
  }

  if (c.n <= porMinuto) return true;
  res.setHeader('Retry-After', String(Math.ceil((c.desde + 60000 - ahora) / 1000)));
  res.status(429).json({ error: 'Demasiadas peticiones; espera un momento' });
  return false;
}

module.exports = { dejar };
