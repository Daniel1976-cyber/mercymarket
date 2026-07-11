// public/js/store-app.js
// Lógica compartida por index.html, search.html y product.html.
// No contiene NADA específico de una tienda: todo llega desde /api/config.

window.STORE = {
  config: null,
  rate: null,
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
};

async function initStore() {
  const [configRes, rateRes] = await Promise.all([
    fetch('/api/config').then((r) => r.json()),
    fetch('/api/rate').then((r) => r.json()).catch(() => ({ rate: null })),
  ]);
  window.STORE.config = configRes;
  window.STORE.rate = rateRes.rate;
  applyBranding(configRes);
  updateCartBadge();
  return configRes;
}

function applyBranding(config) {
  document.title = config.nombre;

  // Colores vía variables CSS -> permite que styles.css sea igual en todas las tiendas
  document.documentElement.style.setProperty('--color-primario', config.colores.primario);
  document.documentElement.style.setProperty('--color-acento', config.colores.acento);

  document.querySelectorAll('[data-store="nombre"]').forEach((el) => (el.textContent = config.nombre));
  document.querySelectorAll('[data-store="slogan"]').forEach((el) => (el.textContent = config.slogan));
  document.querySelectorAll('[data-store="logo"]').forEach((el) => (el.src = config.logo));
  document.querySelectorAll('[data-store="email"]').forEach((el) => {
    el.textContent = config.email;
    el.href = `mailto:${config.email}`;
  });
  document.querySelectorAll('[data-store="whatsapp-link"]').forEach((el) => {
    el.href = `https://wa.me/${config.whatsapp}`;
  });
  document.querySelectorAll('[data-store="facebook"]').forEach((el) => {
    if (config.facebook) el.href = config.facebook;
    else el.style.display = 'none';
  });
  document.querySelectorAll('[data-store="direccion"]').forEach((el) => (el.textContent = config.direccion || ''));
  document.querySelectorAll('[data-store="horario"]').forEach((el) => (el.textContent = config.horario || ''));
  document.querySelectorAll('[data-store="anio"]').forEach((el) => (el.textContent = new Date().getFullYear()));

  const tasaEl = document.getElementById('exchangeRateDisplay');
  if (tasaEl) {
    if (config.mostrarTasaCambio) {
      tasaEl.style.display = '';
      tasaEl.textContent = `Tasa: ${window.STORE.rate ?? '--'}`;
    } else {
      tasaEl.style.display = 'none';
    }
  }

  renderCategoryButtons(config.categorias);
}

function renderCategoryButtons(categorias) {
  const contenedor = document.getElementById('categoryButtons');
  if (!contenedor) return;
  contenedor.innerHTML = categorias
    .map((c) => `<button class="cat-btn" data-cat="${c.id}">${c.nombre}</button>`)
    .join('');
}

// ─── Carrito ────────────────────────────────────────────────────────────
function addToCart(producto) {
  const cart = window.STORE.cart;
  const existente = cart.find((i) => i.id === producto.id);
  if (existente) existente.cantidad += 1;
  else cart.push({ ...producto, cantidad: 1 });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  const total = window.STORE.cart.reduce((acc, i) => acc + i.cantidad, 0);
  badge.textContent = total;
}

// ─── Modal del carrito: el cliente revisa antes de mandar el pedido ───────
// Se inyecta una sola vez en cualquier página que llame a initStore(),
// así no hace falta repetir este HTML en index.html/search.html.
function ensureCartModal() {
  if (document.getElementById('storeCartOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'storeCartOverlay';
  overlay.className = 'cart-overlay';
  overlay.innerHTML = `
    <div class="cart-modal">
      <div class="cart-modal-header">
        <h3>Tu carrito</h3>
        <button class="cart-close" onclick="StoreApp.closeCart()">✕</button>
      </div>
      <div id="cartItemsList" class="cart-items-list"></div>
      <div class="cart-modal-footer">
        <div class="cart-total-row"><span>Total</span><span id="cartTotalDisplay">$0.00</span></div>
        <button class="cart-continue" onclick="StoreApp.closeCart()">Seguir comprando</button>
        <button class="cart-whatsapp-btn" id="cartWhatsappBtn" onclick="StoreApp.checkoutPorWhatsApp()">Enviar pedido por WhatsApp</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCart(); });
}

function renderCartItems() {
  const cart = window.STORE.cart;
  const list = document.getElementById('cartItemsList');
  const totalDisplay = document.getElementById('cartTotalDisplay');
  const whatsappBtn = document.getElementById('cartWhatsappBtn');

  if (!cart.length) {
    list.innerHTML = '<p class="cart-empty-msg">Tu carrito está vacío.</p>';
    totalDisplay.textContent = `$${formatMoney(0)}`;
    if (whatsappBtn) whatsappBtn.disabled = true;
    return;
  }

  if (whatsappBtn) whatsappBtn.disabled = false;
  list.innerHTML = cart.map((item) => `
    <div class="cart-item-row">
      <img src="${item.img}" alt="${item.nombre}" />
      <div class="info">
        <div class="nombre">${item.nombre}</div>
        <div class="precio">$${formatMoney(item.precio_usd)}${item.precio_cup ? ` / ${formatMoney(item.precio_cup)} CUP` : ''} c/u</div>
      </div>
      <div class="cart-qty">
        <button onclick="StoreApp.changeCartQty(${item.id}, -1)" aria-label="Quitar uno">−</button>
        <span>${item.cantidad}</span>
        <button onclick="StoreApp.changeCartQty(${item.id}, 1)" aria-label="Agregar uno">+</button>
      </div>
      <button class="cart-item-remove" onclick="StoreApp.removeCartItem(${item.id})" title="Quitar del carrito">🗑</button>
    </div>
  `).join('');

  const total = cart.reduce((acc, i) => acc + i.precio_usd * i.cantidad, 0);
  const totalCup = cart.reduce((acc, i) => acc + (i.precio_cup || 0) * i.cantidad, 0);
  const hayCup = cart.some((i) => i.precio_cup);
  totalDisplay.textContent = `$${formatMoney(total)}${hayCup ? ` / ${formatMoney(totalCup)} CUP` : ''}`;
}

function openCart() {
  ensureCartModal();
  renderCartItems();
  document.getElementById('storeCartOverlay').classList.add('open');
}

function closeCart() {
  const overlay = document.getElementById('storeCartOverlay');
  if (overlay) overlay.classList.remove('open');
}

function changeCartQty(id, delta) {
  const cart = window.STORE.cart;
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    window.STORE.cart = cart.filter((i) => i.id !== id);
  }
  localStorage.setItem('cart', JSON.stringify(window.STORE.cart));
  updateCartBadge();
  renderCartItems();
}

function removeCartItem(id) {
  window.STORE.cart = window.STORE.cart.filter((i) => i.id !== id);
  localStorage.setItem('cart', JSON.stringify(window.STORE.cart));
  updateCartBadge();
  renderCartItems();
}

function checkoutPorWhatsApp() {
  const { config, cart } = window.STORE;
  if (!cart.length) return;
  const detalle = cart
    .map((i) => `• ${i.nombre} x${i.cantidad} — $${formatMoney(i.precio_usd)}${i.precio_cup ? ` / ${formatMoney(i.precio_cup)} CUP` : ''}`)
    .join('%0A');
  const total = cart.reduce((acc, i) => acc + i.precio_usd * i.cantidad, 0);
  const totalCup = cart.reduce((acc, i) => acc + (i.precio_cup || 0) * i.cantidad, 0);
  const hayCup = cart.some((i) => i.precio_cup);
  const mensaje = `Hola, quiero pedir:%0A${detalle}%0A%0ATotal: $${formatMoney(total)}${hayCup ? ` / ${formatMoney(totalCup)} CUP` : ''}`;
  window.open(`https://wa.me/${config.whatsapp}?text=${mensaje}`, '_blank');
}

// ─── Buscador (usado en index.html y search.html) ─────────────────────────
function buildSearchUrl(query, category) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category) params.set('cat', category);
  return `search.html?${params.toString()}`;
}

function submitSearch() {
  const query = document.getElementById('searchText')?.value.trim() || '';
  const category = document.getElementById('searchCategory')?.value || '';
  window.location.href = buildSearchUrl(query, category);
}

// Formato contable: 1.00 | 1,234.56 — mismo formato usado en las tiendas anteriores.
function formatMoney(value) {
  if (value === null || value === undefined || isNaN(value)) return '';
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Tarjeta de producto (usada por index.html y search.html) ────────────
function renderProductCard(p) {
  return `
    <div class="product-card">
      <div class="img-wrap">
        <img src="${p.img}" alt="${p.nombre}" loading="lazy" />
      </div>
      <div class="body">
        <div>${p.nombre}</div>
        <div class="price">$${formatMoney(p.precio_usd)}${p.precio_cup ? ` / ${formatMoney(p.precio_cup)} CUP` : ''}</div>
        <button onclick='StoreApp.addToCart(${JSON.stringify(p)})'>Agregar</button>
      </div>
    </div>
  `;
}

// Efecto "spotlight": el brillo sigue al mouse sobre la imagen del producto.
// Se engancha una sola vez al contenedor (delegación), sirve para grillas
// que se re-renderizan constantemente (filtros, búsqueda, etc.).
function attachSpotlight(containerSelector) {
  const contenedor = document.querySelector(containerSelector);
  if (!contenedor || contenedor.dataset.spotlightBound) return;
  contenedor.dataset.spotlightBound = '1';
  contenedor.addEventListener('mousemove', (e) => {
    const wrap = e.target.closest('.img-wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    wrap.style.setProperty('--x', `${e.clientX - rect.left}px`);
    wrap.style.setProperty('--y', `${e.clientY - rect.top}px`);
  });
}

// ─── Autocompletado de búsqueda (dropdown tipo "ag" -> "Agua", "Agarradera") ─
// inputEl: <input> de texto. dropdownEl: contenedor donde se pintan las sugerencias.
// getProductos: función que devuelve el array de productos ya cargado.
// onSelect(producto): qué hacer al elegir una sugerencia (por defecto, ir a search.html?id=).
function setupAutocomplete(inputEl, dropdownEl, getProductos, onSelect) {
  if (!inputEl || !dropdownEl) return;
  let indiceActivo = -1;

  function cerrar() {
    dropdownEl.classList.remove('open');
    dropdownEl.innerHTML = '';
    indiceActivo = -1;
  }

  function seleccionar(producto) {
    cerrar();
    inputEl.value = producto.nombre;
    if (onSelect) onSelect(producto);
    else window.location.href = `search.html?id=${producto.id}`;
  }

  function render(query) {
    const productos = getProductos() || [];
    const q = query.trim().toLowerCase();
    if (!q) { cerrar(); return; }

    const coincidencias = productos
      .filter((p) => p.nombre.toLowerCase().includes(q))
      .slice(0, 8);

    if (!coincidencias.length) { cerrar(); return; }

    dropdownEl.innerHTML = coincidencias.map((p, i) => `
      <div class="suggestion-item" data-idx="${i}" data-id="${p.id}">
        <span>${p.nombre}</span>
        <span class="cat">${p.categoria}</span>
      </div>
    `).join('');
    dropdownEl.classList.add('open');
    indiceActivo = -1;

    dropdownEl.querySelectorAll('.suggestion-item').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // evita que el input pierda foco antes del click
        const producto = productos.find((p) => p.id === parseInt(el.dataset.id, 10));
        if (producto) seleccionar(producto);
      });
    });
  }

  inputEl.addEventListener('input', () => render(inputEl.value));
  inputEl.addEventListener('focus', () => { if (inputEl.value.trim()) render(inputEl.value); });

  inputEl.addEventListener('keydown', (e) => {
    const items = [...dropdownEl.querySelectorAll('.suggestion-item')];
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      indiceActivo = Math.min(indiceActivo + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      indiceActivo = Math.max(indiceActivo - 1, 0);
    } else if (e.key === 'Enter' && indiceActivo >= 0) {
      e.preventDefault();
      items[indiceActivo].dispatchEvent(new Event('mousedown'));
      return;
    } else {
      return;
    }
    items.forEach((el, i) => el.classList.toggle('highlighted', i === indiceActivo));
  });

  document.addEventListener('click', (e) => {
    if (e.target !== inputEl && !dropdownEl.contains(e.target)) cerrar();
  });
}

window.StoreApp = {
  initStore,
  addToCart,
  checkoutPorWhatsApp,
  submitSearch,
  buildSearchUrl,
  formatMoney,
  renderProductCard,
  attachSpotlight,
  setupAutocomplete,
  openCart,
  closeCart,
  changeCartQty,
  removeCartItem,
};
