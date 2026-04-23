(function () {
  // --- Helpers ---
  function parsePriceFromText(text) {
  if (!text) return 0;
  const digits = String(text).replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}
  function qs(sel, ctx = document) { return ctx.querySelector(sel); }
  function qsa(sel, ctx = document) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function formatCurrency(num) { return Number(num || 0).toLocaleString('vi-VN') + '₫'; }
  function escapeHtml(str = '') { return String(str || '').replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
  function uid(len = 6) { return Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 2 + len); }


  const CACHE_KEY = 'tt_products_cache_v1';
  function loadProductCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveProductCache(cache) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache || {})); } catch (e) {}
  }
  function cacheProductSnapshot(product) {
    if (!product || !product.id) return;
    const cache = loadProductCache();
    cache[product.id] = Object.assign({}, cache[product.id] || {}, {
      id: product.id,
      name: product.name || cache[product.id]?.name || '',
      price: Number(product.price) || Number(cache[product.id]?.price) || 0,
      image: product.image || cache[product.id]?.image || ''
    });
    saveProductCache(cache);
  }


  let PRODUCTS = [];
  function loadProductsFromDOM() {
  const nodes = qsa('.product-card');
  if (!nodes.length) {
    PRODUCTS = [];
    return;
  }
  PRODUCTS = nodes.map(node => {
    const id = node.dataset.id || '';
    const name = node.dataset.name || (node.querySelector('h4')?.textContent || '');
    
    let price = 0;
    if (node.dataset.price) {
      price = parseInt(node.dataset.price, 10) || 0;
    } else {
      const priceEl = node.querySelector('.price') || node.querySelector('.product-price') || node.querySelector('[data-price-text]');
      if (priceEl) price = parsePriceFromText(priceEl.textContent);
      else {
        const priceText = node.textContent.match(/[\d\.\,]+\s*₫/);
        if (priceText) price = parsePriceFromText(priceText[0]);
      }
    }
    const description = node.dataset.description || (node.querySelector('p')?.textContent || '');
    const image = node.dataset.image || (node.querySelector('img')?.src || '');
    return { id: String(id), name: String(name).trim(), price: Number(price) || 0, description: String(description).trim(), image: String(image) };
  });
}
  function findProductById(id) {
    let p = PRODUCTS.find(x => x.id === id);
    if (p) return p;
    const cache = loadProductCache();
    if (cache && cache[id]) return cache[id];
    return null;
  }

  const CART_KEY = 'tt_cart_v1';
  let cart = {}; 
  function loadCart() {
    try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}'); } catch (e) { cart = {}; }
  }
  function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart || {})); renderCartCount(); }
  function addToCart(productId, qty = 1) {
    if (!productId) return;
    if (!cart[productId]) cart[productId] = 0;
    cart[productId] += Number(qty) || 0;
    if (cart[productId] <= 0) delete cart[productId];
    const p = findProductById(productId) || null;
    if (p) cacheProductSnapshot(p);
    saveCart();
    renderCart();
  }
  function setQuantity(productId, qty) {
    if (!productId) return;
    if (qty <= 0) delete cart[productId];
    else cart[productId] = qty;
    saveCart();
    renderCart();
  }
  function removeFromCart(productId) { delete cart[productId]; saveCart(); renderCart(); }
  function cartItemsDetailed() {
    return Object.keys(cart).map(id => {
      const product = findProductById(id) || { id, name: id, price: 0, image: '' };
      return { product, qty: cart[id] };
    }).filter(i => i.product);
  }
  function cartSubtotal() {
    return cartItemsDetailed().reduce((s, it) => s + (Number(it.product.price) || 0) * (Number(it.qty) || 0), 0);
  }

  function renderCartCount() {
    const totalQty = Object.values(cart).reduce((s, x) => s + (Number(x) || 0), 0);
    qsa('.cart-count').forEach(el => el.textContent = totalQty);
  }
//cart  items
  function renderCart() {
    const itemsContainer = qs('#cartItems');
    const totalEl = qs('#cartTotal');
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '';
    const items = cartItemsDetailed();
    if (!items.length) {
      const p = document.createElement('p');
      p.textContent = 'Giỏ hàng trống.';
      itemsContainer.appendChild(p);
      if (totalEl) totalEl.textContent = formatCurrency(0);
      renderCartCount();
      return;
    }

    items.forEach(({ product, qty }) => {
      const item = document.createElement('div');
      item.className = 'cart-item';

      const img = document.createElement('img');
      img.className = 'thumb';
      img.src = product.image || '';
      img.alt = product.name || product.id;

      const meta = document.createElement('div');
      meta.className = 'meta';

      const metaTop = document.createElement('div');
      metaTop.className = 'meta-top';
      const strong = document.createElement('strong');
      strong.textContent = product.name || product.id;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'icon-btn remove';
      removeBtn.dataset.id = product.id;
      removeBtn.title = 'Xóa';
      removeBtn.textContent = '✕';

      metaTop.appendChild(strong);
      metaTop.appendChild(removeBtn);

      const priceDiv = document.createElement('div');
      priceDiv.className = 'cart-price';
      priceDiv.textContent = formatCurrency(product.price || 0);

      const qtyControls = document.createElement('div');
      qtyControls.className = 'qty-controls';
      const decr = document.createElement('button');
      decr.className = 'icon-btn qty-decr';
      decr.dataset.id = product.id;
      decr.textContent = '−';
      const input = document.createElement('input');
      input.className = 'qty-input';
      input.type = 'number';
      input.min = '1';
      input.dataset.id = product.id;
      input.value = String(qty);
      const incr = document.createElement('button');
      incr.className = 'icon-btn qty-incr';
      incr.dataset.id = product.id;
      incr.textContent = '+';

      qtyControls.appendChild(decr);
      qtyControls.appendChild(input);
      qtyControls.appendChild(incr);

      meta.appendChild(metaTop);
      meta.appendChild(priceDiv);
      meta.appendChild(qtyControls);

      item.appendChild(img);
      item.appendChild(meta);

      itemsContainer.appendChild(item);
    });

    if (totalEl) totalEl.textContent = formatCurrency(cartSubtotal());
    renderCartCount();
  }

  // --- Fly-to-cart animation (needs left/top for positioning) ---
  function animateFlyToCart(imageSrc, startRect, cartRect) {
    if (!imageSrc || !startRect || !cartRect) return;
    const img = document.createElement('img');
    img.src = imageSrc;
    img.className = 'fly-img';
    img.style.left = startRect.left + 'px';
    img.style.top = startRect.top + 'px';
    img.style.width = Math.min(startRect.width, 120) + 'px';
    img.style.opacity = '1';
    document.body.appendChild(img);

    const startCenterX = startRect.left + startRect.width / 2;
    const startCenterY = startRect.top + startRect.height / 2;
    const targetCenterX = cartRect.left + cartRect.width / 2;
    const targetCenterY = cartRect.top + cartRect.height / 2;

    const dx = targetCenterX - startCenterX;
    const dy = targetCenterY - startCenterY;

    requestAnimationFrame(() => {
      img.style.transform = `translate(${dx}px, ${dy}px) scale(0.18)`;
      img.style.opacity = '0.6';
    });

    setTimeout(() => {
      img.style.transition = 'opacity .25s ease';
      img.style.opacity = '0';
      setTimeout(() => { if (img && img.parentNode) img.parentNode.removeChild(img); }, 260);
    }, 780);
  }

  const overlayEl = qs('#pageOverlay') || qs('.overlay');
  const mobileNavEl = qs('#mobileNav');
  const cartDrawerEl = qs('#cartDrawer');

  function showOverlay() { if (!overlayEl) return; overlayEl.classList.add('visible'); document.body.classList.add('lock-scroll'); overlayEl.addEventListener('click', onOverlayClick); }
  function hideOverlay() { if (!overlayEl) return; overlayEl.classList.remove('visible'); document.body.classList.remove('lock-scroll'); overlayEl.removeEventListener('click', onOverlayClick); }
  function onOverlayClick() { if (cartDrawerEl && cartDrawerEl.classList.contains('open')) closeCart(); if (mobileNavEl && mobileNavEl.classList.contains('open')) closeMobileNav(); hideOverlay(); }

  function openMobileNav() { if (!mobileNavEl) return; mobileNavEl.classList.add('open'); showOverlay(); }
  function closeMobileNav() { if (!mobileNavEl) return; mobileNavEl.classList.remove('open'); if (!(cartDrawerEl && cartDrawerEl.classList.contains('open'))) hideOverlay(); }
  function openCart() { if (!cartDrawerEl) return; renderCart(); cartDrawerEl.classList.add('open'); showOverlay(); }
  function closeCart() { if (!cartDrawerEl) return; cartDrawerEl.classList.remove('open'); if (!(mobileNavEl && mobileNavEl.classList.contains('open'))) hideOverlay(); }

  // --- Header / product actions / cart controls ---
  function setupHeaderActions() {
    qsa('.cart-btn').forEach(btn => btn.addEventListener('click', openCart));
    qsa('#closeCart').forEach(btn => btn.addEventListener('click', closeCart));
    const hamburger = qs('#hamburger');
    if (hamburger && mobileNavEl) hamburger.addEventListener('click', () => mobileNavEl.classList.contains('open') ? closeMobileNav() : openMobileNav());
    const mobileClose = mobileNavEl ? mobileNavEl.querySelector('.mobile-close') : null;
    if (mobileClose) mobileClose.addEventListener('click', closeMobileNav);
  }

  function setupProductActions() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
     
if (action === 'add' && id) {
  
  let qty = 1;
  const card = btn.closest('.product-card') || btn.closest('.card');
  if (card) {
    const qInput = card.querySelector('.qty-input');
    if (qInput) { qty = parseInt(qInput.value, 10) || 1; if (qty < 1) qty = 1; }

    const snap = {
      id: id,
      name: (card.dataset.name && card.dataset.name.trim()) ||
            (card.querySelector('h4')?.textContent?.trim()) ||
            (findProductById(id)?.name) || id,
      price: (function() {
        const ds = card.dataset.price;
        if (ds) return parseInt(ds, 10) || 0;
        const priceEl = card.querySelector('.price');
        if (priceEl) {
          const digits = priceEl.textContent.replace(/[^\d]/g, '');
          return parseInt(digits, 10) || (findProductById(id)?.price || 0);
        }
        return findProductById(id)?.price || 0;
      })(),
      image: (card.dataset.image && card.dataset.image.trim()) ||
             (card.querySelector('img')?.src) ||
             (findProductById(id)?.image) || ''
    };
    cacheProductSnapshot(snap);
  } else {
    const p = findProductById(id);
    if (p) cacheProductSnapshot(p);
  }

  addToCart(id, qty);
  const imgEl = (card && card.querySelector('img')) ? card.querySelector('img') : null;
  const imgRect = imgEl ? imgEl.getBoundingClientRect() : null;
  const cartBtn = qs('.cart-btn'); const cartRect = cartBtn ? cartBtn.getBoundingClientRect() : null;
  if (imgEl && imgRect && cartRect) animateFlyToCart(imgEl.src, imgRect, cartRect);

  const originalHTML = btn.innerHTML;
  btn.classList.add('added');
  btn.innerHTML = '<span class="btn-icon">✓</span> Đã thêm';
  setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = originalHTML; }, 900);
}
    });
  }
function setupContactForm() {
  const form = qs('#contactForm');
  const modal = qs('#contactSuccessModal');
  if (!form) return;

  function hideContactModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    document.body.classList.remove('lock-scroll');
  }
  function showContactModal(ref) {
    if (!modal) return;
    const refEl = qs('#msgRef', modal);
    if (refEl) refEl.textContent = ref;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    document.body.classList.add('lock-scroll');
  }

  if (modal) {
    const closeBtn = modal.querySelector('.modal-close');
    const okBtn = modal.querySelector('.modal-ok');
    if (closeBtn) closeBtn.addEventListener('click', hideContactModal);
    if (okBtn) okBtn.addEventListener('click', hideContactModal);
  }

  // load/save messages
  const MSG_KEY = 'tt_messages_v1';
  function loadMessages() {
    try { return JSON.parse(localStorage.getItem(MSG_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveMessage(msg) {
    try {
      const arr = loadMessages();
      arr.unshift(msg);
      localStorage.setItem(MSG_KEY, JSON.stringify(arr.slice(0, 200)));
    } catch (e) {}
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    qsa('.field-error', form).forEach(el => el.textContent = '');

    const name = (qs('#name', form)?.value || '').trim();
    const email = (qs('#email', form)?.value || '').trim();
    const phone = (qs('#phone', form)?.value || '').trim();
    const subject = (qs('#subject', form)?.value || '').trim();
    const message = (qs('#message', form)?.value || '').trim();

    let ok = true;
    if (!name) { const el = qs('#err-name'); if (el) el.textContent = 'Vui lòng nhập họ tên.'; ok = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { const el = qs('#err-email'); if (el) el.textContent = 'Email không hợp lệ.'; ok = false; }
    if (!subject) { const el = qs('#err-subject'); if (el) el.textContent = 'Vui lòng nhập chủ đề.'; ok = false; }
    if (!message || message.length < 6) { const el = qs('#err-message'); if (el) el.textContent = 'Nội dung quá ngắn.'; ok = false; }

    if (!ok) return;

    const submitBtn = qs('#contactSubmit', form);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang gửi...';
    }

    const ref = uid(6).toUpperCase();
    const msgObj = {
      id: ref,
      name, email, phone, subject, message,
      created_at: new Date().toISOString()
    };

    setTimeout(() => {
      saveMessage(msgObj);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">✉️</span> Gửi liên hệ';
      }
      form.reset();
      showContactModal(ref);
    }, 400);
  });
}
//
  function setupCartControls() {
    const cartItems = qs('#cartItems');
    if (!cartItems) return;
    cartItems.addEventListener('click', function (e) {
      const t = e.target;
      if (t.matches('.remove')) removeFromCart(t.dataset.id);
      else if (t.matches('.qty-incr')) { const id = t.dataset.id; setQuantity(id, (cart[id] || 0) + 1); }
      else if (t.matches('.qty-decr')) { const id = t.dataset.id; setQuantity(id, (cart[id] || 1) - 1); }
    });
    cartItems.addEventListener('change', function (e) {
      const target = e.target;
      if (target.matches('.qty-input')) {
        const id = target.dataset.id;
        let v = parseInt(target.value, 10) || 1; if (v < 1) v = 1;
        setQuantity(id, v);
      }
    });

    const checkoutBtn = qs('#checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', function () {
        closeCart();
        location.href = 'checkout.html';
      });
    }
  }

 function setupProductsControls() {
  const search = qs('#searchInput');
  const sort = qs('#sortSelect');
  const grid = qs('#productGrid');
  if (!grid) return;
  const ORIGINAL_NODES = Array.from(qsa('.product-card', grid));

  function renderFromNodes(nodes) {
    grid.innerHTML = '';
    nodes.forEach(n => grid.appendChild(n));
  }

  function doRender() {
    const q = search ? search.value.trim().toLowerCase() : '';
    const sortVal = sort ? sort.value : 'default';

    if (ORIGINAL_NODES && ORIGINAL_NODES.length) {
      if (!q) {
       
        if (sortVal === 'price-asc' || sortVal === 'price-desc') {
         
          const arr = ORIGINAL_NODES.slice();
          arr.sort((a,b) => {
            const pa = parseInt(a.dataset.price || '0', 10) || 0;
            const pb = parseInt(b.dataset.price || '0', 10) || 0;
            return sortVal === 'price-asc' ? pa - pb : pb - pa;
          });
          renderFromNodes(arr);
        } else {
          renderFromNodes(ORIGINAL_NODES);
        }
        return;
      }

      
      let filtered = ORIGINAL_NODES.filter(n => {
        const name = (n.dataset.name || n.querySelector('h4')?.textContent || '').toLowerCase();
        const desc = (n.dataset.description || n.querySelector('p')?.textContent || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });

      if (sortVal === 'price-asc') filtered.sort((a,b) => (parseInt(a.dataset.price||0) - parseInt(b.dataset.price||0)));
      if (sortVal === 'price-desc') filtered.sort((a,b) => (parseInt(b.dataset.price||0) - parseInt(a.dataset.price||0)));

      renderFromNodes(filtered);
      return;
    }

    let list = PRODUCTS.slice();
    const qVal = q;
    if (qVal) list = list.filter(p => p.name.toLowerCase().includes(qVal) || p.description.toLowerCase().includes(qVal));
    if (sortVal === 'price-asc') list.sort((a,b) => a.price - b.price);
    if (sortVal === 'price-desc') list.sort((a,b) => b.price - a.price);
    grid.innerHTML = '';
    list.forEach(p => grid.appendChild(renderCardFromProduct(p)));
  }

  if (search) {
    search.addEventListener('input', doRender);
    search.addEventListener('search', doRender); 
    
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        search.value = '';
        doRender();
      }
    });
  }
  if (sort) sort.addEventListener('change', doRender);

  doRender();
}
  function initCheckoutPage() {
    const orderItemsEl = qs('#orderItems');
    const subtotalText = qs('#subtotalText');
    const shippingText = qs('#shippingText');
    const grandTotalEl = qs('#grandTotal');
    const cardFields = qs('#cardFields');

    function renderOrderSummary() {
      const items = cartItemsDetailed();
      if (!orderItemsEl) return;
      orderItemsEl.innerHTML = '';
      if (!items.length) {
        const p = document.createElement('p');
        p.innerHTML = 'Giỏ hàng trống. <a href="products.html">Mua sắm ngay</a>';
        orderItemsEl.appendChild(p);
        if (subtotalText) subtotalText.textContent = formatCurrency(0);
        if (shippingText) shippingText.textContent = formatCurrency(0);
        if (grandTotalEl) grandTotalEl.textContent = formatCurrency(0);
        return;
      }
      items.forEach(({ product, qty }) => {
        const row = document.createElement('div');
        row.className = 'order-item';

        const left = document.createElement('div');
        left.className = 'order-item-left';
        const thumb = document.createElement('img');
        thumb.className = 'thumb';
        thumb.src = product.image || '';
        thumb.alt = product.name || '';
        left.appendChild(thumb);

        const meta = document.createElement('div');
        meta.className = 'order-item-meta';
        const nameDiv = document.createElement('div'); nameDiv.className = 'order-item-name'; nameDiv.textContent = product.name;
        const qtyDiv = document.createElement('div'); qtyDiv.className = 'order-item-qty'; qtyDiv.textContent = `${formatCurrency(product.price)} × ${qty}`;
        meta.appendChild(nameDiv); meta.appendChild(qtyDiv);
        left.appendChild(meta);

        const right = document.createElement('div');
        right.className = 'order-item-right';
        right.textContent = formatCurrency((product.price || 0) * qty);

        row.appendChild(left);
        row.appendChild(right);

        orderItemsEl.appendChild(row);
      });

      const subtotal = cartSubtotal();
      const shipping = subtotal > 0 && subtotal < 300000 ? 20000 : 0;
      if (subtotalText) subtotalText.textContent = formatCurrency(subtotal);
      if (shippingText) shippingText.textContent = formatCurrency(shipping);
      if (grandTotalEl) grandTotalEl.textContent = formatCurrency(subtotal + shipping);
    }

    function onPaymentChange() {
      const val = qs('input[name="payment"]:checked')?.value;
      if (cardFields) {
        if (val === 'card') { cardFields.classList.remove('hidden'); cardFields.setAttribute('aria-hidden', 'false'); }
        else { cardFields.classList.add('hidden'); cardFields.setAttribute('aria-hidden', 'true'); }
      }
    }

    function validateCard() {
      let ok = true;
      const numEl = qs('#card_number'); const expEl = qs('#card_exp'); const cvcEl = qs('#card_cvc');
      const num = numEl ? numEl.value.replace(/\s+/g,'') : '';
      const exp = expEl ? expEl.value.trim() : '';
      const cvc = cvcEl ? cvcEl.value.trim() : '';
      ['card_number','card_exp','card_cvc'].forEach(id => { const el = qs('#err-'+id); if (el) el.textContent = ''; });
      if (!/^\d{12,19}$/.test(num)) { const el = qs('#err-card_number'); if (el) el.textContent = 'Số thẻ không hợp lệ.'; ok = false; }
      if (!/^\d{2}\/\d{2}$/.test(exp)) { const el = qs('#err-card_exp'); if (el) el.textContent = 'Định dạng MM/YY.'; ok = false; }
      if (!/^\d{3,4}$/.test(cvc)) { const el = qs('#err-card_cvc'); if (el) el.textContent = 'CVC không hợp lệ.'; ok = false; }
      return ok;
    }

    const form = qs('#checkoutForm');
    if (!form) return;
    form.addEventListener('change', onPaymentChange);
    onPaymentChange();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      ['ship_name','ship_email','ship_phone','ship_address'].forEach(id => { const el = qs('#err-'+id); if (el) el.textContent = ''; });
      const ship_name = qs('#ship_name').value.trim();
      const ship_email = qs('#ship_email').value.trim();
      const ship_phone = qs('#ship_phone').value.trim();
      const ship_address = qs('#ship_address').value.trim();
      const payment = qs('input[name="payment"]:checked')?.value || 'cod';
      let valid = true;
      if (!ship_name) { const el = qs('#err-ship_name'); if (el) el.textContent = 'Vui lòng nhập họ tên.'; valid = false; }
      if (!ship_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ship_email)) { const el = qs('#err-ship_email'); if (el) el.textContent = 'Email không hợp lệ.'; valid = false; }
      if (!ship_phone) { const el = qs('#err-ship_phone'); if (el) el.textContent = 'Vui lòng nhập số điện thoại.'; valid = false; }
      if (!ship_address) { const el = qs('#err-ship_address'); if (el) el.textContent = 'Vui lòng nhập địa chỉ giao hàng.'; valid = false; }
      if (payment === 'card' && !validateCard()) valid = false;
      if (!valid) return;

      const placeBtn = qs('#placeOrderBtn'); if (placeBtn) { placeBtn.disabled = true; placeBtn.textContent = 'Đang xử lý...'; }

      setTimeout(() => {
        const items = cartItemsDetailed();
        const subtotal = cartSubtotal();
        const shipping = subtotal > 0 && subtotal < 300000 ? 20000 : 0;
        const total = subtotal + shipping;
        const ref = uid(6).toUpperCase();
        const order = {
          id: ref,
          created_at: new Date().toISOString(),
          items: items.map(i => ({ id: i.product.id, name: i.product.name, price: i.product.price, qty: i.qty, image: i.product.image })),
          subtotal, shipping, total,
          shipping_info: { name: ship_name, email: ship_email, phone: ship_phone, address: ship_address },
          payment_method: payment,
          status: payment === 'card' ? 'paid' : 'pending'
        };
        try {
          const raw = localStorage.getItem('tt_orders_v1');
          const arr = raw ? JSON.parse(raw) : [];
          arr.unshift(order);
          localStorage.setItem('tt_orders_v1', JSON.stringify(arr.slice(0, 200)));
        } catch (e) {}
        cart = {};
        saveCart();
        location.href = 'order-success.html?order=' + encodeURIComponent(ref);
      }, 900);
    });

    renderOrderSummary();
  }

  function initOrderSuccessPage() {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('order');
    const detailsEl = qs('#orderDetails');
    if (!orderId || !detailsEl) {
      if (detailsEl) detailsEl.textContent = 'Không tìm thấy đơn hàng.';
      return;
    }
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem('tt_orders_v1') || '[]'); } catch (e) { orders = []; }
    const order = orders.find(o => o.id === orderId);
    if (!order) { detailsEl.textContent = 'Không tìm thấy đơn hàng.'; return; }

    // build DOM
    detailsEl.innerHTML = '';
    const infoList = document.createElement('div');
    const refP = document.createElement('p'); refP.innerHTML = `<strong>Mã đơn:</strong> ${escapeHtml(order.id)}`;
    const dateP = document.createElement('p'); dateP.innerHTML = `<strong>Ngày:</strong> ${new Date(order.created_at).toLocaleString()}`;
    infoList.appendChild(refP);
    infoList.appendChild(dateP);

    const shipH = document.createElement('h3'); shipH.textContent = 'Người nhận';
    const shipP = document.createElement('p'); shipP.textContent = `${order.shipping_info.name} — ${order.shipping_info.phone}`;
    const addrP = document.createElement('p'); addrP.textContent = order.shipping_info.address;

    const itemsH = document.createElement('h3'); itemsH.textContent = 'Chi tiết đơn';
    const itemsDiv = document.createElement('div');
    order.items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'order-item';
      const left = document.createElement('div'); left.className = 'order-item-left';
      const name = document.createElement('div'); name.textContent = `${it.name} × ${it.qty}`;
      left.appendChild(name);
      const right = document.createElement('div'); right.textContent = formatCurrency(it.price * it.qty);
      row.appendChild(left); row.appendChild(right);
      itemsDiv.appendChild(row);
    });

    const totalDiv = document.createElement('div'); totalDiv.style.marginTop = '12px'; totalDiv.innerHTML = `<strong>Tổng: ${formatCurrency(order.total)}</strong>`;
    const payP = document.createElement('p'); payP.className = 'muted'; payP.textContent = `Phương thức thanh toán: ${order.payment_method}`;

    detailsEl.appendChild(infoList);
    detailsEl.appendChild(shipH);
    detailsEl.appendChild(shipP);
    detailsEl.appendChild(addrP);
    detailsEl.appendChild(itemsH);
    detailsEl.appendChild(itemsDiv);
    detailsEl.appendChild(totalDiv);
    detailsEl.appendChild(payP);
  }

  function initCommon() {
    loadProductsFromDOM();
    loadCart();
    renderCartCount();
    renderCart();
    setupHeaderActions();
    setupProductActions();
    setupCartControls();
    setupProductsControls();
    setupContactForm();
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (mobileNavEl && mobileNavEl.classList.contains('open')) closeMobileNav();
        if (cartDrawerEl && cartDrawerEl.classList.contains('open')) closeCart();
      }
    });
  }

  function initPageSpecific() {
    const path = location.pathname.split('/').pop();
    if (path === 'checkout.html') initCheckoutPage();
    if (path === 'order-success.html') initOrderSuccessPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initCommon(); initPageSpecific(); });
  } else {
    initCommon(); initPageSpecific();
  }
})();