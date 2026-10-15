/**
 * Harbor & Thread — Full-Stack Shopping Cart & Checkout System
 *
 * Implements:
 * - Persistent cart management in localStorage (harbor_cart_items)
 * - Dynamic slide-out drawer with CSS transitions
 * - Massachusetts State Sales Tax (6.25%) calculation
 * - Boston shipping logistics ($0 over $150 or $12 standard courier)
 * - Full-stack order placement via POST /api/orders (Supabase database backed)
 * - Order confirmation receipt with order numbers (HT-2026-XXXX)
 * - Global event hooks for adding items from Home and Lookbook pages
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'harbor_cart_items';
  const ORDERS_STORAGE_KEY = 'harbor_customer_orders';
  const MA_TAX_RATE = 0.0625;
  const FREE_SHIPPING_THRESHOLD = 150.00;
  const STANDARD_SHIPPING_FEE = 12.00;

  let cart = loadCart();

  function loadCart() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not save cart:', e);
    }
    updateCartUI();
  }

  function getTotals() {
    const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const tax = parseFloat((subtotal * MA_TAX_RATE).toFixed(2));
    const shipping = subtotal === 0 ? 0 : (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE);
    const total = parseFloat((subtotal + tax + shipping).toFixed(2));
    const itemCount = cart.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax,
      shipping,
      total,
      itemCount,
      amountToFreeShipping: Math.max(0, parseFloat((FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)))
    };
  }

  function addToCart(product, quantity = 1) {
    if (!product || !product.id) return;

    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
      cart[existingIndex].quantity = (Number(cart[existingIndex].quantity) || 1) + quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name || 'Boston Fashion Item',
        price: Number(product.price) || 0,
        image_url: product.image_url || 'images/outfit.jpg',
        quantity: quantity,
        category: product.category || 'Clothing'
      });
    }

    saveCart();
    bounceBadge();
    openCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
  }

  function updateQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity = (Number(item.quantity) || 1) + delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      saveCart();
    }
  }

  function clearCart() {
    cart = [];
    saveCart();
  }

  function bounceBadge() {
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(b => {
      b.classList.add('bounce');
      setTimeout(() => b.classList.remove('bounce'), 300);
    });
  }

  function openCart() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (!drawer || !overlay) return;

    drawer.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (!drawer || !overlay) return;

    drawer.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function buildCartDrawerDOM() {
    if (document.getElementById('cartDrawer')) return;

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'cartDrawerOverlay';
    overlay.className = 'cart-drawer-overlay';
    overlay.addEventListener('click', closeCart);
    document.body.appendChild(overlay);

    // Drawer
    const drawer = document.createElement('aside');
    drawer.id = 'cartDrawer';
    drawer.className = 'cart-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Shopping Bag');

    drawer.innerHTML = `
      <div class="cart-drawer-head">
        <h3>🛍 Your Shopping Bag</h3>
        <button type="button" class="cart-drawer-close" id="closeCartDrawer" aria-label="Close bag">×</button>
      </div>

      <div class="cart-shipping-banner" id="cartShippingBanner">
        <div id="cartShippingText">Add items for Complimentary Boston Delivery over $150</div>
        <div class="cart-shipping-bar-track">
          <div class="cart-shipping-bar-fill" id="cartShippingFill" style="width: 0%;"></div>
        </div>
      </div>

      <div class="cart-items-container" id="cartItemsContainer"></div>

      <div class="cart-drawer-foot">
        <div class="cart-summary-line">
          <span>Subtotal</span>
          <span id="cartSubtotalVal">$0.00</span>
        </div>
        <div class="cart-summary-line">
          <span>MA Sales Tax (6.25%)</span>
          <span id="cartTaxVal">$0.00</span>
        </div>
        <div class="cart-summary-line">
          <span>Boston Shipping</span>
          <span id="cartShippingVal">$0.00</span>
        </div>
        <div class="cart-summary-line total-line">
          <span>Estimated Total</span>
          <span id="cartTotalVal">$0.00</span>
        </div>
        <button type="button" class="cart-checkout-btn" id="openCheckoutModalBtn">
          Proceed to Checkout →
        </button>
      </div>
    `;

    document.body.appendChild(drawer);

    document.getElementById('closeCartDrawer')?.addEventListener('click', closeCart);
    document.getElementById('openCheckoutModalBtn')?.addEventListener('click', () => {
      closeCart();
      openCheckoutModal();
    });

    buildCheckoutModalDOM();
  }

  function buildCheckoutModalDOM() {
    if (document.getElementById('checkoutModalBackdrop')) return;

    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'checkoutModalBackdrop';
    modalBackdrop.className = 'checkout-modal-backdrop';

    modalBackdrop.innerHTML = `
      <div class="checkout-modal-box">
        <button type="button" id="closeCheckoutModal" style="position: absolute; top: 16px; right: 16px; background: none; border: 0; font-size: 24px; cursor: pointer;">×</button>
        
        <div id="checkoutFormContent">
          <h3>Harbor &amp; Thread Checkout</h3>
          <p class="checkout-sub-note">Direct dispatch from our Boston, Massachusetts boutique.</p>

          <form id="checkoutOrderForm" novalidate>
            <div class="checkout-input-group">
              <label for="checkoutName">Full Name *</label>
              <input type="text" id="checkoutName" required placeholder="Jane Doe" autocomplete="name">
            </div>

            <div class="checkout-input-group">
              <label for="checkoutEmail">Email Address *</label>
              <input type="email" id="checkoutEmail" required placeholder="jane@example.com" autocomplete="email">
            </div>

            <div class="checkout-input-group">
              <label for="checkoutAddress">Street Address *</label>
              <input type="text" id="checkoutAddress" required placeholder="140 Newbury Street, Apt 3B" autocomplete="street-address">
            </div>

            <div class="checkout-input-row">
              <div class="checkout-input-group">
                <label for="checkoutCity">City *</label>
                <input type="text" id="checkoutCity" required value="Boston" autocomplete="address-level2">
              </div>
              <div class="checkout-input-group">
                <label for="checkoutZip">ZIP Code *</label>
                <input type="text" id="checkoutZip" required placeholder="02116" autocomplete="postal-code">
              </div>
            </div>

            <div style="background: #faf7f4; border: 1px solid var(--color-border); border-radius: 8px; padding: 14px; margin: 16px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                <span>Total Items</span>
                <span id="checkoutItemCount" style="font-weight: 700;">0</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800;">
                <span>Final Order Total (Incl. MA Tax)</span>
                <span id="checkoutOrderTotal" style="color: var(--color-accent);">$0.00</span>
              </div>
            </div>

            <div id="checkoutMessage" class="form-message" style="margin-bottom: 14px;"></div>

            <button type="submit" class="cart-checkout-btn" id="submitOrderBtn" style="margin-top: 0;">
              Confirm &amp; Place Order ✦
            </button>
          </form>
        </div>

        <div id="checkoutSuccessContent" style="display: none;" class="order-success-screen">
          <div class="success-badge-icon">✓</div>
          <h3>Thank you for your order!</h3>
          <p style="color: var(--color-muted); font-size: 14px;">
            Your order has been received and confirmed in our Boston studio.
          </p>
          <div class="order-number-pill" id="successOrderNumber">HT-2026-0000</div>
          
          <div style="text-align: left; background: #faf7f4; border: 1px solid var(--color-border); border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px;">
            <div style="margin-bottom: 6px;"><strong>Recipient:</strong> <span id="successCustomerName"></span></div>
            <div style="margin-bottom: 6px;"><strong>Delivery To:</strong> <span id="successAddress"></span></div>
            <div style="margin-bottom: 6px;"><strong>Total Paid:</strong> <span id="successTotal" style="font-weight: 700; color: var(--color-accent);">$0.00</span></div>
            <div><strong>Status:</strong> <span style="color: #1b7340; font-weight: 700;">Confirmed (Preparing Shipment)</span></div>
          </div>

          <div style="display: flex; gap: 8px; justify-content: center; margin-top: 20px; flex-wrap: wrap;">
            <button type="button" class="btn primary" id="viewEmailReceiptBtn" style="font-size: 13px;">📄 View &amp; Print Receipt</button>
            <a href="account.html" class="btn secondary" style="font-size: 13px;">Track in Account</a>
            <button type="button" class="btn ghost" id="continueShoppingBtn" style="font-size: 13px;">Continue Shopping</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalBackdrop);

    document.getElementById('closeCheckoutModal')?.addEventListener('click', closeCheckoutModal);
    modalBackdrop.addEventListener('click', e => {
      if (e.target === modalBackdrop) closeCheckoutModal();
    });

    document.getElementById('continueShoppingBtn')?.addEventListener('click', () => {
      closeCheckoutModal();
    });

    setupCheckoutForm();
  }

  function openCheckoutModal() {
    const totals = getTotals();
    if (totals.itemCount === 0) {
      alert('Your shopping bag is empty.');
      return;
    }

    const modal = document.getElementById('checkoutModalBackdrop');
    if (!modal) return;

    document.getElementById('checkoutFormContent').style.display = 'block';
    document.getElementById('checkoutSuccessContent').style.display = 'none';

    document.getElementById('checkoutItemCount').textContent = totals.itemCount;
    document.getElementById('checkoutOrderTotal').textContent = `$${totals.total.toFixed(2)}`;

    // Auto-fill logged-in customer info if available
    try {
      const emailField = document.getElementById('checkoutEmail');
      const nameField = document.getElementById('checkoutName');
      const userDisplay = document.getElementById('userEmailDisplay');
      if (emailField && !emailField.value && userDisplay && userDisplay.textContent && userDisplay.textContent.includes('@')) {
        emailField.value = userDisplay.textContent.trim();
      }
      // Check last order for name/address convenience
      const lastOrders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
      if (lastOrders.length > 0) {
        if (nameField && !nameField.value && lastOrders[0].customer_name) {
          nameField.value = lastOrders[0].customer_name;
        }
        if (emailField && !emailField.value && lastOrders[0].customer_email) {
          emailField.value = lastOrders[0].customer_email;
        }
        const addrField = document.getElementById('checkoutAddress');
        if (addrField && !addrField.value && lastOrders[0].shipping_address) {
          addrField.value = lastOrders[0].shipping_address;
        }
        const zipField = document.getElementById('checkoutZip');
        if (zipField && !zipField.value && lastOrders[0].shipping_zip) {
          zipField.value = lastOrders[0].shipping_zip;
        }
      }
    } catch (_) {}

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModalBackdrop');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function setupCheckoutForm() {
    const form = document.getElementById('checkoutOrderForm');
    if (!form) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const nameInput = document.getElementById('checkoutName');
      const emailInput = document.getElementById('checkoutEmail');
      const addressInput = document.getElementById('checkoutAddress');
      const cityInput = document.getElementById('checkoutCity');
      const zipInput = document.getElementById('checkoutZip');
      const msgEl = document.getElementById('checkoutMessage');
      const submitBtn = document.getElementById('submitOrderBtn');

      const name = (nameInput?.value || '').trim();
      const email = (emailInput?.value || '').trim();
      const address = (addressInput?.value || '').trim();
      const city = (cityInput?.value || 'Boston').trim();
      const zip = (zipInput?.value || '').trim();

      if (!name || name.length < 2) {
        msgEl.className = 'form-message error';
        msgEl.textContent = 'Please enter your full customer name.';
        return;
      }
      if (!email || !email.includes('@')) {
        msgEl.className = 'form-message error';
        msgEl.textContent = 'Please enter a valid email address.';
        return;
      }
      if (!address || !zip) {
        msgEl.className = 'form-message error';
        msgEl.textContent = 'Please enter your shipping address and ZIP code.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing order...';
      msgEl.textContent = '';

      const payload = {
        customerName: name,
        customerEmail: email,
        shippingAddress: address,
        shippingCity: city,
        shippingState: 'MA',
        shippingZip: zip,
        items: [...cart]
      };

      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success && data.order) {
          const order = data.order;
          
          // Save in localStorage orders history
          try {
            const existingOrders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
            existingOrders.unshift(order);
            localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(existingOrders));
          } catch (_) {}

          // Dual-save directly to Supabase client if loaded
          try {
            const client = window.supabaseClient || (typeof window.getSupabaseClient === 'function' ? window.getSupabaseClient() : null);
            if (client && typeof client.from === 'function') {
              client.from('orders').insert([{
                order_number: order.order_number,
                customer_name: name,
                customer_email: email,
                shipping_address: address,
                shipping_city: city,
                shipping_state: 'MA',
                shipping_zip: zip,
                subtotal: order.subtotal,
                tax: order.tax,
                shipping: order.shipping,
                total: order.total,
                status: 'confirmed',
                items: order.items
              }]).then(() => {}).catch(() => {});
            }
          } catch (_) {}

          // Show success screen
          document.getElementById('checkoutFormContent').style.display = 'none';
          const successContent = document.getElementById('checkoutSuccessContent');
          successContent.style.display = 'block';

          document.getElementById('successOrderNumber').textContent = order.order_number;
          document.getElementById('successCustomerName').textContent = name;
          document.getElementById('successAddress').textContent = `${address}, ${city}, MA ${zip}`;
          const totalEl = document.getElementById('successTotal');
          if (totalEl) totalEl.textContent = `$${Number(order.total || 0).toFixed(2)}`;

          // Wire View Receipt button directly
          const viewReceiptBtn = document.getElementById('viewEmailReceiptBtn');
          if (viewReceiptBtn) {
            viewReceiptBtn.style.display = 'inline-block';
            viewReceiptBtn.onclick = () => {
              if (window.HarborEmailNotifier) {
                window.HarborEmailNotifier.preview(data.emailPreview || order);
              } else {
                window.open(`/api/orders/receipt?orderNumber=${encodeURIComponent(order.order_number)}`, '_blank');
              }
            };
          }

          // Trigger email confirmation notification toast
          if (window.HarborEmailNotifier) {
            window.HarborEmailNotifier.notify(data.emailPreview || {
              type: 'order_confirmation',
              order_number: order.order_number,
              to: email
            });
          }

          // Trigger global event for account page
          try {
            window.dispatchEvent(new CustomEvent('harbor:orderPlaced', { detail: order }));
          } catch (_) {}

          clearCart();
        } else {
          msgEl.className = 'form-message error';
          msgEl.textContent = data.error || 'Unable to place order. Please try again.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm & Place Order ✦';
        }
      } catch (err) {
        console.error('Checkout error:', err);
        msgEl.className = 'form-message error';
        msgEl.textContent = 'Network error placing order. Please try again.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm & Place Order ✦';
      }
    });
  }

  function updateCartUI() {
    const totals = getTotals();

    // 1. Update header badges
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(b => {
      b.textContent = totals.itemCount;
      b.style.display = totals.itemCount > 0 ? 'inline-flex' : 'none';
    });

    // 2. Update shipping progress bar
    const shippingBanner = document.getElementById('cartShippingBanner');
    const shippingText = document.getElementById('cartShippingText');
    const shippingFill = document.getElementById('cartShippingFill');
    if (shippingBanner && shippingText && shippingFill) {
      if (totals.subtotal === 0) {
        shippingText.textContent = 'Add items for Complimentary Boston Delivery over $150';
        shippingFill.style.width = '0%';
      } else if (totals.amountToFreeShipping === 0) {
        shippingText.innerHTML = '<strong>Complimentary Boston Courier Unlocked!</strong>';
        shippingFill.style.width = '100%';
      } else {
        const pct = Math.min(100, Math.round((totals.subtotal / FREE_SHIPPING_THRESHOLD) * 100));
        shippingText.textContent = `Add $${totals.amountToFreeShipping.toFixed(2)} more for Free Shipping`;
        shippingFill.style.width = `${pct}%`;
      }
    }

    // 3. Render items list
    const container = document.getElementById('cartItemsContainer');
    if (container) {
      if (cart.length === 0) {
        container.innerHTML = `
          <div class="cart-empty-state">
            <span class="cart-empty-icon">🛍</span>
            <h4>Your Shopping Bag is Empty</h4>
            <p style="font-size: 13px; margin: 0 0 16px;">Explore our Boston fashion collection and discover everyday essentials.</p>
            <a href="index.html#shop" class="btn primary" onclick="window.HarborCart.closeCart();">Start Shopping</a>
          </div>
        `;
      } else {
        container.innerHTML = '';
        cart.forEach(item => {
          const row = document.createElement('div');
          row.className = 'cart-item-card';

          const lineTotal = ((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2);

          row.innerHTML = `
            <img src="${item.image_url || 'images/outfit.jpg'}" alt="${item.name}" class="cart-item-thumb">
            <div class="cart-item-details">
              <h4>${item.name}</h4>
              <div class="cart-item-price">$${Number(item.price).toFixed(2)}</div>
              <div class="cart-item-actions">
                <button type="button" class="cart-qty-btn dec" data-id="${item.id}" aria-label="Decrease quantity">−</button>
                <span class="cart-qty-display">${item.quantity}</span>
                <button type="button" class="cart-qty-btn inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
                <button type="button" class="cart-remove-item" data-id="${item.id}">Remove</button>
              </div>
            </div>
            <div class="cart-item-total">$${lineTotal}</div>
          `;

          row.querySelector('.cart-qty-btn.dec')?.addEventListener('click', () => updateQuantity(item.id, -1));
          row.querySelector('.cart-qty-btn.inc')?.addEventListener('click', () => updateQuantity(item.id, 1));
          row.querySelector('.cart-remove-item')?.addEventListener('click', () => removeFromCart(item.id));

          container.appendChild(row);
        });
      }
    }

    // 4. Update financials in drawer footer
    const subtotalEl = document.getElementById('cartSubtotalVal');
    const taxEl = document.getElementById('cartTaxVal');
    const shippingEl = document.getElementById('cartShippingVal');
    const totalEl = document.getElementById('cartTotalVal');
    const checkoutBtn = document.getElementById('openCheckoutModalBtn');

    if (subtotalEl) subtotalEl.textContent = `$${totals.subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${totals.tax.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = totals.shipping === 0 ? (totals.subtotal > 0 ? 'FREE' : '$0.00') : `$${totals.shipping.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${totals.total.toFixed(2)}`;

    if (checkoutBtn) {
      checkoutBtn.disabled = cart.length === 0;
    }
  }

  function setupHeaderCartButtons() {
    // Look for all 🛍 links/buttons across topbars
    const bagButtons = document.querySelectorAll('a[title="Shop Collection"], a[aria-label="Shop Collection"], .icon-btn');
    bagButtons.forEach(btn => {
      if (btn.textContent.includes('🛍')) {
        btn.classList.add('cart-icon-btn');
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', 'Open Shopping Bag');
        btn.href = '#';

        // Add badge if missing
        if (!btn.querySelector('.cart-count-badge')) {
          const badge = document.createElement('span');
          badge.className = 'cart-count-badge';
          badge.textContent = '0';
          badge.style.display = 'none';
          btn.appendChild(badge);
        }

        btn.addEventListener('click', e => {
          e.preventDefault();
          openCart();
        });
      }
    });

    // Also inject "Add to Bag 🛍" button into the Quick View modal on product cards
    const modalBottom = document.querySelector('#productModal .modal-bottom-actions') ||
                        document.querySelector('#productModal .modal-details');
    if (modalBottom && !document.getElementById('modalAddToCartBtn')) {
      const addBtn = document.createElement('button');
      addBtn.id = 'modalAddToCartBtn';
      addBtn.type = 'button';
      addBtn.className = 'btn primary';
      addBtn.style.marginTop = '12px';
      addBtn.style.width = '100%';
      addBtn.textContent = 'Add to Bag 🛍';
      addBtn.addEventListener('click', () => {
        const modal = document.getElementById('productModal');
        const id = modal?.dataset?.currentProductId;
        const name = document.getElementById('modalTitle')?.textContent;
        const priceText = document.getElementById('modalPrice')?.textContent?.replace('$', '');
        const img = document.getElementById('modalImage')?.src;

        addToCart({
          id: id || 'prod-' + Date.now(),
          name: name || 'Boston Fashion Item',
          price: parseFloat(priceText) || 95,
          image_url: img || 'images/outfit.jpg'
        });

        // Close modal
        if (typeof modal?.close === 'function') modal.close();
        else modal?.removeAttribute('open');
      });

      modalBottom.appendChild(addBtn);
    }
  }

  function init() {
    buildCartDrawerDOM();
    setupHeaderCartButtons();
    updateCartUI();
  }

  window.HarborCart = {
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    openCart,
    closeCart,
    getTotals
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
