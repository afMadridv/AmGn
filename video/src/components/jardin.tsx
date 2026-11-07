import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../theme';
import { Flor } from './base';
import { ESPECIES } from '../flores';

/* El jardín en miniatura, con los mismos materiales que la web: el cielo de
   día, el sol con rayos, las colinas de img/colina-*.svg, el pasto y la
   tierra con piedritas. Las flores brotan una a una desde `brotarDesde`.
   Se adapta al tamaño de su caja: va a pantalla completa o dentro de un
   teléfono o un portátil. */

const POSICIONES = [
  [14, 70], [32, 82], [50, 68], [68, 84], [86, 72], [22, 90],
  [42, 93], [60, 76], [78, 92], [8, 86], [92, 88], [50, 86]
];

export const Jardin: React.FC<{ alto: number; brotarDesde?: number; flores?: number; noche?: boolean }> =
  ({ alto, brotarDesde = 0, flores = 12, noche = false }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const tamFlor = alto * 0.075;
    const giro = frame * 0.25;

    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {/* cielo */}
        <AbsoluteFill style={{
          background: noche
            ? 'linear-gradient(180deg, #0c1536 0%, #1d2a5a 60%, #33407a 100%)'
            : `linear-gradient(180deg, ${C.cielo1} 0%, ${C.cielo2} 45%, ${C.cielo3} 78%, ${C.arena} 100%)`
        }} />
        {/* sol con rayos, como en el jardín */}
        <div style={{ position: 'absolute', left: '68%', top: '9%', width: alto * 0.13, height: alto * 0.13 }}>
          <div style={{ position: 'absolute', inset: '-95%', borderRadius: '50%', transform: `rotate(${giro}deg)`,
                        background: 'repeating-conic-gradient(from 0deg, rgba(255,242,184,.55) 0deg 3deg, transparent 3deg 45deg)',
                        WebkitMaskImage: 'radial-gradient(circle closest-side, transparent 0 36%, #000 40%, transparent 100%)',
                        maskImage: 'radial-gradient(circle closest-side, transparent 0 36%, #000 40%, transparent 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
                        background: 'radial-gradient(circle at 42% 40%, #fffef6 0%, #ffec9e 45%, #ffc857 86%, #f7ae3c 100%)',
                        boxShadow: `0 0 ${alto * 0.03}px ${alto * 0.015}px rgba(255,236,160,.55), 0 0 ${alto * 0.15}px ${alto * 0.06}px rgba(255,238,180,.25)` }} />
        </div>
        {/* nubes */}
        {[[8, 16, 1], [40, 26, .8]].map(([x, y, s], i) => (
          <div key={i} style={{ position: 'absolute', left: `${(x + frame * 0.02 * (i + 1)) % 110 - 5}%`, top: `${y}%`,
                                width: alto * 0.2 * s, height: alto * 0.07 * s, borderRadius: alto,
                                background: 'linear-gradient(180deg, #fff, #e8f1f8)', opacity: .95,
                                boxShadow: `${alto * 0.04 * s}px ${-alto * 0.03 * s}px 0 ${-alto * 0.005}px #fff, ${-alto * 0.035 * s}px ${-alto * 0.015 * s}px 0 ${-alto * 0.012}px #fff` }} />
        ))}
        {/* colinas: las de la web */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: '38%', height: '20%', opacity: .9,
                      backgroundImage: `url(${staticFile('colina-lejos.svg')})`, backgroundSize: 'auto 100%',
                      backgroundRepeat: 'repeat-x', backgroundPosition: 'left bottom' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: '34%', height: '22%',
                      backgroundImage: `url(${staticFile('colina-cerca.svg')})`, backgroundSize: 'auto 100%',
                      backgroundRepeat: 'repeat-x', backgroundPosition: 'left bottom' }} />
        {/* tierra con su pasto */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%',
                      background: `url(${staticFile('piedras.svg')}) left top / ${alto * 0.3}px auto repeat,
                                   linear-gradient(180deg, ${C.pasto} 0, ${C.pastoOsc} ${alto * 0.012}px, #a97147 ${alto * 0.02}px, ${C.tierra} 30%, ${C.tierraOsc} 100%)` }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: -alto * 0.025, height: alto * 0.04,
                        background: `repeating-linear-gradient(90deg, transparent 0 ${alto * 0.006}px, ${C.pasto} ${alto * 0.006}px ${alto * 0.011}px)`,
                        WebkitMaskImage: 'linear-gradient(0deg, #000 30%, transparent)', maskImage: 'linear-gradient(0deg, #000 30%, transparent)' }} />
        </div>
        {/* flores que brotan */}
        {POSICIONES.slice(0, flores).map(([x, y], i) => {
          const p = spring({ frame: frame - brotarDesde - i * 6, fps, config: { damping: 11, mass: 0.7 } });
          const meceo = Math.sin((frame + i * 17) / 30) * 3;
          return (
            <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`,
                                  transform: `translate(-50%, -100%) scale(${p}) rotate(${meceo}deg)`,
                                  transformOrigin: '50% 100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Flor clave={ESPECIES[i % ESPECIES.length]} hue={(i * 47) % 360 * (i % 3 === 0 ? 0 : 1)} tam={tamFlor} />
              <div style={{ width: tamFlor * 0.09, height: tamFlor * 0.55, marginTop: -tamFlor * 0.12,
                            background: 'linear-gradient(90deg, #2f6129, #5c9c47)', borderRadius: tamFlor }} />
            </div>
          );
        })}
        {noche && <AbsoluteFill style={{ background: 'rgba(12,21,54,.35)' }} />}
        {/* un leve oscurecido en los bordes, para dar profundidad */}
        <AbsoluteFill style={{ boxShadow: `inset 0 0 ${alto * 0.12}px rgba(30,20,30,.18)`,
                               opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) }} />
      </AbsoluteFill>
    );
  };
