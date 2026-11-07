import React from 'react';
import { AbsoluteFill } from 'remotion';
import { linearTiming, springTiming, TransitionSeries } from '@remotion/transitions';
import type { TransitionPresentation, TransitionTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { Intro } from './scenes/Intro';
import { Concepto } from './scenes/Concepto';
import { JardinVivo } from './scenes/JardinVivo';
import { Recorrido } from './scenes/Recorrido';
import type { RecorridoProps } from './scenes/Recorrido';
import { Tecnologia } from './scenes/Tecnologia';
import { Cierre } from './scenes/Cierre';

/* La secuencia completa. Las duraciones van en fotogramas a 30 fps; cada
   transición se come TRANSICION fotogramas de las dos escenas que une, así
   que el total es la suma de las escenas menos las transiciones. */
export const FPS = 30;
const TRANSICION = 20;

/* Recorridos por la interfaz real: cada uno es una grabación de pantalla en
   public/<carpeta>/ (portada, nota, portal, extras). Los fotogramas de rótulos y avisos son locales a la
   escena. Ver GUION.md para qué grabar en cada archivo. */
const rec = (p: RecorridoProps): React.FC => () => <Recorrido {...p} />;

const PORTADA = rec({
  carpeta: 'portada', dispositivo: 'telefono',
  antetitulo: 'Ella abre el enlace', titulo: 'Un ramo que se abre',
  rotulos: [{ desde: 10, texto: 'Sin cuenta, sin app' }, { desde: 80, texto: 'Toca el ramo' }, { desde: 170, texto: 'Y entra al jardín' }]
});
const NOTA = rec({
  carpeta: 'nota', dispositivo: 'telefono',
  antetitulo: 'Cada flor es una nota', titulo: 'Leer, querer, responder',
  rotulos: [{ desde: 10, texto: 'Toca una flor' }, { desde: 70, texto: 'Dale corazón' }, { desde: 130, texto: 'Deja un comentario' }],
  velocidad: 1.4,
  avisos: [{ desde: 90, titulo: 'Le gustó tu flor', cuerpo: 'Gabriela le dio corazón a «Lirio de octubre»' },
           { desde: 200, titulo: 'Nuevo comentario', cuerpo: '«Me encantó, gracias»' }]
});
const PORTAL = rec({
  carpeta: 'portal', dispositivo: 'portatil',
  antetitulo: 'Él escribe desde el portal', titulo: 'Sembrar una flor',
  rotulos: [{ desde: 10, texto: 'Portal escondido' }, { desde: 60, texto: 'Escribe la nota' }, { desde: 200, texto: 'Brota en vivo en su teléfono' }],
  velocidad: 1.35,
  avisos: [{ desde: 230, titulo: 'Brotó una flor nueva', cuerpo: 'Tienes una nota esperándote en el jardín' }]
});
const EXTRAS = rec({
  carpeta: 'extras', dispositivo: 'portatil',
  antetitulo: 'Un jardín con vida', titulo: 'Detalles que juegan',
  rotulos: [{ desde: 5, texto: 'De noche, con estrellas' }, { desde: 35, texto: 'El libro de todas las notas' },
            { desde: 105, texto: 'Música compartida' }, { desde: 175, texto: 'El patico caza bichos' }],
  velocidad: 1.4
});

const ESCENAS = [
  { id: 'intro', dur: 180, C: Intro },
  { id: 'concepto', dur: 200, C: Concepto },
  { id: 'portada', dur: 300, C: PORTADA },
  { id: 'jardin', dur: 270, C: JardinVivo },
  { id: 'nota', dur: 360, C: NOTA },
  { id: 'portal', dur: 360, C: PORTAL },
  { id: 'extras', dur: 330, C: EXTRAS },
  { id: 'tecnologia', dur: 210, C: Tecnologia },
  { id: 'cierre', dur: 220, C: Cierre }
];

export const DURACION = ESCENAS.reduce((t, e) => t + e.dur, 0) - TRANSICION * (ESCENAS.length - 1);

// Una transición distinta para cada cambio, sin repetir dos seguidas.
// El tipo se ensancha a propósito: cada presentación tiene sus props, y
// TransitionSeries.Transition sólo necesita saber que es una presentación.
type Transicion = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presentation: TransitionPresentation<any>;
  timing: TransitionTiming;
};
const transicion = (i: number, vertical: boolean): Transicion => {
  const t = springTiming({ config: { damping: 200 }, durationInFrames: TRANSICION });
  const l = linearTiming({ durationInFrames: TRANSICION });
  switch (i % 4) {
    case 0: return { presentation: fade(), timing: l };
    case 1: return { presentation: slide({ direction: vertical ? 'from-bottom' : 'from-right' }), timing: t };
    case 2: return { presentation: wipe({ direction: vertical ? 'from-top' : 'from-left' }), timing: t };
    default: return { presentation: slide({ direction: vertical ? 'from-right' : 'from-bottom' }), timing: t };
  }
};

export const Reel: React.FC<{ vertical: boolean }> = ({ vertical }) => (
  <AbsoluteFill style={{ background: '#fffaf2' }}>
    {/* El ramo de flores-svg.js trae su SVG sin tamaño: que llene su caja. */}
    <style>{'.ramo-svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 12px 18px rgba(150,110,130,.22)); }'}</style>
    <TransitionSeries>
      {ESCENAS.flatMap((e, i) => {
        const piezas = [
          <TransitionSeries.Sequence key={e.id} durationInFrames={e.dur}>
            <e.C />
          </TransitionSeries.Sequence>
        ];
        if (i < ESCENAS.length - 1) {
          const tr = transicion(i, vertical);
          piezas.push(<TransitionSeries.Transition key={e.id + '-t'} presentation={tr.presentation} timing={tr.timing} />);
        }
        return piezas;
      })}
    </TransitionSeries>
  </AbsoluteFill>
);
