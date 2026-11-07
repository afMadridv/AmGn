import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, sans, serif, useLayout } from '../theme';
import { Destapar, Flor, lineal, useEntrada } from '../components/base';

/* 2. La idea en tres golpes de tipografía. Cada frase entra destapándose y
   una flor real del jardín le hace de punto. */
const FRASES: { a: string; b: string; flor: string; hue: number }[] = [
  { a: 'Cada nota', b: 'florece.', flor: 'lirio', hue: 0 },
  { a: 'En tiempo', b: 'real.', flor: 'girasol', hue: 0 },
  { a: 'Como una app', b: 'de verdad.', flor: 'tulipan', hue: 300 }
];
const CADA = 62;

export const Concepto: React.FC = () => {
  const frame = useCurrentFrame();
  const { u, vertical } = useLayout();
  const tam = (vertical ? 150 : 140) * u;

  return (
    <AbsoluteFill style={{ background: C.crema, justifyContent: 'center', padding: `0 ${(vertical ? 90 : 180) * u}px` }}>
      {/* rejilla de puntos de fondo, muy tenue */}
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(${C.acento}22 ${2 * u}px, transparent ${2.4 * u}px)`,
                             backgroundSize: `${40 * u}px ${40 * u}px`, opacity: .7 }} />
      {FRASES.map((f, i) => {
        const desde = i * CADA;
        const sale = lineal(frame, desde + CADA - 6, desde + CADA + 6);
        const visible = frame >= desde - 2 && (i === FRASES.length - 1 || sale < 1);
        if (!visible) return null;
        return <Frase key={i} f={f} desde={desde} tam={tam} sale={i === FRASES.length - 1 ? 0 : sale} u={u} />;
      })}
      {/* barra de progreso de las tres ideas */}
      <div style={{ position: 'absolute', bottom: 120 * u, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 14 * u }}>
        {FRASES.map((_, i) => (
          <i key={i} style={{ width: (frame >= i * CADA ? 60 : 18) * u, height: 10 * u, borderRadius: 10 * u,
                              background: frame >= i * CADA ? C.acento : '#e6d8d2' }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Frase: React.FC<{ f: typeof FRASES[number]; desde: number; tam: number; sale: number; u: number }> =
  ({ f, desde, tam, sale, u }) => {
    const flor = useEntrada(desde + 18, { damping: 9, mass: 0.6 });
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center',
                             opacity: 1 - sale, transform: `translateY(${-sale * 80 * u}px)` }}>
        <Destapar desde={desde}>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: tam, color: C.tinta, letterSpacing: '-.02em', lineHeight: 1 }}>{f.a}</div>
        </Destapar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 * u }}>
          <Destapar desde={desde + 8}>
            <div style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 600, fontSize: tam * 1.1, color: C.acento, lineHeight: 1.1 }}>{f.b}</div>
          </Destapar>
          <div style={{ transform: `scale(${flor}) rotate(${(1 - flor) * -90}deg)` }}>
            <Flor clave={f.flor} hue={f.hue} tam={tam * 0.9} />
          </div>
        </div>
      </AbsoluteFill>
    );
  };
