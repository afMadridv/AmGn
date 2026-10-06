/* ==========================================================================
   FUNCIÓN: avisos al teléfono (Web Push)
   --------------------------------------------------------------------------
   Cuando uno de los dos planta una flor, comenta, da corazón o cuelga algo en
   la galería, la app llama aquí y esto le manda un aviso al teléfono del
   otro, como el de cualquier app instalada.

     GET  /api/avisar  -> { clave }   la clave pública con la que el teléfono
                                      se suscribe a los avisos
     POST /api/avisar  -> manda el aviso. Cuerpo, uno de:
                            { tipo: 'flor',       id }
                            { tipo: 'comentario', id }
                            { tipo: 'corazon',    sobre, objeto }
                            { tipo: 'obra',       id }

   El texto del aviso NO lo manda el navegador: aquí sólo llega qué pasó y
   dónde. La función entra a la base con la sesión de quien llama, comprueba
   que eso existe, que es reciente y que lo hizo él, y redacta el aviso con
   lo que hay en la base. Así nadie puede usar esto para mandar al otro
   teléfono lo que se le antoje.

   Va sin librerías, igual que api/playlist.js: la firma VAPID (RFC 8292) y
   el cifrado del mensaje (RFC 8291) son unas pocas líneas con `crypto`.
   `node api/avisar.js --prueba` lo comprueba contra el ejemplo del RFC.

   NECESITA, en Vercel → Settings → Environment Variables:
     VAPID_PRIVATE_KEY   la clave privada de los avisos. Se genera con
                         `node api/avisar.js --claves`. La pública se saca de
                         ella, así que no hay dos cosas que mantener a juego.
   Sin esa variable, la función contesta 503 y la app esconde la campana.
   ========================================================================== */

const crypto = require('crypto');

// Lo mismo que js/config.js: la URL y la clave publicable son públicas por
// diseño. Lo que protege los datos es el RLS (sql/instalar.sql).
const SUPABASE_URL  = 'https://eqrqivulqqlsahrklpjk.supabase.co';
const SUPABASE_ANON = 'sb_publishable_jXWtaStTYjSy7dqM7Aifrg_8bkpQPLq';

// Quién manda los avisos, para el servicio de push de Apple o de Google.
const SITIO = 'https://jardin-lemon.vercel.app';

// Igual que CONFIG.NOMBRES en js/config.js. Si cambias uno, cambia el otro.
const NOMBRES = {
  'pato@gmail.com':   'Pato',
  'patico@gmail.com': 'Patico'
};

// Las especies de js/flores-svg.js, con su artículo, para "Pato plantó un lirio".
const ESPECIES = {
  rosa: 'una rosa', tulipan: 'un tulipán', clavel: 'un clavel',
  peonia: 'una peonía', girasol: 'un girasol', orquidea: 'una orquídea',
  lirio: 'un lirio', alstroemeria: 'una alstroemeria', margarita: 'una margarita',
  jacinto: 'un jacinto', amarilis: 'una amarilis', camelia: 'una camelia',
  gardenia: 'una gardenia', ranunculo: 'un ranúnculo', gladiolo: 'un gladiolo'
};

// Un aviso sólo sale de algo hecho hace menos de esto. Si alguien repite la
// misma llamada más tarde, no pasa nada.
const RECIENTE_MS = 10 * 60 * 1000;

/* ------------------------------------------------------------ utilidades */
const b64u   = b => Buffer.from(b).toString('base64url');
const deB64u = s => Buffer.from(String(s), 'base64url');
const hmac   = (llave, datos) => crypto.createHmac('sha256', llave).update(datos).digest();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nombreDe(correo) {
  const c = String(correo || '').toLowerCase();
  if (NOMBRES[c]) return NOMBRES[c];
  const apodo = c.split('@')[0] || 'Alguien';
  return apodo.charAt(0).toUpperCase() + apodo.slice(1);
}

// Una línea, sin saltos, cortada con puntos suspensivos.
function corto(texto, max) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

/* ----------------------------------------------------------------- VAPID --
   La clave privada son los 32 bytes de un número de la curva P-256. De ella
   sale la pública (65 bytes, sin comprimir), que es la que el teléfono usa
   como applicationServerKey al suscribirse.                                */
function clavesVapid(privada) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(deB64u(privada));
  const pub = ecdh.getPublicKey();
  const llave = crypto.createPrivateKey({
    format: 'jwk',
    key: { kty: 'EC', crv: 'P-256', d: b64u(deB64u(privada)),
           x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }
  });
  return { publica: b64u(pub), llave };
}

// Un JWT ES256 por servicio de push. Una hora de validez: Apple rechaza los
// que caducan demasiado lejos.
function cabeceraVapid(endpoint, claves) {
  const cab    = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const cuerpo = b64u(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: SITIO
  }));
  const firma = crypto.sign('sha256', Buffer.from(cab + '.' + cuerpo),
                            { key: claves.llave, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${cab}.${cuerpo}.${b64u(firma)}, k=${claves.publica}`;
}

/* ---------------------------------------------------- cifrado (RFC 8291) --
   El servicio de push (Apple, Google, Mozilla) no puede leer el mensaje:
   va cifrado con las claves que el propio teléfono dio al suscribirse.
   `prueba` sólo sirve para fijar la sal y la clave efímera y comparar con
   el ejemplo del RFC; en uso normal salen al azar.                        */
function cifrar(texto, p256dh, auth, prueba = {}) {
  const uaPub   = deB64u(p256dh);
  const secreto = deB64u(auth);

  const ecdh = crypto.createECDH('prime256v1');
  if (prueba.privada) ecdh.setPrivateKey(deB64u(prueba.privada));
  else ecdh.generateKeys();
  const asPub = ecdh.getPublicKey();
  const compartido = ecdh.computeSecret(uaPub);

  const prkKey = hmac(secreto, compartido);
  const ikm = hmac(prkKey, Buffer.concat([
    Buffer.from('WebPush: info\0'), uaPub, asPub, Buffer.from([1])
  ]));

  const sal   = prueba.sal ? deB64u(prueba.sal) : crypto.randomBytes(16);
  const prk   = hmac(sal, ikm);
  const cek   = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);

  // Un solo registro: el texto y el delimitador 0x02 que marca el último.
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const cifrado = Buffer.concat([
    c.update(Buffer.concat([Buffer.from(texto), Buffer.from([2])])),
    c.final(), c.getAuthTag()
  ]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([sal, rs, Buffer.from([asPub.length]), asPub, cifrado]);
}

async function empujar(sus, mensaje, claves) {
  const r = await fetch(sus.endpoint, {
    method: 'POST',
    headers: {
      Authorization: cabeceraVapid(sus.endpoint, claves),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',          // si el teléfono está apagado, un día de espera
      Urgency: 'high'        // que llegue aunque el teléfono esté dormido
    },
    body: cifrar(JSON.stringify(mensaje), sus.p256dh, sus.auth)
  });
  return r.status;
}

/* -------------------------------------------------------------- Supabase --
   Todo con la sesión de quien llama: lo que no pueda ver él, no lo ve esto. */
async function supa(ruta, token, opciones = {}) {
  const r = await fetch(SUPABASE_URL + ruta, {
    ...opciones,
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token,
               'Content-Type': 'application/json', ...(opciones.headers || {}) }
  });
  if (!r.ok) throw new Error('Supabase respondió ' + r.status);
  return r.status === 204 ? null : r.json();
}

async function una(ruta, token) {
  const filas = await supa(ruta, token);
  if (!filas || !filas.length) throw new Error('No encontré eso');
  return filas[0];
}

const reciente = fecha => Date.now() - new Date(fecha).getTime() < RECIENTE_MS;

// De qué se habla: una nota (con sus primeras palabras) o un dibujo (con su
// título).
async function deQue(sobre, objeto, token) {
  if (!UUID.test(objeto)) throw new Error('Id raro');
  if (sobre === 'nota') {
    const f = await una(`/rest/v1/flores?id=eq.${objeto}&select=texto`, token);
    return { nota: true, cita: `«${corto(f.texto, 70)}»` };
  }
  if (sobre === 'obra') {
    const o = await una(`/rest/v1/obras?id=eq.${objeto}&select=titulo`, token);
    return { nota: false, cita: `«${corto(o.titulo, 60)}»` };
  }
  throw new Error('No sé qué es eso');
}

/* El aviso, ya redactado. `etiqueta` hace que un aviso repetido sustituya
   al anterior en el teléfono en vez de amontonarse.                       */
async function redactar(ev, correo, token) {
  const n = nombreDe(correo);

  if (ev.tipo === 'flor') {
    if (!UUID.test(ev.id)) throw new Error('Id raro');
    const f = await una(`/rest/v1/flores?id=eq.${ev.id}&select=especie,created_at`, token);
    if (!reciente(f.created_at)) return null;
    return {
      titulo: `${n} plantó ${ESPECIES[f.especie] || 'una flor'}`,
      cuerpo: 'Hay una nota nueva esperándote en el jardín.',
      etiqueta: 'flor-' + ev.id
    };
  }

  if (ev.tipo === 'comentario') {
    if (!UUID.test(ev.id)) throw new Error('Id raro');
    const c = await una(`/rest/v1/comentarios?id=eq.${ev.id}&select=*`, token);
    if (c.autor !== correo || !reciente(c.created_at)) return null;
    const q = await deQue(c.sobre, c.objeto, token);
    return {
      titulo: q.nota ? `${n} comentó una nota` : `${n} comentó ${q.cita}`,
      cuerpo: corto(c.texto, 180),
      etiqueta: 'comentario-' + ev.id
    };
  }

  if (ev.tipo === 'corazon') {
    if (!UUID.test(ev.objeto)) throw new Error('Id raro');
    const k = await una(`/rest/v1/corazones?sobre=eq.${encodeURIComponent(ev.sobre)}` +
                        `&objeto=eq.${ev.objeto}&autor=eq.${encodeURIComponent(correo)}` +
                        '&select=created_at', token);
    if (!reciente(k.created_at)) return null;
    const q = await deQue(ev.sobre, ev.objeto, token);
    return q.nota
      ? { titulo: `${n} le dio ♥ a una nota`, cuerpo: q.cita,
          etiqueta: `corazon-${ev.sobre}-${ev.objeto}` }
      : { titulo: `${n} le dio ♥ a ${q.cita}`, cuerpo: 'En la galería',
          etiqueta: `corazon-${ev.sobre}-${ev.objeto}` };
  }

  if (ev.tipo === 'obra') {
    if (!UUID.test(ev.id)) throw new Error('Id raro');
    const o = await una(`/rest/v1/obras?id=eq.${ev.id}&select=titulo,descripcion,created_at`, token);
    if (!reciente(o.created_at)) return null;
    const desc = corto(o.descripcion, 110);
    return {
      titulo: `${n} colgó algo nuevo en la galería`,
      cuerpo: `«${corto(o.titulo, 60)}»` + (desc ? ` · ${desc}` : ''),
      etiqueta: 'obra-' + ev.id
    };
  }

  throw new Error('No sé avisar de eso');
}

/* -------------------------------------------------------------- la función */
module.exports = async (req, res) => {
  const privada = (process.env.VAPID_PRIVATE_KEY || '').trim();
  if (!privada) {
    res.status(503).json({ error: 'Faltan las claves de los avisos (VAPID_PRIVATE_KEY)' });
    return;
  }
  const claves = clavesVapid(privada);

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).json({ clave: claves.publica });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Sólo GET o POST' });
    return;
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'Falta la sesión' }); return; }

  let correo;
  try {
    const yo = await supa('/auth/v1/user', token);
    correo = String(yo.email || '').toLowerCase();
  } catch {
    res.status(401).json({ error: 'Sesión no válida' });
    return;
  }

  let evento = req.body || {};
  if (typeof evento === 'string') {
    try { evento = JSON.parse(evento); } catch { evento = {}; }
  }

  let aviso;
  try {
    aviso = await redactar(evento, correo, token);
  } catch (err) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (!aviso) { res.status(200).json({ enviados: 0, motivo: 'viejo o ajeno' }); return; }

  // Los teléfonos del otro. El RLS sólo deja leerlos a la casa.
  const destinos = await supa(
    `/rest/v1/avisos?autor=neq.${encodeURIComponent(correo)}&select=endpoint,p256dh,auth`,
    token).catch(() => []);

  const mensaje = { ...aviso, url: '/' };
  const estados = await Promise.all(
    destinos.map(s => empujar(s, mensaje, claves).catch(() => 0)));

  // 404 y 410: ese teléfono quitó la app o apagó los avisos. Se olvida.
  await Promise.all(destinos
    .filter((s, i) => estados[i] === 404 || estados[i] === 410)
    .map(s => supa(`/rest/v1/avisos?endpoint=eq.${encodeURIComponent(s.endpoint)}`,
                   token, { method: 'DELETE' }).catch(() => {})));

  res.status(200).json({
    enviados: estados.filter(e => e >= 200 && e < 300).length,
    destinos: destinos.length
  });
};

/* ------------------------------------------------- desde la línea de órdenes
   node api/avisar.js --claves   genera un par de claves VAPID nuevo
   node api/avisar.js --prueba   compara el cifrado con el RFC 8291          */
module.exports.cifrar = cifrar;
module.exports.clavesVapid = clavesVapid;
module.exports.cabeceraVapid = cabeceraVapid;

if (require.main === module) {
  if (process.argv.includes('--claves')) {
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.generateKeys();
    console.log('VAPID_PRIVATE_KEY=' + b64u(ecdh.getPrivateKey()));
    console.log('(pública: ' + b64u(ecdh.getPublicKey()) + ')');
  } else if (process.argv.includes('--prueba')) {
    // RFC 8291, apéndice A: la cabecera (86 bytes) y el texto cifrado vienen
    // por separado; se juntan en bytes, no en base64.
    const esperado = b64u(Buffer.concat([
      deB64u('DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml' +
             'mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'),
      deB64u('8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEs' +
             'bI_0LpXMuGvnzQ')
    ]));
    const hecho = b64u(cifrar(
      'When I grow up, I want to be a watermelon',
      'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
      'BTBZMqHH6r4Tts7J_aSIgg',
      { privada: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', sal: 'DGv6ra1nlYgDCS1FRnbzlw' }));
    console.log(hecho === esperado ? 'OK: el cifrado coincide con el RFC 8291'
                                   : 'MAL:\n' + hecho + '\n' + esperado);
  }
}
