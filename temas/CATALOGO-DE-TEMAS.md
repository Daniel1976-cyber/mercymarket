# Catálogo de temas

5 combinaciones de color + tipografía, listas para copiar y pegar en el
`.env.local` de cualquier tienda. Cada una es independiente del logo y el
eslogan — eso siempre lo pone cada dueño por su cuenta.

Para usar un tema: copia las 6 líneas correspondientes (colores + fuentes)
dentro del `.env.local` de la tienda, reemplazando lo que ya tenga en esas
variables. El logo, nombre, categorías, WhatsApp, etc. no se tocan.

---

## 1. Mercy Boutique (verde bosque + dorado)
El tema original de Mercy Market — degradado verde oscuro en el header,
acento dorado, título elegante en serif.

```
STORE_COLOR_PRIMARY="#1a3d2b"
STORE_COLOR_ACCENT="#c9a96e"
STORE_HEADER_GRADIENT="linear-gradient(135deg, #1a3d2b 0%, #2d6a4f 100%)"
STORE_FONT_TITULO="'Cormorant Garamond', serif"
STORE_FONT_BODY="'Inter', sans-serif"
STORE_FONT_GOOGLE_URL="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Inter:wght@400;600&display=swap"
```

## 2. Moderno Índigo (azul + naranja)
Look tecnológico, limpio, de alto contraste. Bueno para electrónica,
ferretería, o tiendas que quieren verse "serias".

```
STORE_COLOR_PRIMARY="#1e3a8a"
STORE_COLOR_ACCENT="#f97316"
STORE_HEADER_GRADIENT="linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)"
STORE_FONT_TITULO="'Poppins', sans-serif"
STORE_FONT_BODY="'Inter', sans-serif"
STORE_FONT_GOOGLE_URL="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Inter:wght@400;600&display=swap"
```

## 3. Terracota Artesanal (ladrillo + mostaza)
Cálido, editorial, look de mercado/artesanía. Bueno para regalos, hogar,
comida.

```
STORE_COLOR_PRIMARY="#9a3412"
STORE_COLOR_ACCENT="#facc15"
STORE_HEADER_GRADIENT="linear-gradient(135deg, #9a3412 0%, #7c2d12 100%)"
STORE_FONT_TITULO="'Playfair Display', serif"
STORE_FONT_BODY="'Nunito Sans', sans-serif"
STORE_FONT_GOOGLE_URL="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Nunito+Sans:wght@400;600&display=swap"
```

## 4. Fresco Menta (verde menta + rosa)
Juvenil, alegre, redondeado. Bueno para belleza, ropa, regalos.

```
STORE_COLOR_PRIMARY="#0d9488"
STORE_COLOR_ACCENT="#f472b6"
STORE_HEADER_GRADIENT="linear-gradient(135deg, #0d9488 0%, #0f766e 100%)"
STORE_FONT_TITULO="'Quicksand', sans-serif"
STORE_FONT_BODY="'Nunito', sans-serif"
STORE_FONT_GOOGLE_URL="https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700&family=Nunito:wght@400;600&display=swap"
```

## 5. Elegante Oscuro (carbón + oro)
Premium, lujo, alto contraste. Bueno para joyería, tecnología de gama alta,
tiendas que quieren verse exclusivas.

```
STORE_COLOR_PRIMARY="#111827"
STORE_COLOR_ACCENT="#d4af37"
STORE_HEADER_GRADIENT="linear-gradient(135deg, #111827 0%, #1f2937 100%)"
STORE_FONT_TITULO="'Cinzel', serif"
STORE_FONT_BODY="'Inter', sans-serif"
STORE_FONT_GOOGLE_URL="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;600&display=swap"
```

---

## Personalizado (sin usar ninguno de los 5)

Si el dueño quiere algo distinto a estos 5, se puede armar a mano: cualquier
color hexadecimal para `STORE_COLOR_PRIMARY`/`STORE_COLOR_ACCENT`, cualquier
degradado CSS válido para `STORE_HEADER_GRADIENT`, y cualquier par de fuentes
de [Google Fonts](https://fonts.google.com) — solo hay que armar el link
`STORE_FONT_GOOGLE_URL` desde ahí (botón "Get font" → "Get embed code" →
copiar el link `<link href="...">`).

Si se dejan `STORE_HEADER_GRADIENT`, `STORE_FONT_TITULO` y
`STORE_FONT_GOOGLE_URL` vacíos, la tienda usa el estilo simple de siempre
(header de color sólido, fuente del sistema) — ningún tema es obligatorio.
