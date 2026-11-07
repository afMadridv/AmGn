import React from 'react';
import { Composition } from 'remotion';
import { DURACION, FPS, Reel } from './Video';

/* Dos formatos del mismo video. Las escenas miran el tamaño (useLayout) y
   se reorganizan solas: en vertical apilan, en horizontal reparten. */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} defaultProps={{ vertical: true }}
                 durationInFrames={DURACION} fps={FPS} width={1080} height={1920} />
    <Composition id="Wide" component={Reel} defaultProps={{ vertical: false }}
                 durationInFrames={DURACION} fps={FPS} width={1920} height={1080} />
  </>
);
