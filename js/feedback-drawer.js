/**
 * Harbor & Thread — Interactive Slide-Out Feedback Drawer
 *
 * Provides:
 * - Slide-out drawer accessible from any page via Feedback buttons
 * - Live customer review feed
 * - Instant rating and feedback submission without leaving current page
 * - Connects to /api/feedback backend and Supabase
 */

(function () {
  'use strict';

  function initFeedbackDrawer() {
    // Check if drawer already exists
    if (document.getElementById('feedbackDrawer')) return;

    // Create drawer DOM
    const drawerBackdrop = document.createElement('div');
    drawerBackdrop.id = 'feedbackDrawerBackdrop';
    drawerBackdrop.className = 'feedback-drawer-backdrop';

    const drawer = document.createElement('aside');
    drawer.id = 'feedbackDrawer';
    drawer.className = 'feedback-drawer';
    drawer.setAttribute('aria-label', 'Customer Feedback Drawer');
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');

    drawer.innerHTML = `
      <div class="feedback-drawer-header">
        <div>
          <span class="drawer-eyebrow">Harbor &amp; Thread Boston</span>
          <h2>Customer Voice &amp; Reviews</h2>
        </div>
        <button type="button" class="close-drawer-btn" id="closeFeedbackDrawerBtn" aria-label="Close feedback drawer">×</button>
      </div>

      <div class="drawer-rating-summary">
        <div class="rating-large">4.9 <span>/ 5.0</span></div>
        <div class="rating-details">
          <div class="stars-gold">★★★★★</div>
          <p>Based on 140+ verified New England customer reviews</p>
        </div>
      </div>

      <div class="drawer-tabs">
        <button type="button" class="drawer-tab-btn active" data-tab="form">Leave Feedback</button>
        <button type="button" class="drawer-tab-btn" data-tab="reviews">Recent Reviews</button>
      </div>

      <!-- Tab 1: Submit Feedback Form -->
      <div class="drawer-panel active" id="drawerPanelForm">
        <form id="drawerFeedbackForm" novalidate>
          <div class="field" style="margin-bottom: 12px;">
            <label for="drawerFbName">Your Name *</label>
            <input type="text" id="drawerFbName" placeholder="e.g. Marcus Vance" required>
          </div>

          <div class="field" style="margin-bottom: 12px;">
            <label for="drawerFbEmail">Email Address (Optional)</label>
            <input type="email" id="drawerFbEmail" placeholder="e.g. marcus@example.com">
          </div>

          <div class="field" style="margin-bottom: 12px;">
            <label for="drawerFbType">Feedback Category</label>
            <select id="drawerFbType">
              <option value="General">General Experience</option>
              <option value="Products">Garment Quality &amp; Sizing</option>
              <option value="Website Experience">Website &amp; Ordering</option>
              <option value="Lookbook">Seasonal Style Edit</option>
            </select>
          </div>

          <div class="field" style="margin-bottom: 12px;">
            <label>Your Rating</label>
            <div class="drawer-star-selector" id="drawerStarSelector">
              <button type="button" class="star-btn active" data-val="1">★</button>
              <button type="button" class="star-btn active" data-val="2">★</button>
              <button type="button" class="star-btn active" data-val="3">★</button>
              <button type="button" class="star-btn active" data-val="4">★</button>
              <button type="button" class="star-btn active" data-val="5">★</button>
              <input type="hidden" id="drawerRatingVal" value="5">
            </div>
          </div>

          <div class="field" style="margin-bottom: 16px;">
            <label for="drawerFbMessage">Comments or Styling Notes *</label>
            <textarea id="drawerFbMessage" placeholder="Share your experience with our Boston collection..." required rows="4"></textarea>
          </div>

          <div id="drawerFormMessage" class="form-message" style="margin-bottom: 14px;"></div>

          <button type="submit" class="btn primary" id="drawerSubmitBtn" style="width: 100%; border-radius: 999px; height: 44px;">
            Submit Feedback ✦
          </button>
        </form>
      </div>

      <!-- Tab 2: Recent Reviews Stream -->
      <div class="drawer-panel" id="drawerPanelReviews">
        <div class="drawer-reviews-list" id="drawerReviewsList">
          <div class="drawer-review-card">
            <div class="rev-header">
              <strong>Julian R.</strong>
              <span class="stars-gold">★★★★★</span>
            </div>
            <p>"The double-faced wool trench coat exceeded all expectations. The drape and warmth in Boston autumn wind are incredible."</p>
            <small>Verified Buyer • Beacon Hill</small>
          </div>

          <div class="drawer-review-card">
            <div class="rev-header">
              <strong>Eleanor V.</strong>
              <span class="stars-gold">★★★★★</span>
            </div>
            <p>"Seamless ordering and the packaging was museum-grade. The Commonwealth Watch has become my daily staple."</p>
            <small>Verified Buyer • Back Bay</small>
          </div>

          <div class="drawer-review-card">
            <div class="rev-header">
              <strong>Thomas K.</strong>
              <span class="stars-gold">★★★★★</span>
            </div>
            <p>"Love the Boston heritage aesthetic. True craftsmanship and ethical tailoring at a very reasonable price point."</p>
            <small>Verified Buyer • Seaport</small>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(drawerBackdrop);
    document.body.appendChild(drawer);

    // Event handlers
    function openDrawer() {
      drawerBackdrop.classList.add('open');
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawerBackdrop.classList.remove('open');
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    }

    window.openFeedbackDrawer = openDrawer;
    window.closeFeedbackDrawer = closeDrawer;

    document.getElementById('closeFeedbackDrawerBtn')?.addEventListener('click', closeDrawer);
    drawerBackdrop.addEventListener('click', closeDrawer);

    // Star selector in drawer
    const starBtns = drawer.querySelectorAll('.drawer-star-selector .star-btn');
    const ratingInput = document.getElementById('drawerRatingVal');

    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val, 10);
        if (ratingInput) ratingInput.value = val;
        starBtns.forEach(s => {
          const sVal = parseInt(s.dataset.val, 10);
          s.classList.toggle('active', sVal <= val);
        });
      });
    });

    // Tab switching
    const tabs = drawer.querySelectorAll('.drawer-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const isForm = tab.dataset.tab === 'form';
        document.getElementById('drawerPanelForm').classList.toggle('active', isForm);
        document.getElementById('drawerPanelReviews').classList.toggle('active', !isForm);
      });
    });

    // Form submission
    const form = document.getElementById('drawerFeedbackForm');
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const name = (document.getElementById('drawerFbName')?.value || '').trim();
      const email = (document.getElementById('drawerFbEmail')?.value || '').trim();
      const type = document.getElementById('drawerFbType')?.value || 'General';
      const rating = parseInt(ratingInput?.value, 10) || 5;
      const message = (document.getElementById('drawerFbMessage')?.value || '').trim();
      const msgEl = document.getElementById('drawerFormMessage');
      const submitBtn = document.getElementById('drawerSubmitBtn');

      if (!name || name.length < 2) {
        msgEl.className = 'form-message error';
        msgEl.textContent = 'Please enter your name.';
        return;
      }
      if (!message || message.length < 3) {
        msgEl.className = 'form-message error';
        msgEl.textContent = 'Please provide a short feedback message.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, feedback_type: type, rating, message })
        });
        const data = await res.json();

        msgEl.className = 'form-message success';
        msgEl.textContent = 'Thank you! Your feedback has been received.';
        form.reset();

        // Prepend to reviews list
        const reviewsList = document.getElementById('drawerReviewsList');
        if (reviewsList) {
          const newCard = document.createElement('div');
          newCard.className = 'drawer-review-card';
          newCard.innerHTML = `
            <div class="rev-header">
              <strong>${name}</strong>
              <span class="stars-gold">${'★'.repeat(rating)}</span>
            </div>
            <p>"${message}"</p>
            <small>Just now • ${type}</small>
          `;
          reviewsList.insertBefore(newCard, reviewsList.firstChild);
        }

        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Feedback ✦';
        }, 1500);
      } catch (err) {
        msgEl.className = 'form-message error';
        msgEl.textContent = 'Could not submit feedback. Please try again.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback ✦';
      }
    });

    // Attach openDrawer to all feedback trigger elements
    function bindFeedbackTriggers() {
      const triggers = document.querySelectorAll(
        '.header-feedback-btn, .sidebar-feedback, .feedback-fab, [data-action="open-feedback"]'
      );
      triggers.forEach(el => {
        el.addEventListener('click', e => {
          // If already on feedback.html, allow normal link or open drawer if hash
          if (window.location.pathname.endsWith('feedback.html') && el.getAttribute('href')?.startsWith('#')) {
            return;
          }
          e.preventDefault();
          openDrawer();
        });
      });
    }

    bindFeedbackTriggers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeedbackDrawer);
  } else {
    initFeedbackDrawer();
  }
})();
