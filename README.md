# Plantilla de tienda online

Un solo código fuente para todas tus tiendas. Lo único que cambia entre una
tienda y otra es el archivo `.env.local`, el logo, y el proyecto de Supabase.
**Nunca edites `public/_index.html`, `_search.html`, `_admin.html` ni `api/index.js`
para adaptarlos a una tienda concreta** — si te hace falta un campo nuevo,
se agrega al `store.config.js` una sola vez y sirve para todas.

## Crear una tienda nueva (checklist)

1. **Duplica esta carpeta** con el nombre de la nueva tienda.
2. **Crea un proyecto nuevo en [supabase.com](https://supabase.com)** (uno por tienda, no lo compartas con otras).
   - Ve a *SQL Editor* y ejecuta `sql/schema.sql`.
   - Ve a *Storage* y crea un bucket público con el mismo nombre que pondrás en `SUPABASE_BUCKET`.
   - Copia `Project URL`, `anon public key` y `service_role key` desde *Settings → API*.
3. **Copia `.env.example` a `.env.local`** y completa todos los valores:
   nombre, whatsapp, colores, categorías, credenciales de Supabase, contraseña de admin.
4. **Reemplaza `public/logo.png`** por el logo real de la tienda (mismo nombre de archivo).
5. Prueba localmente:
   ```bash
   npm install
   npm run dev
   ```
   Abre `http://localhost:3000`.
6. **Sube el repo a GitHub** — asegúrate de que `.env.local` NO se suba (ya está en `.gitignore`).
7. **Despliega en Vercel** e importa el repo. En *Settings → Environment Variables*
   de Vercel, agrega las mismas variables que pusiste en `.env.local` (Vercel no
   lee `.env.local`, solo tu máquina).
8. Listo. Cero líneas de código tocadas.

## Por qué esto resuelve tu problema original

- `index.html`, `search.html` y `admin.html` son **idénticos** en todas las tiendas:
  al cargar, piden su propia configuración a `/api/config` y se pintan solos
  (nombre, logo, colores, categorías, WhatsApp, si muestran tasa o no).
- El buscador y la tasa de cambio (lo que hoy solo tiene Quiroga Express) están
  incluidos **por defecto** en la plantilla. Si una tienda no necesita tasa,
  simplemente pones `STORE_SHOW_EXCHANGE_RATE="false"` y desaparece de la interfaz
  sin tocar HTML.
- Las claves de Supabase y el token de admin viven **solo** en variables de
  entorno — `store.config.js` revienta el arranque si falta alguna, así nunca
  queda una clave hardcodeada "por si acaso" dentro del código (que es lo que
  pasaba en `mercy` y `Quiroga-Express`).

## Seguridad: qué corregir en los repos viejos

`mercy/server-local.js` y la versión vieja de `Quiroga-Express/api/index.js`
tienen las claves de Supabase escritas directamente en el código como
"fallback". Si esos repos son públicos en GitHub, cualquiera puede leerlas
del historial de commits (borrarlas del archivo actual no alcanza, siguen en
el historial). Pasos:

1. En el dashboard de Supabase de cada proyecto viejo: *Settings → API →
   Regenerate* tanto la `anon key` como la `service_role key`.
2. Cambia `ADMIN_PASSWORD` y `ADMIN_TOKEN` también, por las mismas razones.
3. A partir de ahora, esas claves solo viven en las variables de entorno de
   Vercel / tu `.env.local`, nunca en un archivo versionado.

## Estructura

```
tienda-template/
├── store.config.js        # única fuente de verdad de "qué tienda es esta"
├── api/index.js            # backend Express genérico (productos, carrito, admin, tasa)
├── api/services/exchangeRateService.js
├── public/
│   ├── _index.html          # catálogo + buscador + tasa (genérico) — se sirve en "/"
│   ├── _search.html         # resultados de búsqueda (genérico) — se sirve en "/search.html"
│   ├── _admin.html          # panel admin (genérico) — se sirve en "/admin.html"
│   ├── css/styles.css       # usa variables --color-primario/--color-acento
│   └── js/store-app.js      # branding, carrito, buscador (compartido)
├── sql/schema.sql           # tablas a crear en cada Supabase nuevo
├── .env.example             # plantilla de datos por tienda
└── vercel.json
```

**¿Por qué los archivos HTML tienen `_` adelante?** No es un capricho — es
necesario para que funcionen los metadatos (título, colores, SEO) que el
servidor rellena automáticamente. En Vercel, un archivo físico llamado
`index.html` dentro de `public/` se sirve directo como estático, **antes**
de que se consulten las reglas de `vercel.json` — así que el servidor
nunca llegaría a rellenar esos datos. Renombrarlos con `_` hace que no
exista ningún archivo que le "gane" a la regla de ruteo, y el servidor sí
llega a procesarlos. Sigue editándose el archivo igual que siempre —
`_index.html` para la página principal, etc. — solo cambia el nombre, no
el contenido ni cómo se edita.

