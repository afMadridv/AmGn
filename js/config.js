/* ==========================================================================
   CONFIGURACIÓN
   --------------------------------------------------------------------------
   1. Pega aquí la URL y la clave "anon / publishable" de tu proyecto Supabase.
      Supabase → Project Settings → API.
   2. La anon key es PÚBLICA por diseño: lo que protege los datos es el RLS
      definido en sql/schema.sql. Nunca pongas aquí la service_role key.
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

  // Tintes que se aplican a la flor (filtro CSS hue-rotate)
  COLORES: [
    { nombre: 'natural',  hue: 0   },
    { nombre: 'rosa',     hue: 320 },
    { nombre: 'lila',     hue: 260 },
    { nombre: 'azul',     hue: 200 },
    { nombre: 'menta',    hue: 140 },
    { nombre: 'ámbar',    hue: 40  }
  ]
};
