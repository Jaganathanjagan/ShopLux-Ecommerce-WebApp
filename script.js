/* ============================================================
   ShopLux — script.js
   Handles: API fetch, product rendering, cart, filters,
            search, dark mode, modal, toast notifications
   ============================================================ */

'use strict';

// ── Constants & State ───────────────────────────────────────────
const API_URL = 'https://fakestoreapi.com/products';
const CATEGORIES_URL = 'https://fakestoreapi.com/products/categories';

const state = {
  products: [],          // All fetched products
  filtered: [],          // After filter/search/sort applied
  cart: [],              // Cart items
  activeFilter: 'all',
  activeSort: 'default',
  searchQuery: '',
  wishlist: new Set(),
};

// Category metadata: icon + display label
const CATEGORY_META = {
  "electronics":        { icon: 'fa-bolt',            label: 'Electronics' },
  "jewelery":           { icon: 'fa-gem',              label: 'Jewellery'   },
  "men's clothing":     { icon: 'fa-shirt',            label: "Men's"       },
  "women's clothing":   { icon: 'fa-person-dress',     label: "Women's"     },
};

// ── DOM References ──────────────────────────────────────────────
const productsGrid    = document.getElementById('products-grid');
const categoriesGrid  = document.getElementById('categories-grid');
const filterTabs      = document.getElementById('filter-tabs');
const sortSelect      = document.getElementById('sort-select');
const searchInput     = document.getElementById('search-input');
const searchClear     = document.getElementById('search-clear');
const cartCountEl     = document.getElementById('cart-count');
const toast           = document.getElementById('toast');
const toastMsg        = document.getElementById('toast-msg');
const modalOverlay    = document.getElementById('modal-overlay');
const modalInner      = document.getElementById('modal-inner');
const modalClose      = document.getElementById('modal-close');
const themeToggle     = document.getElementById('theme-toggle');
const themeIcon       = document.getElementById('theme-icon');
const hamburger       = document.getElementById('hamburger');
const mobileNav       = document.getElementById('mobile-nav');
const noResults       = document.getElementById('no-results');

// ── Initialise ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  loadThemeFromStorage();
  loadWishlistFromStorage();
  fetchProducts();
  attachEventListeners();
});

// ── LocalStorage helpers ────────────────────────────────────────
function loadCartFromStorage() {
  const saved = localStorage.getItem('shoplux_cart');
  state.cart = saved ? JSON.parse(saved) : [];
  updateCartCount();
}

function saveCartToStorage() {
  localStorage.setItem('shoplux_cart', JSON.stringify(state.cart));
}

function loadWishlistFromStorage() {
  const saved = localStorage.getItem('shoplux_wishlist');
  if (saved) state.wishlist = new Set(JSON.parse(saved));
}

function saveWishlistToStorage() {
  localStorage.setItem('shoplux_wishlist', JSON.stringify([...state.wishlist]));
}

// ── Theme ───────────────────────────────────────────────────────
function loadThemeFromStorage() {
  const saved = localStorage.getItem('shoplux_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('shoplux_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// ── Fetch Products ──────────────────────────────────────────────
async function fetchProducts() {
  renderSkeletons(8); // Show 8 skeleton cards while loading

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      fetch(API_URL),
      fetch(CATEGORIES_URL),
    ]);

    if (!productsRes.ok) throw new Error('Failed to fetch products');

    state.products = await productsRes.json();
    const categories = await categoriesRes.json();

    state.filtered = [...state.products];

    renderCategoryCards(categories, state.products);
    renderFilterTabs(categories);
    renderProducts(state.filtered);

  } catch (err) {
    console.error('Fetch error:', err);
    productsGrid.innerHTML = `
      <div class="no-results">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Failed to load products. Please check your connection.</p>
        <button class="btn-primary" onclick="fetchProducts()">Retry</button>
      </div>`;
  }
}

// ── Skeleton Loaders ────────────────────────────────────────────
function renderSkeletons(count) {
  productsGrid.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton">
      <div class="skel-img"></div>
      <div class="skel-body">
        <div class="skel-line"></div>
        <div class="skel-line short"></div>
        <div class="skel-btn"></div>
      </div>
    </div>
  `).join('');
}

// ── Render Category Cards ───────────────────────────────────────
function renderCategoryCards(categories, products) {
  categoriesGrid.innerHTML = categories.map(cat => {
    const meta = CATEGORY_META[cat] || { icon: 'fa-tag', label: cat };
    const count = products.filter(p => p.category === cat).length;
    return `
      <div class="category-card" onclick="filterByCategory('${cat}')" role="button" tabindex="0"
           aria-label="Filter by ${meta.label}">
        <div class="category-icon">
          <i class="fa-solid ${meta.icon}"></i>
        </div>
        <div class="category-name">${meta.label}</div>
        <div class="category-count">${count} items</div>
      </div>`;
  }).join('');
}

// ── Render Filter Tabs ──────────────────────────────────────────
function renderFilterTabs(categories) {
  const tabs = categories.map(cat => {
    const meta = CATEGORY_META[cat] || { label: cat };
    return `<button class="filter-tab" data-filter="${cat}">${meta.label}</button>`;
  }).join('');
  // Append after the "All" tab
  filterTabs.innerHTML = `<button class="filter-tab active" data-filter="all">All</button>${tabs}`;
  updateActiveTab(state.activeFilter);
}

// ── Render Products ─────────────────────────────────────────────
function renderProducts(products) {
  noResults.style.display = 'none';

  if (!products.length) {
    productsGrid.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }

  productsGrid.innerHTML = products.map((p, i) => {
    const meta = CATEGORY_META[p.category] || { label: p.category };
    const stars = generateStars(p.rating.rate);
    const wished = state.wishlist.has(p.id);
    const inCart = state.cart.some(c => c.id === p.id);

    return `
      <article class="product-card" style="animation-delay:${i * 0.05}s"
               onclick="openModal(${p.id})" role="button" tabindex="0"
               aria-label="View ${p.title}">
        <div class="card-img-wrap">
          <img src="${p.image}" alt="${escapeHtml(p.title)}" class="card-img" loading="lazy" />
          <span class="card-badge">${meta.label}</span>
          <button class="card-wish ${wished ? 'wished' : ''}"
                  onclick="toggleWishlist(event, ${p.id})"
                  aria-label="${wished ? 'Remove from wishlist' : 'Add to wishlist'}">
            <i class="fa-${wished ? 'solid' : 'regular'} fa-heart"></i>
          </button>
        </div>
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(p.title)}</h3>
          <div class="card-meta">
            <span class="card-price">$${p.price.toFixed(2)}</span>
            <span class="card-rating">
              <span class="stars">${stars}</span>
              ${p.rating.rate} (${p.rating.count})
            </span>
          </div>
          <button class="card-btn ${inCart ? 'added' : ''}"
                  onclick="handleAddToCart(event, ${p.id})"
                  aria-label="Add ${p.title} to cart">
            <i class="fa-solid ${inCart ? 'fa-circle-check' : 'fa-cart-plus'}"></i>
            ${inCart ? 'In Cart' : 'Add to Cart'}
          </button>
        </div>
      </article>`;
  }).join('');
}

// ── Generate star rating HTML ───────────────────────────────────
function generateStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.4 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    '★'.repeat(full) +
    (half ? '½' : '') +
    '☆'.repeat(empty)
  );
}

// ── Filtering & Sorting ─────────────────────────────────────────
function applyFiltersAndSort() {
  let result = [...state.products];

  // Category filter
  if (state.activeFilter !== 'all') {
    result = result.filter(p => p.category === state.activeFilter);
  }

  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }

  // Sorting
  switch (state.activeSort) {
    case 'price-asc':  result.sort((a, b) => a.price - b.price); break;
    case 'price-desc': result.sort((a, b) => b.price - a.price); break;
    case 'rating':     result.sort((a, b) => b.rating.rate - a.rating.rate); break;
  }

  state.filtered = result;
  renderProducts(state.filtered);
}

function filterByCategory(cat) {
  state.activeFilter = cat;
  updateActiveTab(cat);
  applyFiltersAndSort();
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

function updateActiveTab(cat) {
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === cat);
  });
}

function clearFilters() {
  state.activeFilter = 'all';
  state.searchQuery = '';
  state.activeSort = 'default';
  searchInput.value = '';
  sortSelect.value = 'default';
  searchClear.style.display = 'none';
  updateActiveTab('all');
  applyFiltersAndSort();
}

// ── Cart Operations ─────────────────────────────────────────────
function handleAddToCart(event, productId) {
  event.stopPropagation(); // Don't trigger modal

  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const existing = state.cart.find(c => c.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ ...product, qty: 1 });
  }

  saveCartToStorage();
  updateCartCount();
  showToast(`"${truncate(product.title, 30)}" added to cart!`);

  // Update button state
  const btn = event.currentTarget;
  btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> In Cart';
  btn.classList.add('added');
}

function updateCartCount() {
  const total = state.cart.reduce((sum, item) => sum + item.qty, 0);
  cartCountEl.textContent = total;

  // Bump animation
  cartCountEl.classList.remove('bump');
  void cartCountEl.offsetWidth; // Reflow trick
  if (total > 0) cartCountEl.classList.add('bump');
  setTimeout(() => cartCountEl.classList.remove('bump'), 300);
}

// ── Wishlist ────────────────────────────────────────────────────
function toggleWishlist(event, productId) {
  event.stopPropagation();

  const btn = event.currentTarget;
  if (state.wishlist.has(productId)) {
    state.wishlist.delete(productId);
    btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    btn.classList.remove('wished');
    showToast('Removed from wishlist', 'info');
  } else {
    state.wishlist.add(productId);
    btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    btn.classList.add('wished');
    showToast('Added to wishlist ♥');
  }
  saveWishlistToStorage();
}

// ── Product Detail Modal ────────────────────────────────────────
function openModal(productId) {
  const p = state.products.find(p => p.id === productId);
  if (!p) return;

  const meta = CATEGORY_META[p.category] || { label: p.category };
  const stars = generateStars(p.rating.rate);
  const inCart = state.cart.find(c => c.id === p.id);
  const qty = inCart ? inCart.qty : 1;

  modalInner.innerHTML = `
    <div class="modal-img-wrap">
      <img src="${p.image}" alt="${escapeHtml(p.title)}" class="modal-img" />
    </div>
    <div class="modal-info">
      <span class="modal-category">${meta.label}</span>
      <h2 class="modal-title">${escapeHtml(p.title)}</h2>
      <div class="modal-rating">
        <span class="stars">${stars}</span>
        <span>${p.rating.rate} out of 5 &nbsp;·&nbsp; ${p.rating.count} reviews</span>
      </div>
      <p class="modal-price">$${p.price.toFixed(2)}</p>
      <p class="modal-desc">${escapeHtml(p.description)}</p>
      <div class="modal-actions">
        <div class="modal-qty">
          <button onclick="changeModalQty(-1, ${p.id})" aria-label="Decrease quantity">
            <i class="fa-solid fa-minus"></i>
          </button>
          <span id="modal-qty-${p.id}">${qty}</span>
          <button onclick="changeModalQty(1, ${p.id})" aria-label="Increase quantity">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <button class="btn-primary" onclick="addToCartFromModal(${p.id})">
          <i class="fa-solid fa-cart-plus"></i> Add to Cart
        </button>
      </div>
    </div>`;

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

// Adjust qty inside modal (for display purposes only, not cart qty)
let modalQtyTemp = {};
function changeModalQty(delta, productId) {
  if (!modalQtyTemp[productId]) modalQtyTemp[productId] = 1;
  modalQtyTemp[productId] = Math.max(1, modalQtyTemp[productId] + delta);
  const el = document.getElementById(`modal-qty-${productId}`);
  if (el) el.textContent = modalQtyTemp[productId];
}

function addToCartFromModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const qty = modalQtyTemp[productId] || 1;
  const existing = state.cart.find(c => c.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({ ...product, qty });
  }

  saveCartToStorage();
  updateCartCount();
  showToast(`${qty}× "${truncate(product.title, 25)}" added!`);
  closeModal();

  // Update card button
  const btn = productsGrid.querySelector(`[onclick="handleAddToCart(event, ${productId})"]`);
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> In Cart';
    btn.classList.add('added');
  }
}

// ── Toast Notification ──────────────────────────────────────────
let toastTimer = null;
function showToast(message, type = 'success') {
  toastMsg.textContent = message;
  toast.querySelector('i').className = type === 'success'
    ? 'fa-solid fa-circle-check'
    : 'fa-solid fa-circle-info';
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Event Listeners ─────────────────────────────────────────────
function attachEventListeners() {
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);

  // Hamburger menu
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('open');
  });

  // Close mobile nav when clicking outside
  document.addEventListener('click', e => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
      hamburger.classList.remove('active');
      mobileNav.classList.remove('open');
    }
  });

  // Search
  searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value.trim();
    searchClear.style.display = state.searchQuery ? 'block' : 'none';
    applyFiltersAndSort();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    searchClear.style.display = 'none';
    applyFiltersAndSort();
    searchInput.focus();
  });

  // Sort
  sortSelect.addEventListener('change', e => {
    state.activeSort = e.target.value;
    applyFiltersAndSort();
  });

  // Filter tabs (event delegation)
  filterTabs.addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    state.activeFilter = tab.dataset.filter;
    updateActiveTab(state.activeFilter);
    applyFiltersAndSort();
  });

  // Modal close
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });

  // Close modal with Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Navbar scroll shadow
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    nav.style.boxShadow = window.scrollY > 20 ? '0 4px 20px rgba(0,0,0,0.3)' : '';
  }, { passive: true });
}

// ── Mobile nav close helper ─────────────────────────────────────
function closeMobileNav() {
  hamburger.classList.remove('active');
  mobileNav.classList.remove('open');
}

// ── Utilities ───────────────────────────────────────────────────
function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}