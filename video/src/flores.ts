/* Las flores del video son las del jardín de verdad: se importa el mismo
   js/flores-svg.js que usa la web y se le piden los SVG. Así el reel enseña
   la interfaz real, no una imitación. */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: es un script de navegador que se cuelga de window
import '../../js/flores-svg.js';

type Flores = {
  flor: (clave: string, tam: number, mini?: boolean, hue?: number) => string;
  ramo: () => string;
};

const F = (): Flores => (window as unknown as { FloresSVG: Flores }).FloresSVG;

const cache = new Map<string, string>();

export function florSrc(clave: string, hue = 0): string {
  const k = clave + '|' + hue;
  if (!cache.has(k)) {
    const svg = F().flor(clave, 256, false, hue).replace(/\s+/g, ' ');
    cache.set(k, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  }
  return cache.get(k)!;
}

export function ramoSvg(): string {
  return F().ramo();
}

export const ESPECIES = ['lirio', 'rosa', 'girasol', 'tulipan', 'margarita', 'peonia',
  'clavel', 'orquidea', 'camelia', 'jacinto', 'amarilis', 'ranunculo'];
