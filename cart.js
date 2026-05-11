/* ============================================================
   ShopLux — cart.js
   Handles: cart rendering, qty update, removal, totals,
            promo codes, localStorage persistence, checkout
   ============================================================ */

'use strict';

// ── State ───────────────────────────────────────────────────────
const cartState = {
  cart: [],
  discount: 0,       // Percentage discount from promo
  promoApplied: '',  // Applied promo code
};

// ── Promo Codes (demo) ──────────────────────────────────────────
const PROMO_CODES = {
  'SAVE10':  { discount: 10, label: '10% off applied!' },
  'LUX20':   { discount: 20, label: '20% off applied!' },
  'SHOP5':   { discount:  5, label: '5% off applied!'  },
};

const TAX_RATE     = 0.08;  // 8% tax
const FREE_SHIP_AT = 50;    // Free shipping threshold

// ── DOM References ──────────────────────────────────────────────
const cartItemsWrap  = document.getElementById('cart-items-wrap');
const cartEmpty      = document.getElementById('cart-empty');
const cartLayout     = document.getElementById('cart-layout');
const cartCountEl    = document.getElementById('cart-count');
const itemCountEl    = document.getElementById('item-count');
const subtotalEl     = document.getElementById('subtotal');
const shippingEl     = document.getElementById('shipping-cost');
const taxEl          = document.getElementById('tax-amount');
const grandTotalEl   = document.getElementById('grand-total');
const summaryText    = document.getElementById('cart-summary-text');
const promoMsg       = document.getElementById('promo-msg');
const toast          = document.getElementById('toast');
const toastMsg       = document.getElementById('toast-msg');
const themeToggle    = document.getElementById('theme-toggle');
const themeIcon      = document.getElementById('theme-icon');

// ── Initialise ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  loadThemeFromStorage();
  renderCart();
  attachCartListeners();
});

// ── LocalStorage ────────────────────────────────────────────────
function loadCartFromStorage() {
  const saved = localStorage.getItem('shoplux_cart');
  cartState.cart = saved ? JSON.parse(saved) : [];
}

function saveCartToStorage() {
  localStorage.setItem('shoplux_cart', JSON.stringify(cartState.cart));
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

// ── Render Cart ─────────────────────────────────────────────────
function renderCart() {
  const cart = cartState.cart;

  // Update nav badge
  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
  cartCountEl.textContent = totalQty;

  if (!cart.length) {
    cartEmpty.style.display = 'block';
    cartLayout.style.display = 'none';
    summaryText.textContent = 'Your cart is empty.';
    return;
  }

  cartEmpty.style.display  = 'none';
  cartLayout.style.display = 'grid';
  summaryText.textContent  = `You have ${totalQty} item${totalQty !== 1 ? 's' : ''} in your cart.`;

  // Render each cart item
  cartItemsWrap.innerHTML = cart.map((item, idx) => `
    <div class="cart-item" id="cart-item-${item.id}" style="animation-delay:${idx * 0.06}s">
      <div class="cart-item-img">
        <img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy" />
      </div>
      <div class="cart-item-info">
        <p class="cart-item-title">${escapeHtml(item.title)}</p>
        <p class="cart-item-cat">${escapeHtml(item.category)}</p>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">
          Unit price: $${item.price.toFixed(2)}
        </p>
      </div>
      <div class="cart-item-controls">
        <p class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</p>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)" aria-label="Decrease quantity">
            <i class="fa-solid fa-minus"></i>
          </button>
          <span class="qty-display" id="qty-${item.id}">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)" aria-label="Increase quantity">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <button class="remove-btn" onclick="removeItem(${item.id})" aria-label="Remove item">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `).join('');

  updateTotals();
}

// ── Change Quantity ─────────────────────────────────────────────
function changeQty(productId, delta) {
  const item = cartState.cart.find(i => i.id === productId);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    removeItem(productId);
    return;
  }

  // Update qty display & price in-place for a smoother feel
  const qtyEl = document.getElementById(`qty-${productId}`);
  if (qtyEl) qtyEl.textContent = item.qty;

  // Update item total price
  const itemEl = document.getElementById(`cart-item-${productId}`);
  if (itemEl) {
    const priceEl = itemEl.querySelector('.cart-item-price');
    if (priceEl) priceEl.textContent = `$${(item.price * item.qty).toFixed(2)}`;
  }

  saveCartToStorage();
  updateTotals();
  updateNavBadge();
}

// ── Remove Item ─────────────────────────────────────────────────
function removeItem(productId) {
  const item = cartState.cart.find(i => i.id === productId);
  if (!item) return;

  const name = truncate(item.title, 28);

  // Animate out
  const el = document.getElementById(`cart-item-${productId}`);
  if (el) {
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => {
      cartState.cart = cartState.cart.filter(i => i.id !== productId);
      saveCartToStorage();
      renderCart();
      showToast(`"${name}" removed from cart`);
    }, 300);
  } else {
    cartState.cart = cartState.cart.filter(i => i.id !== productId);
    saveCartToStorage();
    renderCart();
  }
}

// ── Clear All ───────────────────────────────────────────────────
function clearCart() {
  if (!cartState.cart.length) return;
  if (!confirm('Clear your entire cart?')) return;

  cartState.cart = [];
  cartState.discount = 0;
  cartState.promoApplied = '';
  saveCartToStorage();
  renderCart();
  showToast('Cart cleared');
}

// ── Calculate & Update Totals ───────────────────────────────────
function updateTotals() {
  const cart = cartState.cart;

  // Subtotal
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Discount
  const discountAmt = subtotal * (cartState.discount / 100);
  const afterDiscount = subtotal - discountAmt;

  // Shipping
  const shipping = afterDiscount >= FREE_SHIP_AT ? 0 : 5.99;

  // Tax on discounted price
  const tax = afterDiscount * TAX_RATE;

  // Grand total
  const grand = afterDiscount + shipping + tax;

  // Item count
  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);

  // Update DOM
  itemCountEl.textContent   = totalQty;
  subtotalEl.textContent    = `$${subtotal.toFixed(2)}`;

  if (cartState.discount > 0) {
    subtotalEl.innerHTML = `
      <span style="text-decoration:line-through; color:var(--text-faint); font-size:0.85em;">$${subtotal.toFixed(2)}</span>
      &nbsp;$${afterDiscount.toFixed(2)}
    `;
  }

  shippingEl.textContent = shipping === 0
    ? 'Free 🎉'
    : `$${shipping.toFixed(2)}`;

  // Show "x more for free shipping" hint
  if (shipping > 0) {
    const diff = (FREE_SHIP_AT - afterDiscount).toFixed(2);
    shippingEl.title = `Add $${diff} more for free shipping`;
  }

  taxEl.textContent       = `$${tax.toFixed(2)}`;
  grandTotalEl.textContent = `$${grand.toFixed(2)}`;
}

function updateNavBadge() {
  const total = cartState.cart.reduce((sum, i) => sum + i.qty, 0);
  cartCountEl.textContent = total;
}

// ── Promo Code ──────────────────────────────────────────────────
function applyPromo() {
  const input = document.getElementById('promo-input');
  const code  = input.value.trim().toUpperCase();

  if (!code) {
    promoMsg.style.color = 'var(--danger)';
    promoMsg.textContent = 'Please enter a promo code.';
    return;
  }

  if (cartState.promoApplied) {
    promoMsg.style.color = 'var(--text-muted)';
    promoMsg.textContent = 'A promo code is already applied.';
    return;
  }

  const promo = PROMO_CODES[code];
  if (promo) {
    cartState.discount     = promo.discount;
    cartState.promoApplied = code;
    promoMsg.style.color   = 'var(--accent)';
    promoMsg.textContent   = `✓ ${promo.label}`;
    input.disabled         = true;
    updateTotals();
    showToast(`Promo "${code}" applied — ${promo.discount}% off!`);
  } else {
    promoMsg.style.color = 'var(--danger)';
    promoMsg.textContent = 'Invalid promo code. Try SAVE10, LUX20, or SHOP5.';
  }
}

// ── Checkout (demo) ─────────────────────────────────────────────
function handleCheckout() {
  if (!cartState.cart.length) return;

  // In a real app this would redirect to a checkout flow
  showToast('Redirecting to checkout… (demo)');
  setTimeout(() => {
    alert('🎉 Thank you for shopping with ShopLux!\n\nThis is a demo — no real order was placed.\n\nValid promo codes: SAVE10 | LUX20 | SHOP5');
  }, 800);
}

// ── Toast ───────────────────────────────────────────────────────
let toastTimer = null;
function showToast(message) {
  toastMsg.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Event Listeners ─────────────────────────────────────────────
function attachCartListeners() {
  themeToggle.addEventListener('click', toggleTheme);

  // Allow pressing Enter to apply promo
  document.getElementById('promo-input')
    .addEventListener('keydown', e => { if (e.key === 'Enter') applyPromo(); });

  // Navbar scroll shadow
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    nav.style.boxShadow = window.scrollY > 10 ? '0 4px 20px rgba(0,0,0,0.3)' : '';
  }, { passive: true });
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