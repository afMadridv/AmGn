import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, DATOS, sans, serif, useLayout } from '../theme';
import { Flor, lineal, useEntrada, useFlotar } from '../components/base';
import { ESPECIES } from '../flores';

/* 8. Cierre: el ícono de la app, el nombre, la dirección y la firma. Las
   flores caen alrededor como pétalos. */
export const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { u, vertical, height } = useLayout();
  const icono = useEntrada(6, { damping: 11, mass: 0.8 });
  const flota = useFlotar(10 * u, 120);
  const sale = lineal(frame, 180, 210);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 10%, ${C.rosa1} 0%, ${C.rosa2} 45%, ${C.lila} 100%)`,
                           alignItems: 'center', justifyContent: 'center', gap: 30 * u, opacity: 1 - sale }}>
      {/* lluvia de flores */}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = (i * 137) % 100;
        const v = 2.2 + (i % 4) * 0.6;
        const y = ((frame * v + i * 160) % (height + 300)) - 150;
        return (
          <div key={i} style={{ position: 'absolute', left: `${x}%`, top: y, opacity: .55,
                                transform: `rotate(${frame * (i % 2 ? 1.5 : -1.2) + i * 40}deg)` }}>
            <Flor clave={ESPECIES[i % ESPECIES.length]} hue={(i * 61) % 360} tam={(50 + (i % 3) * 22) * u} />
          </div>
        );
      })}

      <div style={{ transform: `translateY(${flota}px) scale(${icono}) rotate(${(1 - icono) * -20}deg)` }}>
        <Img src={staticFile('icono-512.png')}
             style={{ width: 300 * u, height: 300 * u, borderRadius: 300 * u * 0.225,
                      boxShadow: `0 ${30 * u}px ${70 * u}px rgba(90,55,75,.35)` }} />
      </div>
      <div style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 600, fontSize: (vertical ? 140 : 130) * u,
                    color: C.ciruela, opacity: lineal(frame, 20, 40), transform: `translateY(${(1 - lineal(frame, 20, 40)) * 30 * u}px)` }}>
        {DATOS.proyecto}
      </div>
      <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 34 * u, color: '#fff', background: C.acento,
                    padding: `${14 * u}px ${34 * u}px`, borderRadius: 999, opacity: lineal(frame, 45, 60),
                    boxShadow: `0 ${10 * u}px ${24 * u}px rgba(185,89,117,.35)` }}>
        {DATOS.url}
      </div>
      <div style={{ fontFamily: sans, fontSize: 30 * u, color: '#7d6270', marginTop: 20 * u, opacity: lineal(frame, 70, 90),
                    textAlign: 'center' }}>
        {DATOS.autor} · {DATOS.rol}
      </div>
    </AbsoluteFill>
  );
};
