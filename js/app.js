// ============================================================
// app.js — Complete Starter File for 2Suk Food Store
// ============================================================


// ============================================================
// 1. DEFAULT PRODUCTS
//    Edit these to match your actual menu items.
//    Once saved via Admin, localStorage will take over.
// ============================================================

let PRODUCTS = [
  { id: 1,  name: 'Burger',       price: 99,  category: 'food',  image: '' },
  { id: 2,  name: 'Fries',        price: 49,  category: 'food',  image: '' },
  { id: 3,  name: 'Pizza',        price: 199, category: 'food',  image: '' },
  { id: 4,  name: 'Iced Coffee',  price: 79,  category: 'drink', image: '' },
  { id: 5,  name: 'Water',        price: 20,  category: 'drink', image: '' },
];


// ============================================================
// 2. SYNC PRODUCTS FROM ADMIN (localStorage)
//    If Admin has edited prices/names, load those instead.
// ============================================================

(function syncProductsFromAdmin() {
  try {
    const stored = localStorage.getItem('2suk_products');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        PRODUCTS = parsed;
        console.log('✅ Products synced from Admin:', PRODUCTS.length, 'items');
      }
    } else {
      // First ever load — save defaults so Admin can edit them
      localStorage.setItem('2suk_products', JSON.stringify(PRODUCTS));
      console.log('ℹ️ Default products saved to localStorage.');
    }
  } catch (err) {
    console.error('syncProductsFromAdmin error:', err);
  }
})();


// ============================================================
// 3. CART HELPERS
// ============================================================

function getCart() {
  try {
    const raw = localStorage.getItem('2suk_current_order');
    if (!raw) return { items: {} };
    return JSON.parse(raw);
  } catch {
    return { items: {} };
  }
}

function saveCart(cart) {
  localStorage.setItem('2suk_current_order', JSON.stringify(cart));
}

function addToCart(productId, quantity = 1) {
  const cart = getCart();
  const id   = String(productId);
  cart.items[id] = (cart.items[id] || 0) + quantity;
  saveCart(cart);
  updateCartBadge();
  console.log('Added to cart:', id, '×', cart.items[id]);
}

function removeFromCart(productId) {
  const cart = getCart();
  const id   = String(productId);
  delete cart.items[id];
  saveCart(cart);
  updateCartBadge();
}

function clearCart() {
  localStorage.removeItem('2suk_current_order');
  updateCartBadge();
}

function getCartCount() {
  const cart = getCart();
  return Object.values(cart.items).reduce((sum, qty) => sum + qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = getCartCount();
}


// ============================================================
// 4. MENU RENDERING
// ============================================================

function renderMenu(filterCategory = 'all') {
  const container = document.getElementById('menu-container');
  if (!container) return;

  const filtered = filterCategory === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === filterCategory);

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:#888;padding:1rem;">No items found.</p>';
    return;
  }

  container.innerHTML = filtered.map(product => `
    <div class="product-card" style="
      background:#fff;
      border-radius:10px;
      padding:1rem;
      box-shadow:0 1px 4px rgba(0,0,0,.08);
      display:flex;
      flex-direction:column;
      gap:.5rem;
    ">
      ${product.image
        ? `<img src="${product.image}" alt="${product.name}"
               style="width:100%;height:140px;object-fit:cover;border-radius:6px;">`
        : `<div style="width:100%;height:140px;background:#f3f4f6;border-radius:6px;
                       display:flex;align-items:center;justify-content:center;
                       color:#9ca3af;font-size:2rem;">🍽️</div>`
      }
      <strong style="font-size:1rem;">${product.name}</strong>
      <span style="color:#6366f1;font-weight:600;">₱${Number(product.price).toFixed(2)}</span>
      <button onclick="addToCart(${product.id})" style="
        background:#111827;color:#fff;border:none;
        padding:.5rem;border-radius:6px;cursor:pointer;
        font-size:.9rem;
      ">Add to Cart</button>
    </div>
  `).join('');
}


// ============================================================
// 5. ORDER SUMMARY CALCULATOR
//    Used on confirmation.html and tracking.html
// ============================================================

function loadOrderSummary() {
  try {
    const rawOrder = localStorage.getItem('2suk_current_order');
    if (!rawOrder) {
      window.location.href = 'index.html';
      return;
    }

    const currentOrder = JSON.parse(rawOrder);
    const deliveryFee  = parseFloat(localStorage.getItem('2suk_delivery_fee') || '0');
    const items        = currentOrder.items || {};

    let subtotal = 0;
    const itemDetails = [];

    Object.entries(items).forEach(([id, qty]) => {
      const product = PRODUCTS.find(p => String(p.id) === String(id));
      if (product) {
        const lineTotal = parseFloat(product.price) * parseInt(qty);
        subtotal += lineTotal;
        itemDetails.push({ name: product.name, qty, lineTotal });
      }
    });

    const total = subtotal + deliveryFee;

    // Update DOM
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('subtotal',     '₱' + subtotal.toFixed(2));
    set('delivery-fee', '₱' + deliveryFee.toFixed(2));
    set('total',        '₱' + total.toFixed(2));

    const customer = currentOrder.customer || {};
    set('customer-name',    customer.name    || 'N/A');
    set('customer-address', customer.address || 'N/A');
    set('customer-phone',   customer.phone   || 'N/A');
    set('customer-notes',   customer.notes   || 'None');
    set('order-id',         currentOrder.id  || 'N/A');

    // Item list
    const itemListEl = document.getElementById('order-items');
    if (itemListEl) {
      itemListEl.innerHTML = itemDetails.map(i => `
        <div style="display:flex;justify-content:space-between;font-size:.9rem;padding:3px 0;">
          <span>${i.name} × ${i.qty}</span>
          <span>₱${i.lineTotal.toFixed(2)}</span>
        </div>
      `).join('');
    }

    // Status (tracking.html)
    const STATUS_LABELS = {
      pending:    'Pending — Waiting',
      confirmed:  'Confirmed — Accepted',
      preparing:  'Preparing — In Kitchen',
      ready:      'Ready — For Pickup/Delivery',
      delivering: 'Out for Delivery',
      delivered:  'Delivered — Complete',
      cancelled:  'Cancelled',
    };
    set('order-status', STATUS_LABELS[currentOrder.status] || 'Pending — Waiting');

  } catch (err) {
    console.error('loadOrderSummary error:', err);
  }
}


// ============================================================
// 6. PLACE ORDER
//    Call this when the customer submits their order form
// ============================================================

function placeOrder(customerInfo) {
  try {
    const cart  = getCart();
    const items = cart.items;

    if (Object.keys(items).length === 0) {
      alert('Your cart is empty!');
      return false;
    }

    // Calculate total
    const deliveryFee = parseFloat(localStorage.getItem('2suk_delivery_fee') || '0');
    let subtotal = 0;
    Object.entries(items).forEach(([id, qty]) => {
      const product = PRODUCTS.find(p => String(p.id) === String(id));
      if (product) subtotal += parseFloat(product.price) * parseInt(qty);
    });

    const order = {
      id:         'ORD-' + Date.now(),
      createdAt:  new Date().toISOString(),
      status:     'pending',
      items:      items,
      customer:   customerInfo,
      subtotal:   subtotal,
      deliveryFee: deliveryFee,
      total:      subtotal + deliveryFee,
    };

    // Save as current order
    localStorage.setItem('2suk_current_order', JSON.stringify(order));

    // Add to all orders list
    const allOrders = JSON.parse(localStorage.getItem('2suk_all_orders') || '[]');
    allOrders.push(order);
    localStorage.setItem('2suk_all_orders', JSON.stringify(allOrders));

    console.log('✅ Order placed:', order.id);
    return true;

  } catch (err) {
    console.error('placeOrder error:', err);
    return false;
  }
}


// ============================================================
// 7. SEND ORDER VIA MESSENGER
// ============================================================

function sendOrderViaMessenger() {
  // 1. Get cart and products using YOUR localStorage keys
  const rawOrder      = JSON.parse(localStorage.getItem('2suk_current_order') || '{}');
  const savedProducts = JSON.parse(localStorage.getItem('2suk_products') || '[]');
  const savedCart     = rawOrder.items || {};

  if (Object.keys(savedCart).length === 0) {
    alert("Your cart is empty!");
    return;
  }

  // 2. Build the message
  let message  = "🍢 *New Order from 2Suk* 🍢%0A%0A";
  let subtotal = 0;

  Object.entries(savedCart).forEach(([id, qty]) => {
    const p = savedProducts.find(prod => String(prod.id) === String(id));
    if (p) {
      const lineTotal = p.price * qty;
      message  += `• ${qty}x ${p.name} (₱${lineTotal})%0A`;
      subtotal += lineTotal;
    }
  });

  const deliveryFee = parseFloat(localStorage.getItem('2suk_delivery_fee') || '20');
  const total       = subtotal + deliveryFee;

  message += `%0A--------------------------%0A`;
  message += `Subtotal: ₱${subtotal.toFixed(2)}%0A`;
  message += `Delivery: ₱${deliveryFee.toFixed(2)}%0A`;
  message += `*TOTAL: ₱${total.toFixed(2)}*%0A%0A`;
  message += `Please confirm my order! Thank you! 🙌`;

  // 3. Your brother's Facebook profile
  const pageId = "joseph.andales.12";

  // 4. Open Messenger
  const messengerUrl = `https://m.me/${pageId}?text=${message}`;
  window.open(messengerUrl, '_blank');
}


// ============================================================
// 8. INITIALIZE ON PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  // Render menu if on index/menu page
  if (document.getElementById('menu-container')) {
    renderMenu();
  }

  // Load order summary if on confirmation or tracking page
  if (document.getElementById('subtotal') || document.getElementById('order-status')) {
    loadOrderSummary();
  }

  // Update cart badge on all pages
  updateCartBadge();
});