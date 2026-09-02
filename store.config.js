// store.config.js
// ─────────────────────────────────────────────────────────
// Única fuente de verdad de "qué tienda es esta". Todo sale
// de variables de entorno. Este archivo NO cambia entre
// tiendas: lo que cambia es el .env / .env.local de cada una.
// ─────────────────────────────────────────────────────────
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[store.config] Falta la variable de entorno "${name}". Revisa tu .env.local (usa .env.example como guía).`
    );
  }
  return value;
}

function parseCategories(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) throw new Error('no es un array');
    return parsed;
  } catch (e) {
    console.error('[store.config] STORE_CATEGORIES mal formado, usando lista vacía:', e.message);
    return [];
  }
}

export const storeConfig = {
  nombre: process.env.STORE_NAME || 'Mi Tienda',
  slug: process.env.STORE_SLUG || 'mi-tienda',
  slogan: process.env.STORE_SLOGAN || '',
  logo: process.env.STORE_LOGO_PATH || '/logo.png',
  colores: {
    primario: process.env.STORE_COLOR_PRIMARY || '#0f766e',
    acento: process.env.STORE_COLOR_ACCENT || '#f59e0b',
    // Opcional: degradado del header en vez de color plano, ej:
    // "linear-gradient(135deg, #1a3d2b 0%, #2d6a4f 100%)". Si se deja
    // vacío, el header usa "primario" como color sólido de siempre.
    headerGradiente: process.env.STORE_HEADER_GRADIENT || '',
  },
  // Tipografías del tema (opcional). Si se deja vacío, usa la fuente del
  // sistema como hasta ahora. "fuenteGoogleUrl" es el link de Google Fonts
  // que carga las fuentes elegidas (ver temas/CATALOGO-DE-TEMAS.md).
  fuenteTitulo: process.env.STORE_FONT_TITULO || '',
  fuenteCuerpo: process.env.STORE_FONT_BODY || '',
  fuenteGoogleUrl: process.env.STORE_FONT_GOOGLE_URL || '',
  // wa.me exige el número SOLO con dígitos (sin "+", espacios ni guiones).
  // Si alguien lo escribe como "+52 998 323 8891" en el .env, esto lo
  // limpia solo — así nunca se rompe el link por un error de formato.
  whatsapp: (process.env.STORE_WHATSAPP || '').replace(/[^0-9]/g, ''),
  email: process.env.STORE_EMAIL || '',
  facebook: process.env.STORE_FACEBOOK || '',
  direccion: process.env.STORE_ADDRESS || '',
  horario: process.env.STORE_SCHEDULE || '',
  mostrarTasaCambio: (process.env.STORE_SHOW_EXCHANGE_RATE || 'false').toLowerCase() === 'true',

  // Para tiendas que NO manejan USD en absoluto: el precio que cargan en
  // el admin ya ES el valor en CUP directo, sin tasa ni conversión.
  // Es excluyente con mostrarTasaCambio (no tiene sentido activar las dos).
  soloCup: (process.env.STORE_SOLO_CUP || 'false').toLowerCase() === 'true',

  // Solo se usa UNA vez, para poblar la tabla `categorias` de Supabase la
  // primera vez que la tienda arranca y esa tabla está vacía. Después de eso,
  // las categorías reales se crean y viven en Supabase (el admin las agrega
  // desde el panel), no aquí.
  categoriasIniciales: parseCategories(process.env.STORE_CATEGORIES),

  // Estos SÍ son obligatorios: si faltan, el servidor no debe arrancar
  // con una config incompleta o insegura.
  supabase: {
    get url() { return required('SUPABASE_URL'); },
    get anonKey() { return required('SUPABASE_KEY'); },
    get serviceRoleKey() { return process.env.SUPABASE_SERVICE_ROLE || null; },
    bucket: process.env.SUPABASE_BUCKET || `${process.env.STORE_SLUG || 'tienda'}_images`,
  },

  admin: {
    get password() { return required('ADMIN_PASSWORD'); },
    get token() { return required('ADMIN_TOKEN'); },
  },

  // Solo lo que es seguro exponer al navegador (nunca claves).
  // Nota: "categorias" NO se agrega aquí — api/index.js las agrega desde
  // la tabla `categorias` de Supabase, que es la fuente real y viva.
  public() {
    return {
      nombre: this.nombre,
      slogan: this.slogan,
      logo: this.logo,
      colores: this.colores,
      whatsapp: this.whatsapp,
      email: this.email,
      facebook: this.facebook,
      direccion: this.direccion,
      horario: this.horario,
      mostrarTasaCambio: this.mostrarTasaCambio,
      soloCup: this.soloCup,
      fuenteTitulo: this.fuenteTitulo,
      fuenteCuerpo: this.fuenteCuerpo,
      fuenteGoogleUrl: this.fuenteGoogleUrl,
    };
  },
};
