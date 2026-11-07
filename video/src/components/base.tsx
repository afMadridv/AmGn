import React from 'react';
import { Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, sans, serif, sombra, useLayout } from '../theme';
import { florSrc } from '../flores';

/* ---------------------------------------------------------- animación --- */
// Entrada con muelle a partir de `desde` (fotogramas). 0 → 1.
export function useEntrada(desde = 0, config = { damping: 14, mass: 0.8 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - desde, fps, config });
}

// Flotar: un vaivén lento para que nada se vea pegado a la pantalla.
export function useFlotar(amplitud = 10, periodo = 120, fase = 0) {
  const frame = useCurrentFrame();
  return Math.sin(((frame + fase) / periodo) * Math.PI * 2) * amplitud;
}

export const lineal = (f: number, a: number, b: number, de = 0, a2 = 1) =>
  interpolate(f, [a, b], [de, a2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const suave = (f: number, a: number, b: number, de = 0, hasta = 1) =>
  interpolate(f, [a, b], [de, hasta], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)
  });

/* -------------------------------------------------------------- flores -- */
export const Flor: React.FC<{ clave: string; hue?: number; tam: number; style?: React.CSSProperties }> =
  ({ clave, hue = 0, tam, style }) => (
    <Img src={florSrc(clave, hue)} style={{ width: tam, height: tam, display: 'block', ...style }} />
  );

/* ------------------------------------------------------------- texto ---- */
// Título que entra letra a letra desde abajo.
export const TituloLetras: React.FC<{
  texto: string; desde?: number; tam: number; color?: string; familia?: string; peso?: number; paso?: number;
}> = ({ texto, desde = 0, tam, color = C.ciruela, familia = serif, peso = 600, paso = 2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontFamily: familia, fontWeight: peso, fontStyle: familia === serif ? 'italic' : 'normal',
                  fontSize: tam, color, lineHeight: 1.05, whiteSpace: 'pre', display: 'flex', justifyContent: 'center' }}>
      {[...texto].map((ch, i) => {
        const p = spring({ frame: frame - desde - i * paso, fps, config: { damping: 13, mass: 0.6 } });
        return (
          <span key={i} style={{ display: 'inline-block', opacity: p,
                                 transform: `translateY(${(1 - p) * tam * 0.5}px) rotate(${(1 - p) * 8}deg)` }}>
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
    </div>
  );
};

// Texto que se destapa de abajo hacia arriba (máscara).
export const Destapar: React.FC<{ desde: number; children: React.ReactNode; style?: React.CSSProperties }> =
  ({ desde, children, style }) => {
    const frame = useCurrentFrame();
    const p = suave(frame, desde, desde + 22);
    return (
      <div style={{ overflow: 'hidden', ...style }}>
        <div style={{ transform: `translateY(${(1 - p) * 110}%)`, opacity: lineal(frame, desde, desde + 8) }}>
          {children}
        </div>
      </div>
    );
  };

/* ------------------------------------------------------------ tarjeta --- */
export const Tarjeta: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; vidrio?: boolean }> =
  ({ children, style, vidrio }) => {
    const { u } = useLayout();
    return (
      <div style={{
        background: vidrio ? 'rgba(255,255,255,.72)' : C.crema,
        border: vidrio ? `${1.5 * u}px solid rgba(255,255,255,.85)` : 'none',
        borderRadius: 28 * u, boxShadow: sombra(u), padding: 28 * u, fontFamily: sans, color: C.tinta,
        ...style
      }}>{children}</div>
    );
  };

/* ----------------------------------------------------------- contador --- */
export const Contador: React.FC<{ hasta: number; desde: number; duracion?: number; tam: number; color?: string; sufijo?: string }> =
  ({ hasta, desde, duracion = 60, tam, color = C.tinta, sufijo = '' }) => {
    const frame = useCurrentFrame();
    const v = interpolate(frame, [desde, desde + duracion], [0, hasta], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
    });
    return (
      <span style={{ fontFamily: sans, fontWeight: 700, fontSize: tam, color, fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(v).toLocaleString('es-CO')}{sufijo}
      </span>
    );
  };

/* ------------------------------------------------- etiqueta de escena --- */
export const Antetitulo: React.FC<{ texto: string; desde?: number; color?: string }> = ({ texto, desde = 0, color = C.acento }) => {
  const { u } = useLayout();
  const p = useEntrada(desde);
  return (
    <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 26 * u, letterSpacing: '.22em',
                  textTransform: 'uppercase', color, opacity: p, transform: `translateY(${(1 - p) * 20 * u}px)` }}>
      {texto}
    </div>
  );
};
