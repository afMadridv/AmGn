import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, sans, serif, useLayout } from '../theme';
import { Destapar, lineal } from '../components/base';

/* 7. Cómo está hecho: las piezas reales del proyecto, en fichas que caen. */
const PIEZAS = [
  ['Supabase', 'base de datos y sesiones'],
  ['Realtime', 'lo del otro aparece al momento'],
  ['Row-Level Security', 'cada fila, de quien es'],
  ['Web Push + VAPID', 'avisos cifrados al teléfono'],
  ['PWA', 'instalable, sin barra de Safari'],
  ['Vercel Functions', 'APIs sin servidor propio'],
  ['SVG generativo', 'cada flor dibujada en código'],
  ['Web Audio', 'el sonido se genera en vivo']
];

export const Tecnologia: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical } = useLayout();

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #2b2240 0%, #3d2a4a 50%, #5a3550 100%)`,
                           padding: vertical ? `${150 * u}px ${70 * u}px` : `${100 * u}px ${130 * u}px`,
                           alignItems: 'center', justifyContent: 'center', gap: 50 * u }}>
      <Destapar desde={0}>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: (vertical ? 74 : 80) * u, color: '#fff', textAlign: 'center', lineHeight: 1.05 }}>
          Hecho a mano, <span style={{ fontFamily: serif, fontStyle: 'italic', color: '#ffb3c8' }}>sin frameworks</span>
        </div>
      </Destapar>
      <div style={{ display: 'grid', gridTemplateColumns: vertical ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 22 * u, width: '100%' }}>
        {PIEZAS.map(([t, d], i) => {
          const p = spring({ frame: frame - 14 - i * 6, fps, config: { damping: 12, mass: 0.6 } });
          return (
            <div key={t} style={{ background: 'rgba(255,255,255,.08)', border: `${1.5 * u}px solid rgba(255,255,255,.16)`,
                                  borderRadius: 24 * u, padding: `${26 * u}px ${24 * u}px`, fontFamily: sans,
                                  opacity: p, transform: `translateY(${(1 - p) * -80 * u}px) rotate(${(1 - p) * (i % 2 ? 6 : -6)}deg)` }}>
              <div style={{ width: 14 * u, height: 14 * u, borderRadius: '50%', marginBottom: 14 * u,
                            background: ['#ffb3c8', '#ffd23f', '#9fd3ee', '#b8f040'][i % 4] }} />
              <div style={{ fontWeight: 700, fontSize: 32 * u, color: '#fff' }}>{t}</div>
              <div style={{ fontSize: 22 * u, color: 'rgba(255,255,255,.7)', marginTop: 6 * u }}>{d}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: sans, fontSize: 26 * u, color: 'rgba(255,255,255,.7)', opacity: lineal(frame, 80, 100),
                    letterSpacing: '.08em' }}>
        HTML · CSS · JavaScript — sin paso de build
      </div>
    </AbsoluteFill>
  );
};
