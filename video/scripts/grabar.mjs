/* Graba los recorridos de la interfaz real en modo demo (?demo=1: datos de
   ejemplo en localStorage, nada de Supabase ni de notas de verdad).

   Sirve el repo en un puerto local, abre Edge headless por CDP, siembra
   flores de ejemplo, ejecuta cada flujo con clics reales y guarda los
   fotogramas del screencast. Luego los une a 30 fps con el ffmpeg de Remotion.

   uso:  node scripts/grabar.mjs [salida]     (por defecto ./public)
         deja public/<carpeta>/auto.mp4 para portada, nota, portal y extras */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(process.env.REPO || path.join(AQUI, '../..'));
const SALIDA = path.resolve(process.argv[2] || path.join(AQUI, '../public'));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PUERTO_WEB = 8123, PUERTO_CDP = 9333;
const espera = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------ servidor estático */
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
                '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const web = http.createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(REPO, ruta === '/' ? 'index.html' : ruta);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PUERTO_WEB);

/* ------------------------------------------------------------------- CDP */
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'grabar-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PUERTO_CDP}`, `--user-data-dir=${perfil}`,
  '--no-first-run', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });

async function conectar() {
  for (let i = 0; i < 50; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`)).json();
      const pag = lista.find(t => t.type === 'page');
      if (pag) return pag.webSocketDebuggerUrl;
    } catch { /* aún arrancando */ }
    await espera(200);
  }
  throw new Error('Edge no arrancó');
}

const ws = new WebSocket(await conectar());
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let n = 0; const pendientes = new Map(); const oyentes = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pendientes.has(m.id)) { const p = pendientes.get(m.id); pendientes.delete(m.id); m.error ? p.mal(new Error(m.error.message)) : p.ok(m.result); }
  else if (m.method) oyentes.forEach(f => f(m));
});
const cdp = (method, params = {}) => new Promise((ok, mal) => { const id = ++n; pendientes.set(id, { ok, mal }); ws.send(JSON.stringify({ id, method, params })); });
const js = async expr => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

await cdp('Page.enable');
await cdp('Runtime.enable');

/* ------------------------------------------------------------ acciones */
async function centro(sel) {
  for (let i = 0; i < 60; i++) {
    const r = await js(`(() => { const e = ${sel}; if (!e) return null; const b = e.getBoundingClientRect();
      return b.width ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null; })()`);
    if (r) return r;
    await espera(150);
  }
  throw new Error('No encuentro ' + sel);
}
async function clic(sel) {
  const { x, y } = await centro(sel);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await espera(70);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function escribir(sel, texto) {
  await js(`${sel}.focus()`);
  for (const ch of texto) { await cdp('Input.insertText', { text: ch }); await espera(45 + Math.random() * 50); }
}
const tecla = key => cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key }).then(() =>
  cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key }));
const q = s => `document.querySelector(${JSON.stringify(s)})`;

/* --------------------------------------------------------- datos demo */
const TEXTOS = [
  ['rosa', 0, 'Gracias por quedarte cuando todo era ruido.'],
  ['girasol', 0, 'Hoy el sol salió y pensé en ti antes que en él.'],
  ['tulipan', 320, 'Tu risa es mi canción favorita.'],
  ['lirio', 0, 'Un lirio porque fue la primera flor que te regalé.'],
  ['peonia', 20, 'Que nunca te falten razones para sonreír.'],
  ['clavel', 280, 'Te guardé esta flor para un martes cualquiera.'],
  ['rosa', 200, 'Contigo hasta los lunes se sienten domingo.'],
  ['girasol', 30, 'Siempre mirando hacia donde estás.'],
  ['tulipan', 0, 'Una nota pequeña para un día grande.'],
  ['lirio', 260, 'Aquí estaré, regando este jardín.']
];
const POS = [[18, 40], [42, 30], [66, 44], [84, 32], [28, 62], [55, 58], [76, 70], [12, 78], [46, 80], [90, 56]];
const semilla = TEXTOS.map(([especie, hue, texto], i) => ({
  id: 'demo' + i, texto, especie, hue, x: POS[i][0], y: POS[i][1],
  fecha: new Date(Date.now() - (i + 1) * 86400000 * 9).toISOString()
}));

async function abrir(vista, hora) {
  await cdp('Emulation.setDeviceMetricsOverride', vista);
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: false });
  const base = `http://localhost:${PUERTO_WEB}/`;
  await cdp('Page.navigate', { url: base + 'sw.js' });
  await espera(400);
  await js(`localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('patico:flores', ${JSON.stringify(JSON.stringify(semilla))});
    localStorage.setItem('patico:recordar', '1'); localStorage.setItem('patico:sesion', 'pato@gmail.com'); true`);
  await cdp('Page.navigate', { url: `${base}?demo=1&hora=${hora}` });
  await espera(2500);
  // La pastilla "modo demo · Pato" delata la demo: fuera del encuadre.
  await js(`document.head.insertAdjacentHTML('beforeend', '<style>#estado{display:none!important}</style>'); true`);
}

/* ------------------------------------------------------------ grabación */
async function grabar(nombre, accion) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuadros-'));
  const cuadros = [];
  const oir = m => {
    if (m.method !== 'Page.screencastFrame') return;
    const f = path.join(dir, String(cuadros.length).padStart(5, '0') + '.jpg');
    fs.writeFileSync(f, Buffer.from(m.params.data, 'base64'));
    cuadros.push({ f, t: m.params.metadata.timestamp });
    cdp('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
  };
  oyentes.push(oir);
  await cdp('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1, maxWidth: 1600, maxHeight: 1700 });
  const t0 = Date.now() / 1000;
  await accion();
  const t1 = Date.now() / 1000;
  await cdp('Page.stopScreencast');
  oyentes.splice(oyentes.indexOf(oir), 1);

  // ffmpeg concat con la duración real de cada cuadro, luego a 30 fps fijos.
  const lista = cuadros.map((c, i) => {
    const sig = i + 1 < cuadros.length ? cuadros[i + 1].t : t1;
    return `file '${c.f.replace(/\\/g, '/')}'\nduration ${Math.max(0.001, sig - c.t).toFixed(4)}`;
  });
  lista.push(`file '${cuadros.at(-1).f.replace(/\\/g, '/')}'`);
  const txt = path.join(dir, 'lista.txt');
  fs.writeFileSync(txt, lista.join('\n'));
  const destino = path.join(SALIDA, nombre);
  fs.mkdirSync(destino, { recursive: true });
  const mp4 = path.join(destino, 'auto.mp4');
  execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', txt,
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-r', '30', '-fps_mode', 'cfr', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', mp4],
    { cwd: path.join(AQUI, '..'), stdio: 'inherit', shell: true });
  console.log(`${nombre}: ${cuadros.length} cuadros, ${(t1 - t0).toFixed(1)} s -> ${mp4}`);
}

const TELEFONO = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };
const PORTATIL = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };
const entrar = async () => { await clic(q('#ramo')); await espera(4500); };
const cerrar = async () => { await tecla('Escape'); await espera(900); };

try {
  // 1. portada: el ramo, el toque y la entrada al jardín
  await abrir(TELEFONO, 10);
  await grabar('portada', async () => {
    await espera(3000); await clic(q('#ramo')); await espera(7000);
  });

  // 2. nota: abrir una flor, corazón, comentario
  await abrir(TELEFONO, 10); await entrar();
  await grabar('nota', async () => {
    await espera(800);
    await clic(`document.querySelector('.flor-plantada[data-id="demo1"]')`); await espera(2600);
    await clic(q('#btnCorazon')); await espera(2400);
    await escribir(q('#socialNota .social-entrada'), 'Me encantó, gracias');
    await espera(500);
    await js(`${q('#socialNota .social-form')}.requestSubmit()`); await espera(2600);
    await cerrar(); await espera(800);
  });

  // 3. portal: sembrar una flor nueva con la sesión ya abierta
  await abrir(PORTATIL, 10); await entrar();
  await grabar('portal', async () => {
    await espera(900);
    await clic(q('#portalSecreto')); await espera(1600);
    await escribir(q('#notaInput'), 'Para ti, que haces florecer todo lo que tocas.');
    await espera(500);
    await clic(`document.querySelectorAll('#selectorFlor .opcion')[4]`); await espera(700);
    await clic(`document.querySelectorAll('#selectorColor .opcion')[2]`); await espera(900);
    await clic(q('#btnSembrar')); await espera(5000);
  });

  // 4. extras de noche: el libro, la música y el patico cazando bichos
  await abrir(PORTATIL, 21); await entrar();
  await grabar('extras', async () => {
    await espera(1500);
    await clic(q('#btnLibro')); await espera(2600); await cerrar();
    await clic(q('#btnMusica')); await espera(2600); await cerrar();
    for (let i = 0; i < 2; i++) { await clic(q('.bicho')); await espera(2600); }
    await espera(1000);
  });
} finally {
  ws.close(); edge.kill(); web.close();
}
