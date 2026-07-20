/* ==========================================================================
   FLORES DIBUJADAS
   --------------------------------------------------------------------------
   Ilustración digital: cada especie tiene su propia estructura (capas de
   pétalos, espiga, orquídea…), su forma de pétalo y su paleta. Nada de iconos
   genéricos: una rosa se construye por capas concéntricas, un clavel tiene el
   borde dentado, un jacinto es una espiga de florecillas.

     FloresSVG.img(clave, tam, mini, hue) -> <img> con la flor (cacheada)
     FloresSVG.flor(...)                  -> el mismo SVG en línea
     FloresSVG.ramo()                     -> ramo de lirios de la portada
     FloresSVG.ESPECIES                   -> catálogo para el selector
   ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------------------- */
  /*  Formas de pétalo. Nacen en (0,0) y apuntan hacia arriba (-y).         */
  /* --------------------------------------------------------------------- */
  const FORMA = {
    // Lirio y alstroemeria: lanceolado estrecho, punta recurvada.
    lanza: {
      d: 'M0,3 C 8,-8 14,-24 14,-40 C 14,-52 8,-62 0,-65 C -8,-62 -14,-52 -14,-40 C -14,-24 -8,-8 0,3 Z',
      largo: 62, rizo: 'M0,-65 C 7,-61 11,-54 11,-46 C 8,-54 5,-60 0,-62 Z'
    },
    // Pétalo suelto del tulipán, visto de lado (base abajo, punta arriba).
    tulipan: {
      d: 'M0,46 C -20,30 -23,-8 -12,-38 C -7,-50 7,-50 12,-38 C 23,-8 20,30 0,46 Z',
      largo: 46
    },
    // Amarilis: trompeta larga y abierta.
    trompeta: {
      d: 'M0,3 C 12,-6 21,-24 17,-45 C 15,-53 6,-56 0,-51 C -6,-56 -15,-53 -17,-45 C -21,-24 -12,-6 0,3 Z',
      largo: 53
    },
    // Margarita, girasol: fino y redondeado.
    lengua: {
      d: 'M0,2 C 7,-8 9,-28 5,-45 C 3,-51 -3,-51 -5,-45 C -9,-28 -7,-8 0,2 Z',
      largo: 45, simple: true
    },
    // Rosa, camelia, ranúnculo: pétalo corto y redondo, para apilar en capas.
    redondo: {
      d: 'M0,2 C 14,-1 20,-12 18,-24 C 16,-32 7,-36 0,-31 C -7,-36 -16,-32 -18,-24 C -20,-12 -14,-1 0,2 Z',
      largo: 34
    },
    // Peonía y gardenia: ancho con la punta partida.
    ancho: {
      d: 'M0,3 C 17,-2 25,-16 23,-29 C 21,-38 13,-41 7,-36 C 4,-33 -4,-33 -7,-36 C -13,-41 -21,-38 -23,-29 C -25,-16 -17,-2 0,3 Z',
      largo: 40
    },
    // Clavel: borde superior dentado, que es lo que lo identifica.
    dentado: {
      d: 'M0,3 C 15,-2 21,-13 20,-24 L17,-31 L14,-24 L11,-32 L7,-25 L4,-33 L0,-26 L-4,-33 L-7,-25 L-11,-32 L-14,-24 L-17,-31 L-20,-24 C -21,-13 -15,-2 0,3 Z',
      largo: 33
    },
    // Gladiolo: pétalo grande con volante ondulado.
    volante: {
      d: 'M0,3 C 16,-2 25,-13 24,-26 C 23,-34 16,-38 12,-33 C 9,-30 5,-36 0,-36 C -5,-36 -9,-30 -12,-33 C -16,-38 -23,-34 -24,-26 C -25,-13 -16,-2 0,3 Z',
      largo: 38
    },
    // Jacinto: florecilla estrellada de la espiga.
    estrellita: {
      d: 'M0,1 C 6,-2 9,-8 8,-14 C 7,-19 3,-21 0,-18 C -3,-21 -7,-19 -8,-14 C -9,-8 -6,-2 0,1 Z',
      largo: 20, simple: true
    },
    // Orquídea: sépalo estrecho.
    sepalo: {
      d: 'M0,2 C 7,-6 11,-22 8,-38 C 6,-45 -6,-45 -8,-38 C -11,-22 -7,-6 0,2 Z',
      largo: 44
    }
  };

  /* --------------------------------------------------------------------- */
  /*  Catálogo. `capas` da la profundidad: cada anillo va más pequeño y     */
  /*  girado, que es lo que separa una rosa de una margarita.              */
  /* --------------------------------------------------------------------- */
  const ESPECIES = [
    { clave:'rosa', nombre:'Rosa', forma:'redondo', n:7, largoBase:34,
      capas:[{e:1.35,g:0},{e:1.02,g:26},{e:.72,g:52},{e:.45,g:78}],
      c1:'#ffe3ea', c2:'#e0577b', borde:'#a32a4d', centro:'espiral' },

    { clave:'tulipan', nombre:'Tulipán', tipo:'tulipan', largoBase:46,
      c1:'#ffe9b8', c2:'#e5701a', borde:'#9c440a' },

    { clave:'clavel', nombre:'Clavel', forma:'dentado', n:9, largoBase:33,
      capas:[{e:1.35,g:0},{e:1.08,g:20},{e:.78,g:40},{e:.48,g:60}],
      c1:'#ffe6f0', c2:'#e05287', borde:'#a32a5c', centro:'boton', botonColor:'#f7c9dd' },

    { clave:'peonia', nombre:'Peonía', forma:'ancho', n:8, largoBase:40,
      capas:[{e:1.3,g:0},{e:1.06,g:22},{e:.8,g:44},{e:.55,g:66},{e:.3,g:88}],
      c1:'#fff0f4', c2:'#ef8aad', borde:'#b8557d', centro:'boton', botonColor:'#f9dfa8' },

    { clave:'girasol', nombre:'Girasol', forma:'lengua', n:13, largoBase:45,
      capas:[{e:1,g:0},{e:.78,g:14}],
      c1:'#ffe071', c2:'#e79310', borde:'#9c5a05', centro:'disco', discoColor:'#79441c' },

    { clave:'orquidea', nombre:'Orquídea', tipo:'orquidea', largoBase:44,
      c1:'#fdf0ff', c2:'#c07ad8', borde:'#7f3f9b', labelo:'#8e3fae', garganta:'#f6c945' },

    { clave:'lirio', nombre:'Lirio', forma:'lanza', n:6, largoBase:58,
      capas:[{e:1,g:0}],
      c1:'#fff4f7', c2:'#ee8fb7', borde:'#ad2159', centro:'estambres', antera:'#df3f1e' },

    { clave:'alstroemeria', nombre:'Alstroemeria', forma:'lanza', n:6, largoBase:58,
      capas:[{e:.86,g:0}], rayas:true,
      c1:'#fff6e6', c2:'#f0a24c', borde:'#a95f13', centro:'estambres', antera:'#7a4c1c' },

    { clave:'margarita', nombre:'Margarita', forma:'lengua', n:14, largoBase:45,
      capas:[{e:1,g:0}],
      c1:'#ffffff', c2:'#efeadb', borde:'#b0a488', centro:'disco', discoColor:'#f0bb2e' },

    { clave:'jacinto', nombre:'Jacinto', tipo:'espiga', forma:'estrellita', n:6, largoBase:20,
      c1:'#efe6ff', c2:'#8f6fd0', borde:'#5d3fa0', floretes:9 },

    { clave:'amarilis', nombre:'Amarilis', forma:'trompeta', n:6, largoBase:53,
      capas:[{e:1,g:0}],
      c1:'#ffd9d2', c2:'#c9203a', borde:'#7d1122', centro:'estambres', antera:'#f2e2a0' },

    { clave:'camelia', nombre:'Camelia', forma:'redondo', n:8, largoBase:34,
      capas:[{e:1.35,g:0},{e:1.05,g:22},{e:.75,g:44},{e:.45,g:66}],
      c1:'#fff2f4', c2:'#e0728f', borde:'#a8455f', centro:'estambres', antera:'#f3d472' },

    { clave:'gardenia', nombre:'Gardenia', forma:'ancho', n:7, largoBase:40,
      capas:[{e:1.15,g:0},{e:.88,g:26},{e:.62,g:52},{e:.36,g:78}],
      c1:'#ffffff', c2:'#e4e8cd', borde:'#8f9770', centro:'boton', botonColor:'#f2efd2' },

    { clave:'ranunculo', nombre:'Ranúnculo', forma:'redondo', n:9, largoBase:34,
      capas:[{e:1.3,g:0},{e:1.05,g:18},{e:.82,g:36},{e:.6,g:54},{e:.4,g:72},{e:.22,g:90}],
      c1:'#fff0d6', c2:'#ee7f43', borde:'#a94a15', centro:'boton', botonColor:'#7e9c3c' },

    { clave:'gladiolo', nombre:'Gladiolo', tipo:'espiga', forma:'volante', n:6, largoBase:38,
      c1:'#fff0f6', c2:'#dd6a9e', borde:'#9c3468', floretes:5, centro:'boton', botonColor:'#fbe3a8' }
  ];

  const porClave = Object.fromEntries(ESPECIES.map(e => [e.clave, e]));
  let n = 0; // los id de gradiente deben ser únicos dentro de cada documento

  /* --------------------------------------------------------------------- */
  /*  Dibujo de un pétalo: relleno degradado, sombra en la base, banda de   */
  /*  luz y contorno del tono oscuro. Eso es lo que le da el aire pintado.  */
  /* --------------------------------------------------------------------- */
  function petalo(e, f, ang, esc, ids, mini) {
    if (mini) {
      return `<g transform="rotate(${ang}) scale(${esc})">
        <path d="${f.d}" fill="url(#${ids.base})" stroke="${e.borde}"
              stroke-width="2.4" stroke-linejoin="round"/></g>`;
    }
    const L = f.largo;
    return `<g transform="rotate(${ang}) scale(${esc})">
      <path d="${f.d}" fill="url(#${ids.base})" stroke="${e.borde}"
            stroke-width="1.9" stroke-linejoin="round"/>
      <path d="${f.d}" transform="scale(.52) translate(0,-${(L * .35).toFixed(0)})"
            fill="url(#${ids.luz})"/>
      <path d="M0,-3 L0,-${(L * .82).toFixed(0)}" stroke="${e.borde}" stroke-width="1.2"
            opacity=".26" fill="none" stroke-linecap="round"/>
      ${f.simple ? '' : `
      <path d="M0,-${(L * .28).toFixed(0)} C ${(L * .13).toFixed(0)},-${(L * .48).toFixed(0)} ${(L * .18).toFixed(0)},-${(L * .6).toFixed(0)} ${(L * .16).toFixed(0)},-${(L * .72).toFixed(0)}"
            stroke="${e.borde}" stroke-width=".9" opacity=".2" fill="none"/>
      <path d="M0,-${(L * .28).toFixed(0)} C -${(L * .13).toFixed(0)},-${(L * .48).toFixed(0)} -${(L * .18).toFixed(0)},-${(L * .6).toFixed(0)} -${(L * .16).toFixed(0)},-${(L * .72).toFixed(0)}"
            stroke="${e.borde}" stroke-width=".9" opacity=".2" fill="none"/>`}
      ${e.rayas ? `
      <path d="M0,-${(L * .35).toFixed(0)} l ${(L * .1).toFixed(0)},-${(L * .12).toFixed(0)}"
            stroke="${e.borde}" stroke-width="2" opacity=".55" stroke-linecap="round"/>
      <path d="M0,-${(L * .52).toFixed(0)} l -${(L * .09).toFixed(0)},-${(L * .1).toFixed(0)}"
            stroke="${e.borde}" stroke-width="1.8" opacity=".5" stroke-linecap="round"/>` : ''}
      ${f.rizo ? `<path d="${f.rizo}" fill="${e.borde}" opacity=".9"/>` : ''}
    </g>`;
  }

  function anillo(e, f, num, esc, giro, ids, mini) {
    let s = '';
    for (let i = 0; i < num; i++) s += petalo(e, f, giro + i * (360 / num), esc, ids, mini);
    return s;
  }

  /* Centros -------------------------------------------------------------- */
  function centro(e, r) {
    switch (e.centro) {
      case 'estambres': return estambres(e, r); // los dibuja su propia función
      case 'disco':
        return `<circle r="${r * .3}" fill="${e.discoColor}"/>
                <circle r="${r * .3}" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.6"/>
                <circle r="${r * .17}" fill="rgba(0,0,0,.16)"/>
                <circle cx="${-r * .1}" cy="${-r * .11}" r="${r * .07}" fill="#fff" opacity=".28"/>`;
      case 'espiral':
        return `<path d="M0,-${r * .34} C ${r * .23},-${r * .34} ${r * .32},-${r * .14} ${r * .24},${r * .06}
                         C ${r * .16},${r * .24} -${r * .1},${r * .3} -${r * .22},${r * .15}
                         C -${r * .32},${r * .02} -${r * .28},-${r * .2} -${r * .13},-${r * .27}"
                      fill="none" stroke="${e.borde}" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>`;
      case 'boton':
        return `<circle r="${r * .22}" fill="${e.botonColor || '#f7d768'}"
                        stroke="rgba(0,0,0,.2)" stroke-width="1.3"/>
                <circle cx="${-r * .07}" cy="${-r * .08}" r="${r * .07}" fill="#fff" opacity=".45"/>`;
      default: return '';
    }
  }

  // Estambres de lirio / amarilis / camelia: filamento curvo + antera.
  function estambres(e, r) {
    let s = '';
    for (let i = 0; i < 6; i++) {
      const g  = i * 58 + 14;
      const a  = g * Math.PI / 180;
      const lx = Math.sin(a) * r * .46, ly = -Math.cos(a) * r * .46;
      s += `<path d="M0,2 Q ${(lx * .35).toFixed(1)},${(ly * .9).toFixed(1)} ${lx.toFixed(1)},${ly.toFixed(1)}"
              fill="none" stroke="#e8c65a" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    for (let i = 0; i < 6; i++) {
      const g  = i * 58 + 14;
      const a  = g * Math.PI / 180;
      const lx = Math.sin(a) * r * .46, ly = -Math.cos(a) * r * .46;
      s += `<g transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(${g})">
              <ellipse rx="2.8" ry="6" fill="${e.antera}" stroke="rgba(0,0,0,.22)" stroke-width=".7"/>
              <ellipse cx="-.8" cy="-1.5" rx=".9" ry="2.2" fill="#fff" opacity=".4"/>
            </g>`;
    }
    return s + `<circle r="3.2" fill="#f6e6a8"/>`;
  }

  /* Orquídea: tres sépalos, dos pétalos y el labelo con su garganta. ------ */
  function orquidea(e, ids, mini) {
    const f = FORMA.sepalo;
    let s = '';
    [0, 130, 230].forEach(a => { s += petalo(e, f, a, .92, ids, mini); });
    [70, 290].forEach(a => { s += petalo(e, FORMA.ancho, a, 1.15, ids, mini); });
    s += `<g transform="translate(0,6)">
      <path d="M0,-6 C 20,-6 26,10 18,26 C 12,38 -12,38 -18,26 C -26,10 -20,-6 0,-6 Z"
            fill="${e.labelo}" stroke="${e.borde}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M0,-2 C 11,-2 14,8 10,17 C 7,23 -7,23 -10,17 C -14,8 -11,-2 0,-2 Z"
            fill="${e.garganta}" opacity=".9"/>
      <path d="M-6,4 C -3,10 3,10 6,4" fill="none" stroke="${e.borde}" stroke-width="1.6"
            opacity=".6" stroke-linecap="round"/>
    </g>`;
    return s;
  }

  /* Tulipán: copa cerrada vista de lado, con su tallo y su hoja. --------- */
  function tulipan(e, ids, mini) {
    const f = FORMA.tulipan;
    // Los pétalos giran sobre la base de la copa (0,40), no sobre el centro
    // del lienzo: así se abren en abanico como un tulipán de verdad.
    const petalo1 = (rot, esc, sombra) =>
      `<g transform="rotate(${rot} 0 40) translate(0,-8) scale(${esc})">
         <path d="${f.d}" fill="url(#${ids.base})" stroke="${e.borde}"
               stroke-width="2.1" stroke-linejoin="round"/>
         ${sombra ? `<path d="${f.d}" fill="${e.borde}" opacity=".16"/>` : ''}
         ${mini ? '' : `<path d="${f.d}" transform="scale(.46) translate(0,-16)"
               fill="url(#${ids.luz})"/>`}
       </g>`;
    return `
      <path d="M0,36 C 3,56 2,64 0,70" fill="none" stroke="#4c8a38"
            stroke-width="5" stroke-linecap="round"/>
      <path d="M2,50 C 22,48 34,36 38,20 C 22,24 8,34 2,50 Z"
            fill="#5da240" stroke="#3d7530" stroke-width="1.6" stroke-linejoin="round"/>
      ${petalo1(-24, .9, true)}${petalo1(24, .9, true)}
      ${petalo1(-9, 1, false)}${petalo1(9, 1, false)}
      ${petalo1(0, .8, false)}`;
  }

  /* Espiga (jacinto, gladiolo): florecillas escalonadas sobre el tallo. --- */
  function espiga(e, ids, mini) {
    const f = FORMA[e.forma];
    const num = e.floretes;
    let s = `<path d="M0,58 C -2,20 -1,-20 0,-56" fill="none" stroke="#4e8a3a"
                    stroke-width="4.5" stroke-linecap="round"/>`;
    for (let i = 0; i < num; i++) {
      const t  = i / (num - 1);
      const y  = 46 - t * 96;                    // de abajo hacia arriba
      const x  = (i % 2 ? 1 : -1) * (11 - t * 8); // alternadas a los lados
      const es = (1 - t * .45) * (e.forma === 'volante' ? .85 : 1);
      s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${es.toFixed(2)})">
              ${anillo(e, f, e.n, 1, i * 24, ids, mini)}
              ${mini ? '' : centro(e, f.largo)}
            </g>`;
    }
    return s;
  }

  /* Una flor entera ------------------------------------------------------- */
  function flor(clave, tam, mini, hue) {
    const e = porClave[clave] || ESPECIES[0];
    const t = tam || 64;
    const ids = { base: 'b' + (++n), luz: 'l' + (++n) };
    // El tinte va dentro del SVG y no como filtro CSS: se calcula una vez al
    // decodificar la imagen, no en cada fotograma de la animación.
    const hid = 'h' + (++n);
    const tinte = hue ? {
      defs: `<filter id="${hid}" color-interpolation-filters="sRGB">
               <feColorMatrix type="hueRotate" values="${hue}"/></filter>`,
      ini: `<g filter="url(#${hid})">`, fin: '</g>'
    } : { defs: '', ini: '', fin: '' };

    let cuerpo;
    if (e.tipo === 'tulipan')     cuerpo = tulipan(e, ids, mini);
    else if (e.tipo === 'orquidea') cuerpo = orquidea(e, ids, mini);
    else if (e.tipo === 'espiga') cuerpo = espiga(e, ids, mini);
    else {
      const f = FORMA[e.forma];
      const capas = mini ? [e.capas[0]] : e.capas;
      // De fuera hacia dentro: las capas pequeñas van ENCIMA, si no quedan
      // sepultadas bajo la corona exterior y la flor pierde el volumen.
      cuerpo = capas.map((c, i) => {
        const sombra = i === 0 ? '' :
          `<circle r="${(f.largo * c.e * .92).toFixed(1)}" fill="${e.borde}" opacity=".13"/>`;
        return sombra + anillo(e, f, e.n, c.e, c.g, ids, mini);
      }).join('');
      const r = f.largo * e.capas[0].e;
      cuerpo += mini
        ? `<circle r="${r * .2}" fill="${e.discoColor || e.botonColor || e.borde}"/>`
        : (e.centro === 'estambres' ? estambres(e, r) : centro(e, r));
    }

    return `<svg class="svg-flor" viewBox="-70 -70 140 140" width="${t}" height="${t}"
              xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="${ids.base}" cx="50%" cy="90%" r="88%">
          <stop offset="0%"   stop-color="${e.c1}"/>
          <stop offset="38%"  stop-color="${e.c1}"/>
          <stop offset="100%" stop-color="${e.c2}"/>
        </radialGradient>
        <linearGradient id="${ids.luz}" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity=".04"/>
          <stop offset="55%"  stop-color="#ffffff" stop-opacity=".5"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity=".12"/>
        </linearGradient>
        ${tinte.defs}
      </defs>
      ${tinte.ini}${cuerpo}${tinte.fin}
    </svg>`;
  }

  /* ----------------------------------------------------------------------
     Versión imagen. Un jardín con veinte flores en línea son miles de nodos
     SVG animados y el móvil se arrastra. Como <img> el dibujo se decodifica
     una vez y se cachea por especie + color.
     ---------------------------------------------------------------------- */
  const cache = new Map();
  function img(clave, tam, mini, hue) {
    const llave = clave + '|' + (mini ? 'm' : 'g') + '|' + (hue || 0);
    if (!cache.has(llave)) {
      const svg = flor(clave, 128, mini, hue).replace(/\s+/g, ' ');
      cache.set(llave, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    }
    const e = porClave[clave] || ESPECIES[0];
    return `<img class="svg-flor" src="${cache.get(llave)}" width="${tam}" height="${tam}"
                 alt="${e.nombre}" draggable="false" decoding="async">`;
  }

  /* ======================================================================= */
  /*  RAMO DE LA PORTADA — acuarela suave, como la lámina botánica.          */
  /* ======================================================================= */
  function lirioAcuarela(x, y, rot, esc, tono, retraso) {
    const id = 'lg' + (++n);
    const claro = tono === 'rosa' ? '#fff6f9' : tono === 'crema' ? '#fffdf2' : '#ffffff';
    const osc   = tono === 'rosa' ? '#f0aec8' : tono === 'crema' ? '#f2e0ad' : '#e9e2f2';
    const vena  = tono === 'rosa' ? '#e893b4' : tono === 'crema' ? '#e6cf8d' : '#d9d2ea';

    let petalos = '';
    for (let i = 0; i < 6; i++) {
      const a = i * 60 + (i % 2 ? 8 : -8);
      petalos += `
        <g transform="rotate(${a})">
          <path d="${FORMA.lanza.d}" transform="scale(1.28)"
                fill="url(#${id})" stroke="${osc}" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M0,-2 L0,-72" stroke="${vena}" stroke-width="2" stroke-linecap="round" fill="none"/>
          <path d="M0,-26 q 7,-12 10,-28" stroke="${vena}" stroke-width="1.1" fill="none" opacity=".7"/>
          <path d="M0,-26 q -7,-12 -10,-28" stroke="${vena}" stroke-width="1.1" fill="none" opacity=".7"/>
        </g>`;
    }
    let est = '';
    for (let i = 0; i < 6; i++) {
      const a  = (i * 58 + 15) * Math.PI / 180;
      const lx = Math.sin(a) * 26, ly = -Math.cos(a) * 26;
      est += `<path d="M0,0 Q ${lx * .4},${ly * .85} ${lx},${ly}" fill="none"
                stroke="#dfc98d" stroke-width="2.2" stroke-linecap="round"/>
              <ellipse cx="${lx}" cy="${ly}" rx="5" ry="3"
                transform="rotate(${i * 58 + 15} ${lx} ${ly})" fill="#e79236"/>`;
    }

    return `<g class="lirio-svg" style="--retraso:${retraso}s">
      <g transform="translate(${x} ${y}) rotate(${rot}) scale(${esc})">
        <defs>
          <radialGradient id="${id}" cx="50%" cy="86%" r="80%">
            <stop offset="0%" stop-color="${claro}"/>
            <stop offset="46%" stop-color="${claro}"/>
            <stop offset="100%" stop-color="${osc}"/>
          </radialGradient>
        </defs>
        ${petalos}${est}
        <circle r="5" fill="#f5e9c2"/>
      </g>
    </g>`;
  }

  function capullo(x, y, rot, esc, retraso) {
    return `<g class="lirio-svg" style="--retraso:${retraso}s">
      <g transform="translate(${x} ${y}) rotate(${rot}) scale(${esc})">
        <path d="M0,0 C 15,-13 13,-50 0,-68 C -13,-50 -15,-13 0,0 Z"
              fill="#eaf3d9" stroke="#a8c48a" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M0,-1 C 9,-15 8,-48 0,-66" fill="none" stroke="#bcd6a0" stroke-width="1.4"/>
        <path d="M0,-1 C -9,-15 -8,-48 0,-66" fill="none" stroke="#bcd6a0" stroke-width="1.4"/>
      </g>
    </g>`;
  }

  function hoja(d, nervio, tono) {
    return `<g>
      <path d="${d}" fill="${tono}" stroke="#5f9448" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="${nervio}" fill="none" stroke="#5f9448" stroke-width="1.2" opacity=".55"/>
    </g>`;
  }

  function ramo() {
    return `<svg viewBox="0 0 300 560" class="ramo-svg"
              xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ramo de lirios">
      <defs>
        <!-- userSpaceOnUse: en un tallo casi vertical el bounding box no tiene
             ancho y un gradiente relativo se degenera (no pinta nada). -->
        <linearGradient id="tallo" gradientUnits="userSpaceOnUse" x1="150" y1="120" x2="150" y2="510">
          <stop offset="0%" stop-color="#86bd66"/><stop offset="100%" stop-color="#3f7333"/>
        </linearGradient>
      </defs>

      <g filter="url(#trazo)">
        <g fill="none" stroke="url(#tallo)" stroke-width="5.5" stroke-linecap="round">
          <path d="M150,500 C 150,400 152,260 150,150"/>
          <path d="M150,500 C 140,400 104,300 80,206"/>
          <path d="M150,500 C 160,400 196,300 220,210"/>
          <path d="M150,500 C 146,410 124,330 112,286"/>
          <path d="M150,500 C 154,412 178,336 192,294"/>
          <path d="M150,500 C 158,420 216,320 246,150"/>
          <path d="M150,500 C 142,420 88,330 60,170"/>
        </g>

        ${hoja('M150,452 C 104,438 66,404 44,356 C 88,364 130,396 150,452 Z',
               'M150,452 C 118,424 84,392 46,358', '#68ab4d')}
        ${hoja('M150,444 C 196,430 234,398 256,352 C 212,358 170,390 150,444 Z',
               'M150,444 C 182,416 216,386 254,354', '#5c9c43')}
        ${hoja('M150,414 C 116,400 92,374 78,340 C 110,348 138,374 150,414 Z',
               'M150,414 C 126,392 102,368 80,342', '#7cba5c')}
        ${hoja('M150,408 C 184,394 208,368 222,334 C 190,342 162,368 150,408 Z',
               'M150,408 C 174,386 198,362 220,336', '#71b154')}

        ${capullo(246, 150, 14, 1, .9)}
        ${capullo(60, 170, -16, .88, 1.05)}

        ${lirioAcuarela(150, 150, 0, 1.14, 'crema', .1)}
        ${lirioAcuarela(80, 206, -20, 1.04, 'rosa', .3)}
        ${lirioAcuarela(220, 210, 20, 1.00, 'rosa', .45)}
        ${lirioAcuarela(112, 286, -9, .95, 'blanco', .6)}
        ${lirioAcuarela(192, 294, 11, .92, 'blanco', .75)}

        <g>
          <path d="M120,470 C 96,450 84,486 114,482 Z" fill="#dd8fac" stroke="#c4708f" stroke-width="1.4"/>
          <path d="M180,470 C 204,450 216,486 186,482 Z" fill="#dd8fac" stroke="#c4708f" stroke-width="1.4"/>
          <rect x="122" y="464" width="56" height="15" rx="7.5" fill="#e8a3bd" stroke="#c4708f" stroke-width="1.4"/>
          <path d="M132,492 C 128,506 122,514 116,520" fill="none" stroke="#dd8fac" stroke-width="3.4" stroke-linecap="round"/>
          <path d="M168,492 C 172,506 178,514 184,520" fill="none" stroke="#dd8fac" stroke-width="3.4" stroke-linecap="round"/>
        </g>
      </g>
    </svg>`;
  }

  /* Filtro de trazo del ramo: le da el temblor del dibujo a mano. --------- */
  function inyectarFiltro() {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', '0'); s.setAttribute('height', '0');
    s.style.cssText = 'position:absolute;pointer-events:none';
    s.innerHTML = `<defs>
      <filter id="trazo" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="7" result="ruido"/>
        <feDisplacementMap in="SourceGraphic" in2="ruido" scale="2.4"
                           xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>`;
    document.body.appendChild(s);
  }
  if (document.body) inyectarFiltro();
  else document.addEventListener('DOMContentLoaded', inyectarFiltro);

  /* ----------------------------------------------------------------------
     Tallo del jardín: curvo y con una hoja, en vez de un palito recto. La
     curva sale de la semilla (el id de la nota), así cada flor tiene su
     forma y no cambia al recargar.
     ---------------------------------------------------------------------- */
  function tallo(semilla) {
    let s = 0;
    for (let i = 0; i < String(semilla).length; i++) {
      s = (s * 31 + String(semilla).charCodeAt(i)) % 1000;
    }
    const curva = ((s % 7) - 3) * 1.5;        // hacia dónde se dobla
    const lado  = (s >> 3) % 2 ? 1 : -1;      // de qué lado sale la hoja
    const altoHoja = 20 + (s % 5) * 2;

    return `<svg class="flor-tallo" viewBox="0 0 22 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11,0 C ${11 + curva},13 ${11 - curva},28 11,46"
            fill="none" stroke="#2f6129" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M11,0 C ${11 + curva},13 ${11 - curva},28 11,46"
            fill="none" stroke="#5c9c47" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M11,${altoHoja} c ${lado * 9},-4 ${lado * 11},-9 ${lado * 10},-13
               c ${lado * -7},1 ${lado * -10},6 ${lado * -10},13 Z"
            fill="#4d9140" stroke="#2f6129" stroke-width="1.1" stroke-linejoin="round"/>
    </svg>`;
  }

  window.FloresSVG = { flor, img, ramo, tallo, ESPECIES, existe: c => Boolean(porClave[c]) };
})();
