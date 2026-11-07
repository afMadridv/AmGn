import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// H.264 con buena calidad para redes: CRF bajo = más calidad.
Config.setCodec('h264');
Config.setCrf(18);
