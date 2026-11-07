import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, DATOS, sans, useLayout } from '../theme';
import { lineal, TituloLetras, useEntrada, useFlotar } from '../components/base';
import { ramoSvg } from '../flores';

/* 1. Portada: el ramo de lirios de la web, el nombre en grande y el lema.
   El fondo es el degradado rosa de la portada del jardín. */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { u, vertical } = useLayout();
  const ramo = useEntrada(4, { damping: 16, mass: 1 });
  const flota = useFlotar(12 * u, 150);
  const halo = 1 + Math.sin(frame / 22) * 0.05;
  const ancho = (vertical ? 760 : 560) * u;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 10%, ${C.rosa1} 0%, ${C.rosa2} 45%, ${C.lila} 100%)`,
                           alignItems: 'center', justifyContent: 'center',
                           flexDirection: vertical ? 'column' : 'row', gap: (vertical ? 20 : 60) * u }}>
      <div style={{ position: 'relative', width: ancho, height: ancho * 1.1,
                    transform: `translateY(${flota + (1 - ramo) * 120 * u}px) scale(${0.7 + ramo * 0.3})`, opacity: ramo }}>
        <div style={{ position: 'absolute', inset: '-10%', borderRadius: '50%', transform: `scale(${halo})`,
                      background: 'radial-gradient(circle, rgba(255,255,255,.95), rgba(255,255,255,0) 66%)' }} />
        <div style={{ position: 'absolute', inset: 0 }} dangerouslySetInnerHTML={{ __html: ramoSvg() }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: vertical ? 'center' : 'flex-start', gap: 24 * u,
                    maxWidth: (vertical ? 980 : 900) * u }}>
        <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 26 * u, letterSpacing: '.3em', color: '#96707f',
                      opacity: lineal(frame, 20, 40) }}>PORTAFOLIO · PROYECTO WEB</div>
        <TituloLetras texto={DATOS.proyecto} desde={22} tam={(vertical ? 150 : 170) * u} paso={2.5} />
        <div style={{ fontFamily: sans, fontSize: 40 * u, color: '#7d6270', textAlign: vertical ? 'center' : 'left',
                      opacity: lineal(frame, 70, 95), transform: `translateY(${(1 - lineal(frame, 70, 95)) * 20 * u}px)` }}>
          {DATOS.lema}
        </div>
      </div>
    </AbsoluteFill>
  );
};
