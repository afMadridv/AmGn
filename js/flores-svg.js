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
  /*  RAMO DE LA PORTADA — "Abanico": ancho, de copa plana.                  */
  /*  --------------------------------------------------------------------- */
  /*  Rosas blancas y rosadas + lirios. El lirio manda: va al doble de       */
  /*  tamaño que la rosa (radio ~47 contra ~25).                            */
  /*                                                                         */
  /*  Las flores NO van por pisos. Antes quedaban los lirios arriba y las    */
  /*  rosas abajo y el ramo se leía como dos bandas pegadas; ahora cada      */
  /*  altura mezcla las dos especies: hay lirio abajo del todo y rosas en la */
  /*  corona alta. El campo `y` de cada flor es lo único que hay que tocar   */
  /*  para recolocar el reparto.                                             */
  /* ======================================================================= */

  /* Azar con semilla: el temblor de los pétalos y la paniculata salen
     iguales en cada recarga. */
  function azar(semilla) {
    let s = semilla * 9301 + 49297;
    return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  }

  const TONO_ROSA = {
    blanca:   { claro:'#ffffff', medio:'#f8f2ea', hondo:'#e9dccb', borde:'#c3ad96', filo:'#ffffff' },
    rosaPalo: { claro:'#fff6f8', medio:'#fbdde6', hondo:'#f3b9cd', borde:'#cf90a8', filo:'#fffafc' },
    rosada:   { claro:'#fff0f4', medio:'#f9c3d5', hondo:'#ea8fb0', borde:'#c26e8e', filo:'#fff5f8' }
  };
  const TONO_LIRIO = {
    rosa:       { c1:'#fff7fa', c2:'#f4b3c9', borde:'#d98aa8', vena:'#e792ae',
                  peca:'#9c3c58', garganta:'#f8d79a', antera:'#b04a2a' },
    blancoRosa: { c1:'#ffffff', c2:'#fdeef3', borde:'#dda9bd', vena:'#ef9ab8',
                  peca:'#c04a72', garganta:'#f7cfa8', antera:'#b04a2a' }
  };

  /* -------------------------------------------------------------- rosa ---
     Diseño "Abierta": un anillo ancho, otro pequeño dentro y estambres
     dorados a la vista. Cada pétalo lleva su cuenco en sombra y su filo
     vuelto en luz; sin eso la flor sale plana como una escarapela.        */
  const P_ROSA   = { ext:'M0,7 C 21,5 32,-9 30,-26 C 28,-39 16,-46 6,-41 C 3,-39 -3,-39 -6,-41 C -16,-46 -28,-39 -30,-26 C -32,-9 -21,5 0,7 Z',
                     med:'M0,5 C 16,3 25,-9 23,-24 C 21,-35 10,-40 0,-34 C -10,-40 -21,-35 -23,-24 C -25,-9 -16,3 0,5 Z' };
  const CUENCO   = { ext:'M0,7 C 13,5 21,-4 22,-15 C 13,-7 -13,-7 -22,-15 C -21,-4 -13,5 0,7 Z',
                     med:'M0,4 C 10,3 17,-3 18,-12 C 10,-5 -10,-5 -18,-12 C -17,-3 -10,3 0,4 Z' };
  const FILO     = { ext:'M-23,-29 C -12,-41 12,-41 23,-29',
                     med:'M-18,-25 C -10,-35 10,-35 18,-25' };

  function rosaRamo(x, y, rot, esc, tono, retraso, semilla) {
    const T  = TONO_ROSA[tono] || TONO_ROSA.rosada;
    const az = azar(semilla || 7);
    const gExt = 'rE' + (++n), gMed = 'rM' + (++n);

    const anillo = (num, escala, giro, forma, grad) => {
      let s = '';
      for (let i = 0; i < num; i++) {
        const a  = giro + i * (360 / num) + (az() - .5) * 13;
        const e2 = escala * (1 + (az() - .5) * .12);
        s += `<g transform="rotate(${a.toFixed(1)}) scale(${e2.toFixed(3)})">
          <path d="${P_ROSA[forma]}" fill="url(#${grad})" stroke="${T.borde}"
                stroke-width="${(1.5 / e2).toFixed(2)}" stroke-linejoin="round"/>
          <path d="${CUENCO[forma]}" fill="${T.borde}" opacity=".15"/>
          <path d="${FILO[forma]}" fill="none" stroke="${T.filo}"
                stroke-width="${(2.6 / e2).toFixed(2)}" opacity=".7" stroke-linecap="round"/>
        </g>`;
      }
      return s;
    };

    let est = '';
    for (let i = 0; i < 10; i++) {
      const a = i * 36 * Math.PI / 180;
      const lx = (Math.sin(a) * 11).toFixed(1), ly = (-Math.cos(a) * 11).toFixed(1);
      est += `<path d="M0,0 L${lx},${ly}" stroke="#e3cd8e" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="${lx}" cy="${ly}" r="1.9" fill="#e0a83c"/>`;
    }

    /* Sépalos: tres puntas verdes por detrás. Delatan que la flor está
       pegada a un tallo y no flotando. */
    const sepalos = [30, 150, 270].map(a =>
      `<g transform="rotate(${a}) translate(0,-4)">
         <path d="M0,8 C 5,-4 5,-26 0,-40 C -5,-26 -5,-4 0,8 Z"
               fill="#93b47c" stroke="#6d9159" stroke-width="1.1" stroke-linejoin="round"/>
       </g>`).join('');

    return `<g class="ramo-flor" style="--retraso:${retraso}s">
      <g transform="translate(${x} ${y}) rotate(${rot}) scale(${esc})">
        <defs>
          <radialGradient id="${gExt}" cx="50%" cy="96%" r="92%">
            <stop offset="0%" stop-color="${T.medio}"/>
            <stop offset="55%" stop-color="${T.claro}"/>
            <stop offset="100%" stop-color="${T.claro}"/>
          </radialGradient>
          <radialGradient id="${gMed}" cx="50%" cy="96%" r="90%">
            <stop offset="0%" stop-color="${T.hondo}"/>
            <stop offset="45%" stop-color="${T.medio}"/>
            <stop offset="100%" stop-color="${T.claro}"/>
          </radialGradient>
        </defs>
        ${sepalos}
        ${anillo(8, 1, 0, 'ext', gExt)}
        ${anillo(6, .6, 24, 'med', gMed)}
        ${est}<circle r="4.5" fill="#dbc98a"/><circle r="2.2" fill="#b7a45f"/>
      </g>
    </g>`;
  }

  /* ------------------------------------------------------------- lirio ---
     Diseño "Asiático": pétalo corto y ancho, mira de frente. Las pecas son
     la marca de la casa: sin ellas parece una estrella de papel.          */
  const P_LIRIO_D = 'M0,3 C 11,-8 17,-22 16,-36 C 15,-46 8,-53 0,-55 C -8,-53 -15,-46 -16,-36 C -17,-22 -11,-8 0,3 Z';

  function lirioRamo(x, y, rot, esc, tono, retraso) {
    const T = TONO_LIRIO[tono] || TONO_LIRIO.rosa;
    const id = 'gl' + (++n);
    const L = 55;

    let pecas = '';
    for (let i = 0; i < 5; i++) {
      const py = (-(L * .2) - i * (L * .45 / 5)).toFixed(1);
      const px = (i % 2 ? 1 : -1) * (3.2 + (i % 3));
      pecas += `<ellipse cx="${px}" cy="${py}" rx="${(1.4 + (i % 2) * .4).toFixed(1)}" ry="2.1"
                  transform="rotate(${px > 0 ? 20 : -20} ${px} ${py})"
                  fill="${T.peca}" opacity=".6"/>`;
    }

    let petalos = '';
    for (let i = 0; i < 6; i++) {
      const a = i * 60 + (i % 2 ? 8 : -8);
      const ancho = i % 2 ? 1 : .93;        // tres sépalos algo más estrechos
      petalos += `<g transform="rotate(${a}) scale(${ancho} 1)">
        <path d="${P_LIRIO_D}" fill="url(#${id})" stroke="${T.borde}"
              stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M0,2 C 5,-7 7,-17 6,-25 C 3,-19 -3,-19 -6,-25 C -7,-17 -5,-7 0,2 Z"
              fill="${T.garganta}" opacity=".5"/>
        <path d="M0,-2 L0,-48" stroke="${T.vena}" stroke-width="1.9"
              stroke-linecap="round" fill="none"/>
        <path d="M0,-20 q 7,-12 10,-25" stroke="${T.vena}" stroke-width="1" fill="none" opacity=".55"/>
        <path d="M0,-20 q -7,-12 -10,-25" stroke="${T.vena}" stroke-width="1" fill="none" opacity=".55"/>
        ${pecas}
      </g>`;
    }

    let est = '';
    for (let i = 0; i < 6; i++) {
      const gr = i * 58 + 15;
      const a  = gr * Math.PI / 180;
      const lx = (Math.sin(a) * 23).toFixed(1), ly = (-Math.cos(a) * 23).toFixed(1);
      est += `<path d="M0,0 Q ${(lx * .4).toFixed(1)},${(ly * .85).toFixed(1)} ${lx},${ly}"
                fill="none" stroke="#e0c98e" stroke-width="2" stroke-linecap="round"/>
              <g transform="translate(${lx} ${ly}) rotate(${gr})">
                <ellipse rx="2.6" ry="5.4" fill="${T.antera}" stroke="rgba(0,0,0,.2)" stroke-width=".6"/>
                <ellipse cx="-.7" cy="-1.4" rx=".8" ry="2" fill="#fff" opacity=".35"/>
              </g>`;
    }
    est += `<path d="M0,0 Q 3,-12 6,-26" fill="none" stroke="#cfd79a"
              stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="6" cy="-26" r="2.8" fill="#c2cf7e"/>`;

    return `<g class="ramo-flor" style="--retraso:${retraso}s">
      <g transform="translate(${x} ${y}) rotate(${rot}) scale(${esc})">
        <defs>
          <radialGradient id="${id}" cx="50%" cy="88%" r="80%">
            <stop offset="0%" stop-color="${T.c1}"/>
            <stop offset="44%" stop-color="${T.c1}"/>
            <stop offset="100%" stop-color="${T.c2}"/>
          </radialGradient>
        </defs>
        ${petalos}${est}<circle r="4.5" fill="#f7ecc9"/>
      </g>
    </g>`;
  }

  function capullo(x, y, rot, esc, retraso) {
    const id = 'gc' + (++n);
    return `<g class="ramo-verde" style="--retraso:${retraso}s">
      <g transform="translate(${x} ${y}) rotate(${rot}) scale(${esc})">
        <defs>
          <linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#dfeccb"/>
            <stop offset="55%" stop-color="#eff5df"/>
            <stop offset="100%" stop-color="#f7d9e4"/>
          </linearGradient>
        </defs>
        <path d="M0,0 C 15,-13 13,-50 0,-70 C -13,-50 -15,-13 0,0 Z"
              fill="url(#${id})" stroke="#a8c48a" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M0,-1 C 9,-16 8,-49 0,-68" fill="none" stroke="#b9d29d" stroke-width="1.3"/>
        <path d="M0,-1 C -9,-16 -8,-49 0,-68" fill="none" stroke="#b9d29d" stroke-width="1.3"/>
        <path d="M0,-2 C 5,-14 5,-40 1,-62" fill="none" stroke="#fff" stroke-width="2" opacity=".45"/>
      </g>
    </g>`;
  }

  /* ------------------------------------------------------------- verde --- */
  function eucalipto(x, y, rot, esc, hojas, retraso) {
    let s = `<path d="M0,4 C 4,-26 -2,-62 1,-98" fill="none" stroke="#8fa98b"
                   stroke-width="2.2" stroke-linecap="round"/>`;
    for (let i = 1; i <= hojas; i++) {
      const t = i / hojas, hy = -(t * 96) - 2, hx = Math.sin(t * 2.4) * 5;
      const lado = i % 2 ? 1 : -1, r = 9.5 - t * 3.6;
      s += `<g transform="translate(${(hx + lado * (r + 1.5)).toFixed(1)} ${hy.toFixed(1)})
                          rotate(${lado * 24})">
        <ellipse rx="${r.toFixed(1)}" ry="${(r * .84).toFixed(1)}"
                 fill="${i % 3 ? '#a9c3a6' : '#8dae8d'}" stroke="#8dae8d" stroke-width=".9"/>
        <ellipse cx="${(-r * .28).toFixed(1)}" cy="${(-r * .3).toFixed(1)}"
                 rx="${(r * .34).toFixed(1)}" ry="${(r * .26).toFixed(1)}" fill="#fff" opacity=".26"/>
      </g>`;
    }
    return `<g class="ramo-verde" style="--retraso:${retraso}s">
      <g transform="translate(${x} ${y}) rotate(${rot}) scale(${esc})">${s}</g></g>`;
  }

  function follaje(x, y, rot, esc, retraso) {
    let s = `<path d="M0,4 C -3,-24 2,-56 0,-86" fill="none" stroke="#4e8a3a"
                   stroke-width="2.4" stroke-linecap="round"/>`;
    for (let i = 1; i <= 5; i++) {
      const t = i / 5, hy = -(t * 80), lado = i % 2 ? 1 : -1, L = 30 - t * 12;
      s += `<path d="M0,${hy.toFixed(0)} c ${lado * L * .5},-3 ${lado * L * .85},-11 ${lado * L},-22
                     c ${lado * -L * .6},3 ${lado * -L * .95},10 ${lado * -L},22 Z"
                  fill="${i % 2 ? '#6ea656' : '#4f8b3e'}" stroke="#4f8b3e"
                  stroke-width="1.1" stroke-linejoin="round"/>`;
    }
    return `<g class="ramo-verde" style="--retraso:${retraso}s">
      <g transform="translate(${x} ${y}) rotate(${rot}) scale(${esc})">${s}</g></g>`;
  }

  function paniculata(x, y, esc, semilla, retraso) {
    const r = azar(semilla);
    let tallos = '', flores = '';
    for (let i = 0; i < 13; i++) {
      const a = (-20 - r() * 140) * Math.PI / 180;       // sólo hacia arriba
      const d = 8 + r() * 24;
      const px = (Math.cos(a) * d).toFixed(1);
      const py = (Math.sin(a) * d - r() * 6).toFixed(1);
      tallos += `<path d="M0,4 Q ${(px * .5).toFixed(1)},${(py * .5).toFixed(1)} ${px},${py}"
                   fill="none" stroke="#cbd6bd" stroke-width=".8"/>`;
      flores += `<circle cx="${px}" cy="${py}" r="${(1.9 + r() * 1.5).toFixed(1)}"
                   fill="#fffdf6" stroke="#e4dcc7" stroke-width=".6"/>`;
    }
    return `<g class="ramo-verde" style="--retraso:${retraso}s">
      <g transform="translate(${x} ${y}) scale(${esc})">${tallos}${flores}</g></g>`;
  }

  /* -------------------------------------------------- moño rosa pastel --- */
  const CINTA = { claro:'#ffeaf1', medio:'#fbd0de', osc:'#f0aec6',
                  borde:'#dd93ae', encaje:'#fffafc' };

  /* Festón de puntilla: arcos pegados uno detrás de otro. Un arco lee como
     encaje; una fila de circulitos lee como lunares. */
  function feston(x, y, ancho, num, grosor, rot) {
    const r = ancho / (num * 2);
    let d = `M${x},${y}`;
    for (let i = 0; i < num; i++) d += ` a ${r.toFixed(1)},${r.toFixed(1)} 0 0,0 ${(r * 2).toFixed(1)},0`;
    return `<path d="${d}" fill="none" stroke="${CINTA.encaje}" stroke-width="${grosor}"
                  stroke-linecap="round" opacity=".9"
                  ${rot ? `transform="rotate(${rot} ${x} ${y})"` : ''}/>`;
  }

  function lazo() {
    const RASO = 'raso' + (++n), C = CINTA;
    return `<g class="ramo-lazo">
      <defs>
        <!-- Brillo del raso: claro en el centro de la cinta, apagado en los
             filos. userSpaceOnUse porque las lazadas son muy planas. -->
        <linearGradient id="${RASO}" gradientUnits="userSpaceOnUse" x1="0" y1="424" x2="0" y2="492">
          <stop offset="0%" stop-color="${C.medio}"/>
          <stop offset="38%" stop-color="${C.claro}"/>
          <stop offset="62%" stop-color="${C.claro}"/>
          <stop offset="100%" stop-color="${C.osc}"/>
        </linearGradient>
      </defs>

      <g><!-- colas, detrás de todo -->
        <path d="M147,462 C 140,492 132,514 116,538 L 128,546 L 135,533 L 145,543
                 C 155,516 159,490 159,464 Z"
              fill="url(#${RASO})" stroke="${C.borde}" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M153,462 C 161,494 170,516 186,540 L 173,547 L 166,534 L 156,544
                 C 146,516 142,490 141,464 Z"
              fill="${C.medio}" stroke="${C.borde}" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M150,474 C 145,500 138,518 125,537" fill="none" stroke="${C.encaje}"
              stroke-width="1.8" opacity=".7"/>
        <path d="M154,474 C 160,500 168,518 179,536" fill="none" stroke="${C.encaje}"
              stroke-width="1.8" opacity=".7"/>
        ${feston(117, 539, 26, 4, 1.5, 34)}
        ${feston(160, 546, 26, 4, 1.5, -34)}
      </g>

      <!-- banda que envuelve el manojo -->
      <path d="M119,438 C 139,432 161,432 181,438 L 184,470 C 162,477 138,477 116,470 Z"
            fill="url(#${RASO})" stroke="${C.borde}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M119,449 C 140,443 160,443 181,449" fill="none" stroke="${C.encaje}"
            stroke-width="2.6" opacity=".85"/>
      ${feston(119, 468, 62, 7, 1.6)}

      <!-- lazada de detrás: más grande y apagada, da el grosor -->
      <path d="M150,452 C 112,416 62,430 68,464 C 74,494 122,480 150,458 Z"
            fill="${C.osc}" stroke="${C.borde}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M150,452 C 186,418 234,434 226,466 C 219,494 174,478 150,458 Z"
            fill="${C.osc}" stroke="${C.borde}" stroke-width="1.4" stroke-linejoin="round"/>

      <!-- lazada de delante: la izquierda algo mayor, para que no sea espejo -->
      <path d="M150,452 C 118,422 80,434 86,462 C 92,486 126,476 150,459 Z"
            fill="url(#${RASO})" stroke="${C.borde}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M150,452 C 180,424 214,436 209,462 C 204,484 172,475 150,459 Z"
            fill="url(#${RASO})" stroke="${C.borde}" stroke-width="1.5" stroke-linejoin="round"/>

      <path d="M147,455 C 128,447 108,449 96,459" fill="none" stroke="${C.borde}"
            stroke-width="1.2" opacity=".55"/>
      <path d="M153,455 C 172,448 190,450 200,459" fill="none" stroke="${C.borde}"
            stroke-width="1.2" opacity=".55"/>
      ${feston(88, 468, 58, 6, 1.5, -7)}
      ${feston(152, 466, 56, 6, 1.5, 7)}

      <!-- nudo -->
      <path d="M142,446 C 148,442 152,442 158,446 C 162,454 162,463 158,471
               C 152,475 148,475 142,471 C 138,463 138,454 142,446 Z"
            fill="${C.medio}" stroke="${C.borde}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M145,450 C 149,447 151,447 155,450" fill="none" stroke="${C.encaje}"
            stroke-width="1.7" opacity=".8"/>
    </g>`;
  }

  /* ------------------------------------------------------------ el ramo --
     El reparto. `t` es 'L' lirio o 'R' rosa, y el orden de la lista ES el
     orden de dibujo: lo de arriba queda detrás. Fíjate en que las alturas
     se alternan: hay rosa en la corona (y≈170) y lirio en el frente
     (y≈320), justo lo contrario de tenerlas por pisos.                    */
  const RAMO_FLORES = [
    // ---- corona alta: dos lirios de fuera y DOS ROSAS arriba ----
    { t:'L', x: 62, y:214, r:-30, e:.8,  tono:'rosa',       d:.80 },
    { t:'L', x:238, y:210, r: 30, e:.8,  tono:'rosa',       d:.86 },
    { t:'R', x: 96, y:176, r:-14, e:.56, tono:'blanca',     d:.94, s: 3 },
    { t:'R', x:206, y:170, r: 14, e:.56, tono:'rosaPalo',   d:1.02, s: 9 },
    { t:'L', x:150, y:164, r:  0, e:.88, tono:'blancoRosa', d:1.10 },

    // ---- anillo medio: lirio y rosa alternados, y rosas en los extremos ----
    { t:'R', x: 54, y:274, r:-20, e:.5,  tono:'rosaPalo',   d:1.20, s:13 },
    { t:'R', x:246, y:278, r: 20, e:.5,  tono:'rosada',     d:1.27, s:21 },
    { t:'L', x:104, y:252, r:-16, e:.84, tono:'rosa',       d:1.35 },
    { t:'L', x:196, y:256, r: 16, e:.84, tono:'rosa',       d:1.43 },
    { t:'R', x:150, y:238, r:  0, e:.62, tono:'rosada',     d:1.52, s:27 },

    // ---- frente: LIRIO abajo del todo, con rosas a los lados ----
    { t:'R', x: 92, y:314, r:-12, e:.58, tono:'blanca',     d:1.62, s:33 },
    { t:'R', x:208, y:318, r: 12, e:.58, tono:'blanca',     d:1.70, s:41 },
    { t:'L', x:150, y:320, r:  0, e:.84, tono:'rosa',       d:1.80 },
    { t:'R', x:120, y:356, r:-10, e:.52, tono:'rosaPalo',   d:1.90, s:47 },
    { t:'R', x:180, y:358, r: 10, e:.52, tono:'rosada',     d:2.00, s:53 }
  ];

  const NUDO_Y = 452;

  /* Los tallos se dibujan de abajo arriba con stroke-dashoffset (ver
     .ramo-tallo en estilos.css). `pathLength="1"` normaliza cada curva, así
     un mismo dasharray vale para todas sin medir su longitud real, y `--i`
     las escalona. */
  function tallos(puntos) {
    let i = 0;
    const punta = d => `<path style="--i:${i++}" pathLength="1" d="${d}"/>`;
    return `<g class="ramo-tallo" fill="none" stroke="url(#tallo)"
                stroke-width="4.6" stroke-linecap="round">` +
      puntos.map(([x, y]) => punta(
        `M150,${NUDO_Y + 24} Q ${(150 + (x - 150) * .3).toFixed(0)},${((NUDO_Y + y) / 2).toFixed(0)} ${x},${y + 14}`
      )).join('') + `</g>
      <!-- puntas cortadas asomando bajo la cinta -->
      <g class="ramo-tallo" fill="none" stroke="#5f8f45" stroke-width="4"
         stroke-linecap="round" opacity=".9">
        ${punta('M148,466 C 144,500 140,524 136,548')}
        ${punta('M152,466 C 156,500 160,524 164,548')}
        ${punta('M150,466 C 150,500 150,524 150,552')}
        ${punta('M146,466 C 138,498 130,520 122,542')}
        ${punta('M154,466 C 162,498 170,520 178,542')}
      </g>`;
  }

  function ramo() {
    // Los retrasos son el guion de entrada; están explicados en estilos.css,
    // bajo "el guion de entrada del ramo". Verde de fuera hacia dentro.
    const verde = [
      eucalipto( 58, 322, -32, .78, 6, .30),
      eucalipto(242, 326,  32, .78, 6, .34),
      eucalipto( 92, 268, -26, .84, 6, .42),
      eucalipto(208, 272,  26, .84, 6, .46),
      eucalipto(150, 148,   0, .8,  6, .54),
      follaje( 76, 350, -24, .8,  .38),
      follaje(224, 354,  24, .8,  .40),
      follaje(112, 152, -18, .74, .58),
      follaje(188, 150,  18, .74, .62)
    ].join('');

    const nube = [
      paniculata( 70, 286, .8,  3, .58),
      paniculata(230, 290, .8,  7, .62),
      paniculata(150, 140, .85,11, .70),
      paniculata(110, 196, .8, 17, .66),
      paniculata(190, 200, .8, 23, .68),
      paniculata(150, 340, .75,29, .74)
    ].join('');

    const capullos = [
      capullo( 88, 196, -30, .74, .84),
      capullo(212, 192,  30, .72, .88),
      capullo(150, 124,   0, .66, .92)
    ].join('');

    const flores = RAMO_FLORES.map(f => f.t === 'R'
      ? rosaRamo(f.x, f.y, f.r, f.e, f.tono, f.d, f.s)
      : lirioRamo(f.x, f.y, f.r, f.e, f.tono, f.d)).join('');

    return `<svg viewBox="0 0 300 560" class="ramo-svg"
              xmlns="http://www.w3.org/2000/svg" role="img"
              aria-label="Ramo de rosas y lirios atado con un lazo rosa">
      <defs>
        <!-- userSpaceOnUse: en un tallo casi vertical el bounding box no tiene
             ancho y un gradiente relativo se degenera (no pinta nada). -->
        <linearGradient id="tallo" gradientUnits="userSpaceOnUse" x1="150" y1="120" x2="150" y2="510">
          <stop offset="0%" stop-color="#86bd66"/><stop offset="100%" stop-color="#3f7333"/>
        </linearGradient>
      </defs>
      <g filter="url(#trazo)">
        ${tallos(RAMO_FLORES.map(f => [f.x, f.y]))}
        ${verde}${nube}${capullos}${flores}${lazo()}
      </g>
    </svg>`;
  }

  /* Filtro de trazo del ramo: le da el temblor del dibujo a mano. Con el
     ramo nuevo hay mucho más detalle que desplazar, y con scale 2.4 los
     pétalos pequeños de la rosa se deshilachaban: por eso 1.4. ---------- */
  function inyectarFiltro() {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', '0'); s.setAttribute('height', '0');
    s.style.cssText = 'position:absolute;pointer-events:none';
    s.innerHTML = `<defs>
      <filter id="trazo" x="-12%" y="-12%" width="124%" height="124%">
        <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="ruido"/>
        <feDisplacementMap in="SourceGraphic" in2="ruido" scale="1.4"
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
