import React from 'react';
import { AbsoluteFill, getStaticFiles, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, sans, serif, useLayout } from '../theme';
import { Antetitulo, lineal } from '../components/base';
import { Aviso, Portatil, Telefono } from '../components/dispositivos';

/* Escena de recorrido por la interfaz real. Mete una grabación de pantalla
   (el primer video de public/<carpeta>/) dentro de un teléfono o un portátil y le pone
   encima rótulos que salen en el fotograma indicado y avisos push flotantes.
   Si la grabación aún no existe, deja un hueco con el nombre del archivo para
   que el video se pueda montar y revisar antes de grabar. */
export type Rotulo = { desde: number; texto: string };
export type AvisoFlotante = { desde: number; titulo: string; cuerpo: string };

export type RecorridoProps = {
  carpeta: string;              // carpeta en public/, p. ej. 'nota': usa el primer video que haya dentro
  dispositivo: 'telefono' | 'portatil';
  antetitulo: string;
  titulo: string;
  rotulos: Rotulo[];
  avisos?: AvisoFlotante[];
  inicio?: number;              // segundo de la grabación desde el que empieza
  velocidad?: number;
};

// El primer video (mp4/webm/mov) dentro de public/<carpeta>/, sin importar el nombre.
const videoDe = (carpeta: string) =>
  getStaticFiles().map(f => f.name).sort().find(n => n.startsWith(carpeta + '/') && /\.(mp4|webm|mov)$/i.test(n));

const Pantalla: React.FC<{ carpeta: string; inicio: number; velocidad: number }> = ({ carpeta, inicio, velocidad }) => {
  const { fps } = useVideoConfig();
  const archivo = videoDe(carpeta);
  if (archivo) {
    return <OffthreadVideo src={staticFile(archivo)} muted startFrom={Math.round(inicio * fps)} playbackRate={velocidad}
                           style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  return (
    <AbsoluteFill style={{ background: `repeating-linear-gradient(45deg, ${C.rosa1}, ${C.rosa1} 20px, ${C.rosa2} 20px, ${C.rosa2} 40px)`,
                           alignItems: 'center', justifyContent: 'center', fontFamily: sans, color: C.ciruela,
                           textAlign: 'center', padding: 30, fontSize: 28, fontWeight: 600 }}>
      Falta grabación<br /><code style={{ fontSize: 22, opacity: .7 }}>public/{carpeta}/</code>
    </AbsoluteFill>
  );
};

export const Recorrido: React.FC<RecorridoProps> = ({ carpeta, dispositivo, antetitulo, titulo, rotulos, avisos = [], inicio = 0, velocidad = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical } = useLayout();
  const entra = spring({ frame, fps, config: { damping: 16, mass: 0.9 } });

  // Tamaño del aparato: en vertical el teléfono manda; el portátil cabe a lo ancho.
  const anchoTel = (vertical ? 560 : 430) * u;
  const anchoPc = (vertical ? 980 : 1150) * u;
  const aparato = dispositivo === 'telefono'
    ? <Telefono ancho={anchoTel}><Pantalla carpeta={carpeta} inicio={inicio} velocidad={velocidad} /></Telefono>
    : <Portatil ancho={anchoPc} url="jardin-lemon.vercel.app"><Pantalla carpeta={carpeta} inicio={inicio} velocidad={velocidad} /></Portatil>;

  const actual = [...rotulos].reverse().find(r => frame >= r.desde);

  const texto = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 * u, alignItems: vertical ? 'center' : 'flex-start',
                  textAlign: vertical ? 'center' : 'left', maxWidth: vertical ? '100%' : 560 * u }}>
      <Antetitulo texto={antetitulo} />
      <div style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 600, fontSize: (vertical ? 92 : 84) * u,
                    color: C.ciruela, lineHeight: 1 }}>{titulo}</div>
      {actual && (
        <div key={actual.desde} style={{ fontFamily: sans, fontWeight: 600, fontSize: 34 * u, color: '#fff', background: C.acento,
                                          padding: `${12 * u}px ${28 * u}px`, borderRadius: 999,
                                          opacity: lineal(frame, actual.desde, actual.desde + 8),
                                          transform: `translateY(${(1 - lineal(frame, actual.desde, actual.desde + 8)) * 16 * u}px)` }}>
          {actual.texto}
        </div>
      )}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: `radial-gradient(110% 80% at 50% 30%, #fffaf2 0%, ${C.rosa1} 60%, ${C.rosa2} 100%)`,
                           flexDirection: vertical ? 'column' : 'row', alignItems: 'center', justifyContent: 'center',
                           gap: (vertical ? 60 : 110) * u, padding: vertical ? `${130 * u}px ${60 * u}px` : `${60 * u}px ${120 * u}px` }}>
      {vertical && texto}
      <div style={{ transform: `translateY(${(1 - entra) * 200 * u}px) scale(${0.9 + entra * 0.1})`, opacity: entra }}>
        {aparato}
      </div>
      {!vertical && texto}

      {/* avisos push que bajan desde arriba */}
      {avisos.map(a => {
        const p = spring({ frame: frame - a.desde, fps, config: { damping: 14 } });
        const fuera = lineal(frame, a.desde + 75, a.desde + 90);
        if (frame < a.desde || fuera >= 1) return null;
        return (
          <div key={a.desde} style={{ position: 'absolute', top: (vertical ? 60 : 40) * u, left: '50%',
                                      transform: `translate(-50%, ${(p - 1 - fuera) * 260 * u}px)` }}>
            <Aviso ancho={(vertical ? 900 : 760) * u} titulo={a.titulo} cuerpo={a.cuerpo} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
