/* ==========================================================================
   CONFIGURACIÓN
   --------------------------------------------------------------------------
   1. Pega aquí la URL y la clave "anon / publishable" de tu proyecto Supabase.
      Supabase → Project Settings → API.
   2. La anon key es PÚBLICA por diseño: lo que protege los datos es el RLS
      definido en sql/instalar.sql. Nunca pongas aquí la service_role key.
   3. Si dejas SUPABASE_ANON_KEY vacío, la app cae automáticamente a
      localStorage (modo demo, sin tiempo real).
   ========================================================================== */
window.CONFIG = {
  SUPABASE_URL: 'https://eqrqivulqqlsahrklpjk.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_jXWtaStTYjSy7dqM7Aifrg_8bkpQPLq',

  // Nombre que aparece en la portada
  PARA: 'Gabriela',

  // Playlist de Spotify que suena de fondo. Es el id que va en la URL:
  // open.spotify.com/playlist/<ESTO>. Se lee en vivo: si añades canciones,
  // aparecen solas. Déjalo vacío para quitar la música.
  SPOTIFY_PLAYLIST: '5apAsWV4L4WxUgIY96jwGn',

  // El catálogo de flores vive en js/flores-svg.js (FloresSVG.ESPECIES):
  // están dibujadas en vector, no son emojis. Para añadir una especie nueva,
  // agrega una entrada a ese archivo.

  // Tintes de la flor. El número es el giro de tono que se aplica dentro del
  // dibujo; el color final depende también de la especie, así que un mismo
  // tinte no se ve igual en una rosa que en un girasol.
  COLORES: [
    { nombre: 'natural',   hue: 0   },
    { nombre: 'coral',     hue: 20  },
    { nombre: 'ámbar',     hue: 40  },
    { nombre: 'dorado',    hue: 60  },
    { nombre: 'lima',      hue: 90  },
    { nombre: 'verde',     hue: 120 },
    { nombre: 'menta',     hue: 150 },
    { nombre: 'turquesa',  hue: 175 },
    { nombre: 'celeste',   hue: 195 },
    { nombre: 'azul',      hue: 215 },
    { nombre: 'índigo',    hue: 240 },
    { nombre: 'lila',      hue: 265 },
    { nombre: 'violeta',   hue: 285 },
    { nombre: 'magenta',   hue: 305 },
    { nombre: 'rosa',      hue: 325 },
    { nombre: 'frambuesa', hue: 345 }
  ],

  // Fotos en las notas. Necesita el bucket de Supabase Storage creado con
  // sql/instalar.sql. Si no existe, la app sigue funcionando sin fotos.
  BUCKET_FOTOS: 'notas',
  FOTO_MAX_LADO: 1600,   // se reescala antes de subir, para no gastar datos
  FOTO_CALIDAD: 0.82
};
