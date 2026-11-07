import { loadFont as cargarSerif } from '@remotion/google-fonts/CormorantGaramond';
import { loadFont as cargarSans } from '@remotion/google-fonts/Quicksand';
import { useVideoConfig } from 'remotion';

// Las mismas tipografías del jardín (index.html las pide a Google Fonts).
export const serif = cargarSerif('italic', { weights: ['400', '600', '700'], subsets: ['latin', 'latin-ext'] }).fontFamily;
export const sans = cargarSans('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin', 'latin-ext'] }).fontFamily;

// La paleta de css/estilos.css.
export const C = {
  crema: '#fffaf2',
  tinta: '#3c3230',
  tintaSuave: '#7a6a63',
  acento: '#d8748f',
  acentoOsc: '#b95975',
  rosa1: '#fff6fa',
  rosa2: '#fdeef2',
  lila: '#efe4f3',
  ciruela: '#6b4a58',
  cielo1: '#5eaede',
  cielo2: '#9fd3ee',
  cielo3: '#d8efe9',
  arena: '#fbeccb',
  pasto: '#74b56a',
  pastoOsc: '#4f9350',
  tierra: '#8a5a3b',
  tierraOsc: '#6d452c',
  noche: '#0c1536'
};

// Lo que cambia de un video a otro. Edítalo aquí.
export const DATOS = {
  autor: 'Andrés Madrid',
  rol: 'Diseño y desarrollo',
  url: 'jardin-lemon.vercel.app',
  proyecto: 'Para Gabriela',
  lema: 'Un jardín donde cada flor es una nota'
};

/* Una sola unidad para los dos formatos: `u` vale 1 cuando el lado corto
   mide 1080 px (pasa en 1080×1920 y en 1920×1080). Todo se mide en `u`, y
   `vertical` decide la disposición. */
export function useLayout() {
  const { width, height } = useVideoConfig();
  return { vertical: height > width, u: Math.min(width, height) / 1080, width, height };
}

// Una sombra larga y suave, la de las tarjetas del jardín.
export const sombra = (u: number) => `0 ${24 * u}px ${60 * u}px rgba(60, 40, 35, .22)`;
