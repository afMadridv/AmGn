import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, sans, useLayout } from '../theme';

/* El teléfono: proporción de iPhone, marco negro, isla dinámica y barra de
   estado. `ancho` en píxeles; la pantalla se adapta. */
export const Telefono: React.FC<{ ancho: number; children: React.ReactNode; style?: React.CSSProperties; hora?: string }> =
  ({ ancho, children, style, hora = '9:41' }) => {
    const alto = ancho * 2.08;
    const marco = ancho * 0.035;
    const radio = ancho * 0.16;
    return (
      <div style={{ width: ancho, height: alto, borderRadius: radio, background: '#1b1718', padding: marco,
                    boxShadow: `0 ${ancho * 0.08}px ${ancho * 0.2}px rgba(40,25,30,.35), inset 0 0 0 ${ancho * 0.006}px #5a5052`,
                    position: 'relative', ...style }}>
        <div style={{ width: '100%', height: '100%', borderRadius: radio - marco, overflow: 'hidden',
                      position: 'relative', background: C.crema }}>
          {children}
          {/* barra de estado */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ancho * 0.12,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: `0 ${ancho * 0.09}px`, fontFamily: sans, fontWeight: 700,
                        fontSize: ancho * 0.045, color: '#1d1a1b', zIndex: 20 }}>
            <span>{hora}</span>
            <span style={{ display: 'flex', gap: ancho * 0.015, alignItems: 'center' }}>
              {[0.35, 0.55, 0.75, 1].map((h, i) => (
                <i key={i} style={{ width: ancho * 0.012, height: ancho * 0.03 * h, background: '#1d1a1b', borderRadius: 2 }} />
              ))}
              <i style={{ width: ancho * 0.065, height: ancho * 0.03, border: `${ancho * 0.004}px solid #1d1a1b`,
                          borderRadius: ancho * 0.008, marginLeft: ancho * 0.015, position: 'relative' }}>
                <b style={{ position: 'absolute', inset: ancho * 0.004, right: '30%', background: '#1d1a1b', borderRadius: 2 }} />
              </i>
            </span>
          </div>
          {/* isla dinámica */}
          <div style={{ position: 'absolute', top: ancho * 0.03, left: '50%', width: ancho * 0.3, height: ancho * 0.085,
                        transform: 'translateX(-50%)', background: '#0d0b0c', borderRadius: ancho * 0.05, zIndex: 21 }} />
        </div>
      </div>
    );
  };

/* El portátil: navegador con su barra y la dirección, y la base. */
export const Portatil: React.FC<{ ancho: number; children: React.ReactNode; style?: React.CSSProperties; url: string }> =
  ({ ancho, children, style, url }) => {
    const alto = ancho * 0.62;
    const borde = ancho * 0.018;
    const barra = ancho * 0.04;
    return (
      <div style={{ width: ancho, position: 'relative', ...style }}>
        <div style={{ width: ancho, height: alto, background: '#1b1718', borderRadius: ancho * 0.022, padding: borde,
                      boxShadow: `0 ${ancho * 0.04}px ${ancho * 0.08}px rgba(40,25,30,.3)` }}>
          <div style={{ width: '100%', height: '100%', borderRadius: ancho * 0.008, overflow: 'hidden',
                        background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: barra, background: '#f1ebe8', display: 'flex', alignItems: 'center',
                          gap: barra * 0.22, padding: `0 ${barra * 0.4}px`, flex: 'none' }}>
              {['#ff6159', '#ffbd2e', '#28c941'].map(c => (
                <i key={c} style={{ width: barra * 0.26, height: barra * 0.26, borderRadius: '50%', background: c }} />
              ))}
              <div style={{ marginLeft: barra * 0.5, flex: 1, height: barra * 0.6, borderRadius: barra * 0.3,
                            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: sans, fontSize: barra * 0.32, color: C.tintaSuave, gap: barra * 0.15 }}>
                <svg viewBox="0 0 12 14" width={barra * 0.24} height={barra * 0.28}>
                  <rect x="1" y="6" width="10" height="7.5" rx="1.6" fill={C.tintaSuave} />
                  <path d="M3.4,6 V4.4 a2.6,2.6 0 0 1 5.2,0 V6" fill="none" stroke={C.tintaSuave} strokeWidth="1.5" />
                </svg>{url}
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
          </div>
        </div>
        <div style={{ width: ancho * 1.12, height: ancho * 0.03, marginLeft: -ancho * 0.06,
                      background: 'linear-gradient(180deg, #d9d2cf, #9b908c)',
                      borderRadius: `0 0 ${ancho * 0.03}px ${ancho * 0.03}px` }} />
      </div>
    );
  };

/* El aviso, tal como llega al iPhone desde api/avisar.js: ícono de la app,
   nombre, "ahora", título en negrita y el cuerpo. */
export const Aviso: React.FC<{ titulo: string; cuerpo: string; ancho: number; style?: React.CSSProperties; hace?: string }> =
  ({ titulo, cuerpo, ancho, style, hace = 'ahora' }) => {
    const { u } = useLayout();
    const t = ancho / 640;
    return (
      <div style={{ width: ancho, display: 'flex', gap: 18 * t, padding: `${20 * t}px ${22 * t}px`,
                    background: 'rgba(250,247,248,.86)', border: `${1.5 * u}px solid rgba(255,255,255,.9)`,
                    borderRadius: 34 * t, boxShadow: `0 ${18 * t}px ${44 * t}px rgba(40,25,30,.22)`,
                    fontFamily: sans, color: '#1d1a1b', ...style }}>
        <Img src={staticFile('icono-180.png')} style={{ width: 76 * t, height: 76 * t, borderRadius: 18 * t, flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22 * t, color: '#7c7477',
                        fontWeight: 600, letterSpacing: '.04em', marginBottom: 4 * t }}>
            <span>JARDÍN</span><span>{hace}</span>
          </div>
          <div style={{ fontSize: 30 * t, fontWeight: 700, lineHeight: 1.2 }}>{titulo}</div>
          <div style={{ fontSize: 27 * t, lineHeight: 1.3, color: '#3e3a3c' }}>{cuerpo}</div>
        </div>
      </div>
    );
  };
