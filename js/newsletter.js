/**
 * Harbor & Thread — Newsletter Subscription & Email Confirmation
 *
 * Requirements:
 * - Submits to /api/newsletter (with persistent storage & automatic confirmation email)
 * - Also synchronizes with Supabase public.newsletter_subscribers if available
 * - Triggers live Email Confirmation Preview toast and notification
 * - Validates emails strictly and handles duplicates gracefully
 */

(function () {
  'use strict';

  function initNewsletterForms() {
    const forms = document.querySelectorAll('form.newsletter');
    if (!forms.length) return;

    forms.forEach(form => {
      if (form.dataset.newsletterInitialized === 'true') return;
      form.dataset.newsletterInitialized = 'true';

      const emailInput = form.querySelector('input[type="email"]');
      const submitBtn = form.querySelector('button[type="submit"]');

      let isSubmitting = false;

      function getOrCreateMessageElement() {
        let messageEl = form.parentElement?.querySelector('.newsletter-message');
        if (!messageEl) {
          messageEl = document.createElement('div');
          messageEl.className = 'newsletter-message';
          messageEl.setAttribute('role', 'status');
          messageEl.setAttribute('aria-live', 'polite');
          form.insertAdjacentElement('afterend', messageEl);
        }
        return messageEl;
      }

      function setMessage(text, type = '') {
        const el = getOrCreateMessageElement();
        el.className = 'newsletter-message' + (type ? ' ' + type : '');
        el.textContent = text;
      }

      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (isSubmitting) return;

        setMessage('');

        const rawValue = emailInput?.value || '';
        const normalizedEmail = rawValue.trim().toLowerCase();
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

        if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
          setMessage('Please enter a valid email address.', 'error');
          emailInput?.focus();
          return;
        }

        isSubmitting = true;
        const originalBtnText = submitBtn ? submitBtn.textContent : 'Join';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending...';
        }

        try {
          // 1. Post to backend server (saves subscriber & dispatches confirmation email)
          const res = await fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedEmail, source: 'website_newsletter' })
          });

          const data = await res.json();

          if (res.ok && data.success) {
            setMessage(
              "You're now part of the Harbor & Thread circle! A confirmation email with your 15% VIP invitation code has been sent to your inbox.",
              'success'
            );
            if (emailInput) emailInput.value = '';

            // Trigger Email Notification Toast & Preview
            if (data.emailPreview && window.HarborEmailNotifier) {
              window.HarborEmailNotifier.notify(data.emailPreview);
            }
          } else {
            setMessage(data.error || "We couldn't add you right now. Please try again.", 'error');
          }

          // 2. Also attempt Supabase insert in background
          try {
            const client =
              (typeof window.getSupabaseClient === 'function' ? await window.getSupabaseClient() : null) ||
              window.supabaseClient;
            if (client) {
              await client.from('newsletter_subscribers').insert([{ email: normalizedEmail }]);
            }
          } catch (_) {}

        } catch (err) {
          console.error('[Newsletter error]:', err);
          setMessage("We couldn't add you right now. Please try again.", 'error');
        } finally {
          isSubmitting = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsletterForms);
  } else {
    initNewsletterForms();
  }

  window.initNewsletterForms = initNewsletterForms;
})();
