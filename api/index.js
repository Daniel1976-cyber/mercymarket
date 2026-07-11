import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

import { storeConfig } from '../store.config.js';
import { getLatestRate, setRate } from './services/exchangeRateService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ─── Cliente Supabase (público y de servicio) ─────────────────────────────
const supabase = createClient(storeConfig.supabase.url, storeConfig.supabase.anonKey);

// El cliente de servicio (acceso total) solo se crea si existe la clave,
// y SOLO se usa en el backend. Nunca se envía al navegador.
export const supabaseService = storeConfig.supabase.serviceRoleKey
  ? createClient(storeConfig.supabase.url, storeConfig.supabase.serviceRoleKey)
  : null;

// ─── Catálogo en memoria (cache simple) ───────────────────────────────────
let productos = [];

async function cargarProductos() {
  try {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) throw error;

    const rate = storeConfig.mostrarTasaCambio ? await getLatestRate() : 1;

    productos = data.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio_usd: p.precio,
      precio_cup: storeConfig.mostrarTasaCambio ? Math.round(p.precio * rate) : null,
      categoria: p.categoria,
      subcategoria: p.subcategoria || 'General',
      disponible: p.disponible,
      img: p.img || `https://via.placeholder.com/400x300?text=${encodeURIComponent(p.nombre)}`,
      descripcion: p.descripcion || '',
    }));
    console.log(`[${storeConfig.nombre}] Cargados ${productos.length} productos desde Supabase`);
  } catch (e) {
    console.error(`[${storeConfig.nombre}] Error al cargar productos desde Supabase:`, e.message);
    // Fallback opcional a un JSON local llamado "seed-productos.json" en la raíz,
    // útil solo para desarrollo si Supabase no responde.
    try {
      const fileData = fs.readFileSync(path.join(projectRoot, 'seed-productos.json'), 'utf8');
      productos = JSON.parse(fileData);
      console.log(`[${storeConfig.nombre}] Fallback: cargados ${productos.length} productos locales`);
    } catch {
      productos = [];
    }
  }
}
// Guardamos la PROMESA (no solo llamamos la función) para poder esperarla
// desde cualquier ruta. Esto evita que, en un arranque "en frío" (Vercel
// apaga el servidor si nadie lo usa y lo prende de nuevo en la próxima
// visita), un pedido llegue y se responda con la lista todavía vacía
// mientras la carga real sigue en curso de fondo.
let productosListos = cargarProductos();

// ─── Categorías (el admin las crea desde el panel) ────────────────────────
let categorias = [];

async function cargarCategorias() {
  try {
    const { data, error } = await supabase.from('categorias').select('*').order('nombre');
    if (error) throw error;

    if (data.length === 0 && storeConfig.categoriasIniciales.length) {
      // Primera vez que arranca esta tienda: siembra la tabla con las
      // categorías del .env, para no obligar a crearlas todas a mano.
      if (supabaseService) {
        const { data: sembradas, error: errorSiembra } = await supabaseService
          .from('categorias')
          .insert(storeConfig.categoriasIniciales)
          .select();
        if (errorSiembra) throw errorSiembra;
        categorias = sembradas;
        console.log(`[${storeConfig.nombre}] Categorías sembradas desde STORE_CATEGORIES (${categorias.length})`);
      } else {
        categorias = storeConfig.categoriasIniciales;
      }
    } else {
      categorias = data;
    }
  } catch (e) {
    console.error(`[${storeConfig.nombre}] Error al cargar categorías desde Supabase:`, e.message);
    categorias = storeConfig.categoriasIniciales || [];
  }
}
let categoriasListas = cargarCategorias();

function slugify(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

// ─── Config pública (la usan index.html / search.html / admin.html) ──────
app.get('/api/config', async (req, res) => {
  await categoriasListas;
  res.json({ ...storeConfig.public(), categorias });
});

// ─── Catálogo ──────────────────────────────────────────────────────────────
// Público: solo lo disponible. Si no hay inventario, el admin lo oculta con
// el interruptor "disponible" en vez de borrarlo — así el producto sigue
// existiendo en la base de datos y no hay que recrearlo cuando vuelva a haber stock.
app.get('/api/products', async (req, res) => {
  await productosListos;
  res.json(productos.filter((p) => p.disponible));
});

// Admin: todo el catálogo (disponible y no disponible), para el dashboard y la edición.
app.get('/api/admin/products', verifyAdmin, async (req, res) => {
  await productosListos;
  res.json(productos);
});

app.get('/api/products/:id', async (req, res) => {
  await productosListos;
  const producto = productos.find((p) => p.id === parseInt(req.params.id, 10));
  if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
  res.json(producto);
});

app.get('/api/categories', async (req, res) => {
  await productosListos;
  res.json([...new Set(productos.map((p) => p.categoria))]);
});

app.get('/api/subcategories/:category', async (req, res) => {
  await productosListos;
  const subcategorias = [...new Set(
    productos.filter((p) => p.categoria === req.params.category).map((p) => p.subcategoria)
  )];
  res.json(subcategorias);
});

// ─── Tasa de cambio (solo si la tienda la usa) ────────────────────────────
app.get('/api/rate', async (req, res) => {
  if (!storeConfig.mostrarTasaCambio) return res.json({ rate: null });
  try {
    res.json({ rate: await getLatestRate() });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo obtener la tasa de cambio' });
  }
});

// ─── Autenticación admin ───────────────────────────────────────────────────
app.post('/api/validatePassword', (req, res) => {
  const { password } = req.body || {};
  if (password !== storeConfig.admin.password) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  res.json({ success: true, token: storeConfig.admin.token });
});

app.post('/api/logout', (req, res) => res.json({ success: true }));

function verifyAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== storeConfig.admin.token) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

// ─── CRUD admin de productos ───────────────────────────────────────────────
app.post('/api/admin/products', verifyAdmin, async (req, res) => {
  if (!supabaseService) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE no configurado en esta tienda' });
  }
  const { nombre, categoria, subcategoria, precio, disponible, imagen, img, descripcion } = req.body;
  const { data, error } = await supabaseService.from('productos').insert([{
    nombre, categoria, subcategoria: subcategoria || 'General',
    precio, disponible: disponible !== false, img: imagen || img, descripcion,
  }]).select();
  if (error) return res.status(500).json({ error: error.message });
  await cargarProductos();
  res.json(data);
});

app.put('/api/admin/products/:id', verifyAdmin, async (req, res) => {
  if (!supabaseService) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE no configurado en esta tienda' });
  }
  const { id } = req.params;
  const camposPermitidos = ['nombre', 'categoria', 'subcategoria', 'precio', 'disponible', 'descripcion'];
  const cambios = {};
  for (const campo of camposPermitidos) {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  }
  // "imagen" o "img": cualquiera de los dos nombres actualiza la columna img
  if (req.body.imagen !== undefined) cambios.img = req.body.imagen;
  else if (req.body.img !== undefined) cambios.img = req.body.img;

  if (Object.keys(cambios).length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  const { data, error } = await supabaseService.from('productos')
    .update(cambios)
    .eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  if (!data || !data.length) return res.status(404).json({ error: 'Producto no encontrado' });

  await cargarProductos();
  res.json(data);
});

app.delete('/api/admin/products/:id', verifyAdmin, async (req, res) => {
  if (!supabaseService) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE no configurado en esta tienda' });
  }
  const { error } = await supabaseService.from('productos').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  productos = productos.filter((p) => p.id !== parseInt(req.params.id, 10));
  res.json({ success: true });
});

// Subida de imagen (requiere service role key)
app.post('/api/admin/upload', verifyAdmin, async (req, res) => {
  if (!supabaseService) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE no configurado en esta tienda' });
  }
  try {
    const { imageBase64, filename, mimeType } = req.body;
    if (!imageBase64 || !filename) return res.status(400).json({ error: 'No image provided' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalName = `productos/${Date.now()}_${safeName}`;

    const { error } = await supabaseService.storage
      .from(storeConfig.supabase.bucket)
      .upload(finalName, buffer, { contentType: mimeType || 'image/jpeg' });
    if (error) return res.status(500).json({ error: error.message });

    const { data: urlData } = supabase.storage.from(storeConfig.supabase.bucket).getPublicUrl(finalName);
    res.json({ url: urlData.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tasa: fijarla manualmente desde el panel admin
app.post('/api/admin/rate', verifyAdmin, async (req, res) => {
  const { rate } = req.body;
  if (rate == null) return res.status(400).json({ error: 'Rate is required' });
  try {
    await setRate(rate);
    await cargarProductos(); // recalcula precio_cup de todo el catálogo
    res.json({ success: true, rate });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Categorías: el admin crea las que necesite (Alimentos, Bebidas, etc.)
app.post('/api/admin/categories', verifyAdmin, async (req, res) => {
  if (!supabaseService) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE no configurado en esta tienda' });
  }
  await categoriasListas;
  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
  }

  const id = slugify(nombre);
  if (!id) return res.status(400).json({ error: 'Ese nombre no es válido' });
  if (categorias.some((c) => c.id === id)) {
    return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
  }

  const { data, error } = await supabaseService
    .from('categorias')
    .insert([{ id, nombre: nombre.trim() }])
    .select();
  if (error) return res.status(500).json({ error: error.message });

  categorias.push(data[0]);
  categorias.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  res.json(data[0]);
});

// ─── Archivos estáticos ────────────────────────────────────────────────────
const publicDir = path.join(projectRoot, 'public');
app.use(express.static(publicDir));
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

export default app;
