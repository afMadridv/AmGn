import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, sans, serif, useLayout } from '../theme';
import { Contador, Destapar, Tarjeta, lineal, useEntrada, useFlotar } from '../components/base';
import { Jardin } from '../components/jardin';

/* 3. El jardín a pantalla completa: las flores brotan una a una y unas
   tarjetas de cristal cuentan lo que pasa en él. */
const CIFRAS = [
  { etiqueta: 'Flores sembradas', hasta: 48, desde: 40 },
  { etiqueta: 'Días de jardín', hasta: 412, desde: 70 },
  { etiqueta: 'Comentarios', hasta: 126, desde: 100 }
];

export const JardinVivo: React.FC = () => {
  const frame = useCurrentFrame();
  const { u, vertical, height } = useLayout();
  const zoom = 1.08 - lineal(frame, 0, 330) * 0.08;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Jardin alto={height} brotarDesde={20} />
      </AbsoluteFill>

      <AbsoluteFill style={{ padding: vertical ? `${170 * u}px ${70 * u}px` : `${110 * u}px ${120 * u}px`,
                             flexDirection: 'column', gap: 26 * u }}>
        <Destapar desde={6}>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 600, fontSize: (vertical ? 96 : 104) * u,
                        color: '#fff', textShadow: `0 ${4 * u}px ${24 * u}px rgba(30,40,60,.35)`, lineHeight: 1 }}>
            El jardín vivo
          </div>
        </Destapar>
        <div style={{ display: 'flex', flexDirection: vertical ? 'row' : 'column', flexWrap: 'wrap', gap: 22 * u,
                      marginTop: 10 * u, maxWidth: vertical ? '100%' : 460 * u }}>
          {CIFRAS.map((c, i) => <Cifra key={c.etiqueta} {...c} i={i} u={u} vertical={vertical} />)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Cifra: React.FC<{ etiqueta: string; hasta: number; desde: number; i: number; u: number; vertical: boolean }> =
  ({ etiqueta, hasta, desde, i, u, vertical }) => {
    const p = useEntrada(desde - 15);
    const flota = useFlotar(6 * u, 110, i * 30);
    return (
      <Tarjeta vidrio style={{ padding: `${22 * u}px ${30 * u}px`, opacity: p,
                               transform: `translateY(${(1 - p) * 60 * u + flota}px)`,
                               flex: vertical ? '1 1 280px' : undefined }}>
        <div style={{ fontFamily: sans, fontSize: 24 * u, fontWeight: 600, color: C.tintaSuave, letterSpacing: '.06em',
                      textTransform: 'uppercase' }}>{etiqueta}</div>
        <Contador hasta={hasta} desde={desde} duracion={70} tam={78 * u} color={C.acentoOsc} />
      </Tarjeta>
    );
  };
