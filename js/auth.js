/**
 * Harbor & Thread — Customer Authentication Module (Supabase Auth)
 *
 * Implements:
 * - Customer Sign In (email / password)
 * - Customer Sign Up (email / password with confirm check, min 8 chars)
 * - Customer Sign Out
 * - Password Reset Request (email instructions)
 * - Session Detection & onAuthStateChange Listener
 *
 * Security & Best Practices:
 * - Uses shared Supabase client initialized with Publishable Key
 * - No custom password tables or raw credential exposure
 * - Translates raw Auth errors into friendly customer messages
 */

(function () {
  'use strict';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function translateAuthError(err) {
    if (!err) return 'An unexpected error occurred. Please try again.';
    const msg = (err.message || '').toLowerCase();

    if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
      return 'Incorrect email or password. Please verify your details and try again.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Please confirm your email address before signing in. Check your inbox for the confirmation link.';
    }
    if (msg.includes('user already registered') || msg.includes('already exists')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (msg.includes('password should be at least')) {
      return 'Password must be at least 8 characters long.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Too many attempts. Please wait a few moments before trying again.';
    }
    return err.message || 'Unable to complete your request. Please try again.';
  }

  function initAccountAuth() {
    const authTabs = document.getElementById('authTabs');
    const panelSignIn = document.getElementById('panelSignIn');
    const panelSignUp = document.getElementById('panelSignUp');
    const panelReset = document.getElementById('panelReset');
    const accountStateCard = document.getElementById('accountStateCard');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const authMessage = document.getElementById('authMessage');

    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const signOutBtn = document.getElementById('signOutBtn');

    const linkToReset = document.getElementById('linkToReset');
    const linkToSignIn = document.getElementById('linkToSignIn');

    // Return early if not on account page
    if (!authTabs && !signInForm && !accountStateCard) return;

    function setMessage(text, type = '') {
      if (!authMessage) return;
      authMessage.className = 'form-message';
      if (type) authMessage.classList.add(type);
      authMessage.textContent = text;
    }

    function switchTab(tabName) {
      setMessage('');
      const tabButtons = authTabs?.querySelectorAll('.auth-tab-btn') || [];
      tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });

      if (panelSignIn) panelSignIn.classList.toggle('active', tabName === 'signin');
      if (panelSignUp) panelSignUp.classList.toggle('active', tabName === 'signup');
      if (panelReset) panelReset.classList.toggle('active', tabName === 'reset');
    }

    // Tab buttons event listeners
    authTabs?.addEventListener('click', e => {
      const btn = e.target.closest('.auth-tab-btn');
      if (btn && btn.dataset.tab) {
        switchTab(btn.dataset.tab);
      }
    });

    linkToReset?.addEventListener('click', () => switchTab('reset'));
    linkToSignIn?.addEventListener('click', () => switchTab('signin'));

    // Render Authenticated or Guest View
    function renderAuthState(user) {
      if (user) {
        if (authTabs) authTabs.style.display = 'none';
        if (panelSignIn) panelSignIn.style.display = 'none';
        if (panelSignUp) panelSignUp.style.display = 'none';
        if (panelReset) panelReset.style.display = 'none';

        if (accountStateCard) accountStateCard.style.display = 'block';
        if (userEmailDisplay) userEmailDisplay.textContent = user.email || 'Member';
      } else {
        if (authTabs) authTabs.style.display = 'flex';
        if (panelSignIn) panelSignIn.style.display = '';
        if (panelSignUp) panelSignUp.style.display = '';
        if (panelReset) panelReset.style.display = '';

        if (accountStateCard) accountStateCard.style.display = 'none';
      }
    }

    // 1. Sign In Handler
    signInForm?.addEventListener('submit', async e => {
      e.preventDefault();
      setMessage('');

      const emailInput = document.getElementById('signInEmail');
      const passwordInput = document.getElementById('signInPassword');
      const submitBtn = document.getElementById('signInBtn');

      const email = (emailInput?.value || '').trim().toLowerCase();
      const password = passwordInput?.value || '';

      if (!email || !EMAIL_REGEX.test(email)) {
        setMessage('Please enter a valid email address.', 'error');
        emailInput?.focus();
        return;
      }
      if (!password) {
        setMessage('Please enter your password.', 'error');
        passwordInput?.focus();
        return;
      }

      const origText = submitBtn ? submitBtn.textContent : 'Sign In';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';
      }

      try {
        const client =
          (typeof window.getSupabaseClient === 'function' ? await window.getSupabaseClient() : null) ||
          window.supabaseClient;

        if (!client) throw new Error('Supabase client unavailable.');

        const { data, error } = await client.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        setMessage('Signed in successfully. Welcome back!', 'success');
        signInForm.reset();
        renderAuthState(data.user);
      } catch (err) {
        console.error('[Harbor & Thread] Sign in error:', err);
        setMessage(translateAuthError(err), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origText;
        }
      }
    });

    // 2. Sign Up Handler
    signUpForm?.addEventListener('submit', async e => {
      e.preventDefault();
      setMessage('');

      const emailInput = document.getElementById('signUpEmail');
      const passwordInput = document.getElementById('signUpPassword');
      const confirmInput = document.getElementById('signUpConfirmPassword');
      const submitBtn = document.getElementById('signUpBtn');

      const email = (emailInput?.value || '').trim().toLowerCase();
      const password = passwordInput?.value || '';
      const confirm = confirmInput?.value || '';

      if (!email || !EMAIL_REGEX.test(email)) {
        setMessage('Please enter a valid email address.', 'error');
        emailInput?.focus();
        return;
      }
      if (!password || password.length < 8) {
        setMessage('Password must be at least 8 characters long.', 'error');
        passwordInput?.focus();
        return;
      }
      if (password !== confirm) {
        setMessage('Passwords do not match. Please re-enter.', 'error');
        confirmInput?.focus();
        return;
      }

      const origText = submitBtn ? submitBtn.textContent : 'Create Account';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
      }

      try {
        const client =
          (typeof window.getSupabaseClient === 'function' ? await window.getSupabaseClient() : null) ||
          window.supabaseClient;

        if (!client) throw new Error('Supabase client unavailable.');

        const { data, error } = await client.auth.signUp({
          email,
          password
        });

        if (error) throw error;

        if (data.session) {
          setMessage('Account created successfully! Welcome to Harbor & Thread.', 'success');
          signUpForm.reset();
          renderAuthState(data.user);
        } else {
          setMessage(
            'Account created! A confirmation welcome email has been sent to your inbox.',
            'success'
          );
          signUpForm.reset();
        }

        // Send confirmation email via backend
        fetch('/api/auth/welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, action: 'signup' })
        }).then(r => r.json()).then(res => {
          if (res.emailPreview && window.HarborEmailNotifier) {
            window.HarborEmailNotifier.notify(res.emailPreview);
          }
        }).catch(() => {});
      } catch (err) {
        console.error('[Harbor & Thread] Sign up error:', err);
        setMessage(translateAuthError(err), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origText;
        }
      }
    });

    // 3. Password Reset Handler
    resetPasswordForm?.addEventListener('submit', async e => {
      e.preventDefault();
      setMessage('');

      const emailInput = document.getElementById('resetEmail');
      const submitBtn = document.getElementById('resetBtn');

      const email = (emailInput?.value || '').trim().toLowerCase();

      if (!email || !EMAIL_REGEX.test(email)) {
        setMessage('Please enter a valid email address.', 'error');
        emailInput?.focus();
        return;
      }

      const origText = submitBtn ? submitBtn.textContent : 'Send Reset Instructions';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending Instructions...';
      }

      try {
        const client =
          (typeof window.getSupabaseClient === 'function' ? await window.getSupabaseClient() : null) ||
          window.supabaseClient;

        if (!client) throw new Error('Supabase client unavailable.');

        const redirectUrl = window.location.origin + '/account.html';
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });

        if (error) throw error;

        setMessage('Password reset instructions have been sent to your email.', 'success');
        resetPasswordForm.reset();
      } catch (err) {
        console.error('[Harbor & Thread] Password reset error:', err);
        setMessage(translateAuthError(err), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origText;
        }
      }
    });

    // 4. Sign Out Handler
    signOutBtn?.addEventListener('click', async () => {
      setMessage('');
      signOutBtn.disabled = true;
      signOutBtn.textContent = 'Signing Out...';

      try {
        const client =
          (typeof window.getSupabaseClient === 'function' ? await window.getSupabaseClient() : null) ||
          window.supabaseClient;

        if (client) {
          await client.auth.signOut();
        }

        renderAuthState(null);
        switchTab('signin');
        setMessage('You have been signed out.', 'success');
      } catch (err) {
        console.error('[Harbor & Thread] Sign out error:', err);
        setMessage('Failed to sign out. Please try again.', 'error');
      } finally {
        signOutBtn.disabled = false;
        signOutBtn.textContent = 'Sign Out';
      }
    });

    // 5. Initial Session Detection & Auth State Listener
    async function checkInitialSession() {
      try {
        const client =
          (typeof window.getSupabaseClient === 'function' ? await window.getSupabaseClient() : null) ||
          window.supabaseClient;

        if (!client) return;

        const { data: { session }, error } = await client.auth.getSession();
        if (!error && session?.user) {
          renderAuthState(session.user);
        } else {
          renderAuthState(null);
        }

        // Listen for live auth changes (e.g. sign in, sign out, token refresh)
        client.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            renderAuthState(session.user);
            fetchOrdersForCustomer(session.user.email);
          } else {
            renderAuthState(null);
          }
        });
      } catch (err) {
        console.error('[Harbor & Thread] Session check error:', err);
        renderAuthState(null);
      }
    }

    // 6. Order Tracking & Customer Order History Integration
    const orderSearchInput = document.getElementById('orderSearchInput');
    const lookupOrderBtn = document.getElementById('lookupOrderBtn');
    const orderHistoryResults = document.getElementById('orderHistoryResults');

    async function fetchOrdersForCustomer(query) {
      if (!orderHistoryResults) return;
      const clean = (query || '').trim();
      if (!clean) return;

      orderHistoryResults.innerHTML = '<p style="color: var(--color-muted); font-size: 13px;">Searching database for orders...</p>';

      const isOrderNum = clean.toUpperCase().startsWith('HT-');
      const url = isOrderNum
        ? `/api/orders?orderNumber=${encodeURIComponent(clean.toUpperCase())}`
        : `/api/orders?email=${encodeURIComponent(clean.toLowerCase())}`;

      try {
        const res = await fetch(url);
        const data = await res.json();

        let ordersList = [];
        if (data.order) ordersList = [data.order];
        else if (Array.isArray(data.orders)) ordersList = data.orders;

        if (ordersList.length === 0) {
          orderHistoryResults.innerHTML = `
            <div style="background: #faf7f4; border: 1px dashed var(--color-border); border-radius: 8px; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 13.5px; color: var(--color-muted);">No orders found matching <strong>${clean}</strong>.</p>
            </div>
          `;
          return;
        }

        orderHistoryResults.innerHTML = '';
        ordersList.forEach(order => {
          let parsedItems = [];
          try {
            parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
          } catch (_) { parsedItems = []; }

          const card = document.createElement('div');
          card.style.background = '#faf8f5';
          card.style.border = '1px solid var(--color-border)';
          card.style.borderRadius = '10px';
          card.style.padding = '18px';
          card.style.marginBottom = '14px';

          const formattedDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }) : 'Recently placed';

          const itemsHtml = parsedItems.map(item => `
            <li style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px;">
              <span>${item.name || 'Item'} × ${item.quantity || 1}</span>
              <span style="font-weight: 600;">$${((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}</span>
            </li>
          `).join('');

          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div>
                <strong style="color: var(--color-accent); font-size: 15px;">${order.order_number}</strong>
                <span style="font-size: 12px; color: var(--color-muted); margin-left: 8px;">• ${formattedDate}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: #e8f5ec; color: #166534; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 999px;">
                  ${(order.status || 'CONFIRMED').toUpperCase()}
                </span>
                <button type="button" class="btn secondary order-card-receipt-btn" style="font-size: 11px; padding: 4px 10px; border-radius: 999px; cursor: pointer;">
                  📄 View Receipt
                </button>
              </div>
            </div>
            <ul style="list-style: none; padding: 0; margin: 0 0 12px;">
              ${itemsHtml}
            </ul>
            <div style="border-top: 1px dashed var(--color-border); padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
              <span style="color: var(--color-muted); font-size: 12.5px;">Deliver to: ${order.shipping_city || 'Boston'}, ${order.shipping_state || 'MA'}</span>
              <strong style="font-size: 16px;">Total: $${Number(order.total || 0).toFixed(2)}</strong>
            </div>
          `;

          const receiptBtn = card.querySelector('.order-card-receipt-btn');
          receiptBtn?.addEventListener('click', () => {
            if (window.HarborEmailNotifier) {
              window.HarborEmailNotifier.preview(order);
            } else {
              window.open(`/api/orders/receipt?orderNumber=${encodeURIComponent(order.order_number)}`, '_blank');
            }
          });

          orderHistoryResults.appendChild(card);
        });
      } catch (err) {
        orderHistoryResults.innerHTML = '<p style="color: #a84232; font-size: 13px;">Error fetching order details. Please try again.</p>';
      }
    }

    lookupOrderBtn?.addEventListener('click', () => {
      fetchOrdersForCustomer(orderSearchInput?.value);
    });

    orderSearchInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchOrdersForCustomer(orderSearchInput?.value);
      }
    });

    // Check if customer had any recent order in localStorage to display by default
    try {
      const localOrders = JSON.parse(localStorage.getItem('harbor_customer_orders') || '[]');
      if (localOrders.length > 0 && orderSearchInput && !orderSearchInput.value) {
        fetchOrdersForCustomer(localOrders[0].order_number);
      }
    } catch (_) {}

    // Listen for live order placement events to refresh immediately
    window.addEventListener('harbor:orderPlaced', e => {
      if (e.detail && (e.detail.order_number || e.detail.customer_email)) {
        fetchOrdersForCustomer(e.detail.order_number || e.detail.customer_email);
      }
    });

    checkInitialSession();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountAuth);
  } else {
    initAccountAuth();
  }
})();
