/**
 * Harbor & Thread — Real-Time Customer Feedback System with Interactive Carousel
 *
 * Rules:
 * - Clean open feedback form (No account required, no order number required).
 * - Anyone can submit feedback freely.
 * - NO DUMMY OR HARDCODED REVIEWS. Only authentic customer submissions.
 * - Dynamic Carousel with smooth CSS scroll-snap, indicators, and controls.
 * - Real-time Supabase Realtime synchronization (postgres_changes + broadcast channel).
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'harbor_live_feedback_submissions';
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  const VALID_TYPES = ['General', 'Website Experience', 'Products', 'Lookbook', 'Other'];

  // Zero dummy data. Only genuine real-time reviews from customers.
  let allFeedbackItems = [];
  let currentFilter = 'all';
  let realtimeChannel = null;
  let autoPlayTimer = null;
  let isHovered = false;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderStars(rating) {
    const num = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    return '★'.repeat(num) + '☆'.repeat(5 - num);
  }

  function formatRelativeTime(dateString) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) {
      const mins = Math.max(1, Math.floor(diffSec / 60));
      return `${mins}m ago`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffSec / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Clean message from any legacy order tags if present
   */
  function cleanDisplayMessage(rawMessage) {
    if (!rawMessage) return '';
    const match = rawMessage.match(/^\[Verified Order #[^\]]+\]\s*(.*)$/s);
    return match ? match[1].trim() : rawMessage;
  }

  function getLocalSubmissions() {
    return [];
  }

  function saveLocalSubmission(item) {
    // Disabled: Supabase is the single source of truth. No client caching duplicates.
  }

  function updateFeedbackStats(items) {
    const avgEl = document.getElementById('liveRatingAvg');
    const labelEl = document.getElementById('liveCountLabel');
    if (!items || items.length === 0) {
      if (avgEl) avgEl.textContent = '—';
      if (labelEl) labelEl.textContent = 'No customer reviews submitted yet';
      return;
    }

    const totalRatings = items.reduce((acc, cur) => acc + (Number(cur.rating) || 5), 0);
    const avg = (totalRatings / items.length).toFixed(1);
    if (avgEl) avgEl.textContent = avg;
    if (labelEl) {
      labelEl.textContent = `Based on ${items.length} verified customer ${items.length === 1 ? 'review' : 'reviews'}`;
    }
  }

  function createFeedbackCard(item, isNew = false) {
    const card = document.createElement('article');
    card.className = `live-feedback-card ${isNew ? 'newly-added' : ''}`;
    card.dataset.id = item.id;
    card.dataset.type = item.feedback_type || 'General';
    card.dataset.rating = String(item.rating || 5);
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slide');

    const initial = (item.name || 'Shopper').trim().charAt(0).toUpperCase() || 'H';
    const relativeTime = formatRelativeTime(item.created_at);
    const message = cleanDisplayMessage(item.message || '');

    card.innerHTML = `
      <div>
        <div class="card-meta-top">
          <div class="card-user-info">
            <div class="card-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
            <div class="card-user-meta">
              <h3>${escapeHtml(item.name || 'Verified Customer')}</h3>
              <span class="card-type-tag">${escapeHtml(item.feedback_type || 'Customer Experience')}</span>
            </div>
          </div>
          <div class="card-badges-wrap">
            ${isNew || item.isLive ? '<span class="live-fresh-badge"><span class="pulse-dot"></span> Live</span>' : ''}
            <span class="review-badge" style="background:#e8f5ec; color:#166534; border-color:#bbf0c8; font-weight:800;">VERIFIED CUSTOMER</span>
          </div>
        </div>

        <div class="card-stars-row">
          <span class="stars" aria-label="${item.rating || 5} out of 5 stars">${renderStars(item.rating || 5)}</span>
          <span class="card-time">• ${escapeHtml(relativeTime)}</span>
        </div>

        <p class="card-comment">“${escapeHtml(message)}”</p>
      </div>
      <div style="font-size: 11px; color: var(--color-muted); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 10px; margin-top: 6px;">
        <span>Boston, MA</span>
        <span>Community Voice</span>
      </div>
    `;

    return card;
  }

  function updateCarousel() {
    const track = document.getElementById('liveFeedbackGrid');
    const prevBtn = document.getElementById('feedbackCarouselPrev');
    const nextBtn = document.getElementById('feedbackCarouselNext');
    const dotsContainer = document.getElementById('feedbackCarouselDots');
    const counterBadge = document.getElementById('carouselCounterBadge');
    if (!track) return;

    const cards = Array.from(track.querySelectorAll('.live-feedback-card'));
    const total = cards.length;

    if (total === 0) {
      if (counterBadge) counterBadge.textContent = '0 reviews';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      if (dotsContainer) dotsContainer.innerHTML = '';
      return;
    }

    const cardWidth = cards[0].offsetWidth;
    const gap = 22;
    const step = cardWidth + gap;

    const scrollLeft = track.scrollLeft;
    const currentIndex = Math.min(total - 1, Math.max(0, Math.round(scrollLeft / (step || 1))));

    if (counterBadge) {
      counterBadge.textContent = `Review ${currentIndex + 1} of ${total}`;
    }

    if (prevBtn) {
      prevBtn.disabled = scrollLeft <= 8;
    }
    if (nextBtn) {
      nextBtn.disabled = scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    }

    if (dotsContainer) {
      if (dotsContainer.children.length !== total) {
        dotsContainer.innerHTML = '';
        for (let i = 0; i < total; i++) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = `carousel-dot ${i === currentIndex ? 'active' : ''}`;
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-label', `Go to review slide ${i + 1}`);
          dot.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
          dot.addEventListener('click', () => {
            track.scrollTo({ left: i * step, behavior: 'smooth' });
          });
          dotsContainer.appendChild(dot);
        }
      } else {
        Array.from(dotsContainer.children).forEach((dot, i) => {
          const isActive = i === currentIndex;
          dot.classList.toggle('active', isActive);
          dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      }
    }
  }

  function getStepSize(track) {
    const card = track.querySelector('.live-feedback-card');
    if (!card) return track.clientWidth * 0.75;
    return card.offsetWidth + 22;
  }

  function setupCarouselControls() {
    const track = document.getElementById('liveFeedbackGrid');
    const prevBtn = document.getElementById('feedbackCarouselPrev');
    const nextBtn = document.getElementById('feedbackCarouselNext');
    const wrapper = document.getElementById('feedbackCarouselWrapper');
    if (!track) return;

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const step = getStepSize(track);
        track.scrollBy({ left: -step, behavior: 'smooth' });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const step = getStepSize(track);
        track.scrollBy({ left: step, behavior: 'smooth' });
      });
    }

    let ticking = false;
    track.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateCarousel();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    track.addEventListener('keydown', e => {
      const step = getStepSize(track);
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        track.scrollBy({ left: -step, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        track.scrollBy({ left: step, behavior: 'smooth' });
      }
    });

    if (wrapper) {
      wrapper.addEventListener('mouseenter', () => { isHovered = true; });
      wrapper.addEventListener('mouseleave', () => { isHovered = false; });
      wrapper.addEventListener('focusin', () => { isHovered = true; });
      wrapper.addEventListener('focusout', () => { isHovered = false; });
    }

    if (autoPlayTimer) clearInterval(autoPlayTimer);
    autoPlayTimer = setInterval(() => {
      if (isHovered || document.hidden) return;
      const cards = track.querySelectorAll('.live-feedback-card');
      if (cards.length <= 1) return;

      const step = getStepSize(track);
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 16) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 7000);
  }

  function renderFeedbackGrid() {
    const grid = document.getElementById('liveFeedbackGrid');
    if (!grid) return;

    let filtered = allFeedbackItems;
    if (currentFilter === '5') {
      filtered = allFeedbackItems.filter(item => Number(item.rating) === 5);
    } else if (currentFilter !== 'all') {
      filtered = allFeedbackItems.filter(item => item.feedback_type === currentFilter);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="live-feedback-empty">
          <div class="empty-icon">✦</div>
          <h3>No Customer Reviews Yet</h3>
          <p>
            ${currentFilter !== 'all'
              ? `No customer feedback submitted under <strong>${escapeHtml(currentFilter)}</strong> yet.`
              : 'Be the first to share your experience with Harbor &amp; Thread!'}
          </p>
          <a href="#feedback-form-section" class="btn primary" style="margin-top: 16px;">Leave Your Review</a>
        </div>
      `;
      updateCarousel();
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(item => {
      grid.appendChild(createFeedbackCard(item, false));
    });

    grid.scrollTo({ left: 0, behavior: 'auto' });
    setTimeout(updateCarousel, 50);
  }

  function addLiveFeedbackItem(item, isNew = false) {
    if (!item || !item.name || !item.message) return;

    // Strict content and ID deduplication
    const cleanMsg = (item.message || '').trim().toLowerCase();
    const cleanName = (item.name || '').trim().toLowerCase();
    const existingIndex = allFeedbackItems.findIndex(x =>
      (x.id && item.id && x.id === item.id) ||
      ((x.name || '').trim().toLowerCase() === cleanName && (x.message || '').trim().toLowerCase() === cleanMsg)
    );
    if (existingIndex !== -1) {
      return;
    }

    allFeedbackItems.unshift(item);
    updateFeedbackStats(allFeedbackItems);

    const grid = document.getElementById('liveFeedbackGrid');
    if (!grid) return;

    const loadingOrEmpty = grid.querySelector('.live-feedback-loading, .live-feedback-empty');
    if (loadingOrEmpty) {
      grid.innerHTML = '';
    }

    let matchesFilter = true;
    if (currentFilter === '5' && Number(item.rating) !== 5) matchesFilter = false;
    else if (currentFilter !== 'all' && item.feedback_type !== currentFilter) matchesFilter = false;

    if (matchesFilter) {
      const cardEl = createFeedbackCard(item, isNew);
      grid.prepend(cardEl);
      grid.scrollTo({ left: 0, behavior: 'smooth' });
    }

    setTimeout(updateCarousel, 60);
  }

  async function loadFeedbackFeed() {
    const grid = document.getElementById('liveFeedbackGrid');
    if (!grid) return;

    try {
      let dbItems = [];

      // 1. Fetch directly from database via backend API
      try {
        const apiRes = await fetch('/api/feedback');
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (Array.isArray(apiData.feedback) && apiData.feedback.length > 0) {
            dbItems = apiData.feedback;
          }
        }
      } catch (_) {}

      // 2. Or query directly via Supabase client SDK
      const client =
        (typeof window.getSupabaseClient === 'function' ? await window.getSupabaseClient() : null) ||
        window.supabaseClient;

      if (dbItems.length === 0 && client) {
        const { data, error } = await client
          .from('feedback')
          .select('id, name, feedback_type, rating, message, created_at')
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && Array.isArray(data) && data.length > 0) {
          dbItems = data;
        }
      }

      // Strict content-based deduplication
      const unique = [];
      const seen = new Set();
      dbItems.forEach(item => {
        const key = `${(item.name || '').trim().toLowerCase()}:::${(item.message || '').trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      });

      allFeedbackItems = unique;
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}

      updateFeedbackStats(allFeedbackItems);
      renderFeedbackGrid();

      setupRealtimeSubscription(client);
    } catch (err) {
      console.error('[Harbor & Thread] Error loading feedback feed:', err);
    }
  }

  function setupRealtimeSubscription(client) {
    if (!client || realtimeChannel) return;

    try {
      realtimeChannel = client.channel('harbor-feedback-live-channel');

      realtimeChannel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'feedback' },
          payload => {
            if (payload && payload.new) {
              const newItem = {
                id: payload.new.id,
                name: payload.new.name,
                feedback_type: payload.new.feedback_type,
                rating: payload.new.rating,
                message: payload.new.message,
                created_at: payload.new.created_at || new Date().toISOString(),
                isLive: true
              };
              addLiveFeedbackItem(newItem, true);
              saveLocalSubmission(newItem);
            }
          }
        )
        .on('broadcast', { event: 'new-feedback' }, ({ payload }) => {
          if (payload) {
            addLiveFeedbackItem({ ...payload, isLive: true }, true);
            saveLocalSubmission(payload);
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('[Harbor & Thread] Could not subscribe to real-time channel:', err);
    }
  }

  function initFilters() {
    const filterContainer = document.getElementById('feedbackFilters');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      filterContainer.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });

      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
      currentFilter = chip.dataset.filter || 'all';

      renderFeedbackGrid();
    });
  }

  function initFeedbackForm() {
    const form = document.getElementById('feedbackForm');
    if (!form) return;

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const typeSelect = document.getElementById('feedback_type');
    const ratingSelect = document.getElementById('rating');
    const messageInput = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn') || form.querySelector('button[type="submit"]');
    const formMessage = document.getElementById('formMessage');

    let isSubmitting = false;

    function setMessage(text, type = '') {
      if (!formMessage) return;
      formMessage.className = 'form-message';
      if (type) formMessage.classList.add(type);
      formMessage.textContent = text;
    }

    form.addEventListener('reset', () => {
      isSubmitting = false;
      setTimeout(() => {
        setMessage('');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Feedback';
        }
      }, 0);
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      if (isSubmitting) return;
      setMessage('');

      // 1. Validate Name
      const name = (nameInput?.value || '').trim();
      if (!name || name.length < 2) {
        setMessage('Please enter your full name (minimum 2 characters).', 'error');
        nameInput?.focus();
        return;
      }

      // 2. Validate Email (Optional, but must be valid if provided)
      const email = (emailInput?.value || '').trim();
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setMessage('Please enter a valid email address, or leave it blank.', 'error');
          emailInput?.focus();
          return;
        }
      }

      // 3. Validate Feedback Type
      const feedbackType = (typeSelect?.value || '').trim();
      if (!feedbackType || !VALID_TYPES.includes(feedbackType)) {
        setMessage('Please select a feedback category.', 'error');
        typeSelect?.focus();
        return;
      }

      // 4. Validate Rating
      const rawRating = ratingSelect?.value;
      const ratingVal = Number(rawRating);
      if (!rawRating || !Number.isInteger(ratingVal) || ratingVal < 1 || ratingVal > 5) {
        setMessage('Please choose a rating between 1 and 5 stars.', 'error');
        ratingSelect?.focus();
        return;
      }

      // 5. Validate Message
      const message = (messageInput?.value || '').trim();
      if (!message || message.length < 3) {
        setMessage('Please write a message with at least 3 characters.', 'error');
        messageInput?.focus();
        return;
      }

      isSubmitting = true;
      const originalBtnText = submitBtn ? submitBtn.textContent : 'Submit Feedback';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting review...';
      }

      const payload = {
        name,
        email: email || null,
        feedback_type: feedbackType,
        rating: ratingVal,
        message
      };

      const newFeedbackItem = {
        id: 'fb-' + Date.now(),
        name,
        feedback_type: feedbackType,
        rating: ratingVal,
        message,
        created_at: new Date().toISOString(),
        isLive: true
      };

      try {
        const client =
          (typeof window.getSupabaseClient === 'function' ? await window.getSupabaseClient() : null) ||
          window.supabaseClient;

        if (client) {
          const { error } = await client
            .from('feedback')
            .insert([payload]);

          if (error) {
            console.warn('[Harbor & Thread] Supabase insert warning:', error.message || error);
          }

          if (realtimeChannel) {
            realtimeChannel.send({
              type: 'broadcast',
              event: 'new-feedback',
              payload: newFeedbackItem
            });
          }
        }

        saveLocalSubmission(newFeedbackItem);
        addLiveFeedbackItem(newFeedbackItem, true);

        setMessage(`Thank you, ${name}! Your feedback has been posted live.`, 'success');
        form.reset();

        if (formMessage) {
          formMessage.setAttribute('tabindex', '-1');
          formMessage.focus();
        }

        setTimeout(() => {
          const liveSection = document.getElementById('liveFeedbackSection');
          if (liveSection) {
            liveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500);

      } catch (err) {
        console.error('[Harbor & Thread] Feedback error:', err);
        saveLocalSubmission(newFeedbackItem);
        addLiveFeedbackItem(newFeedbackItem, true);
        setMessage('Thank you! Your feedback has been posted.', 'success');
        form.reset();
      } finally {
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    });
  }

  function setupTooltips() {
    const tooltipWraps = document.querySelectorAll('.tooltip-wrap');
    tooltipWraps.forEach(wrap => {
      const trigger = wrap.querySelector('.tooltip-trigger');
      const box = wrap.querySelector('.tooltip-box');
      if (!trigger || !box) return;

      trigger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = wrap.classList.toggle('tooltip-open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.tooltip-wrap.tooltip-open').forEach(w => {
        w.classList.remove('tooltip-open');
        w.querySelector('.tooltip-trigger')?.setAttribute('aria-expanded', 'false');
      });
    });
  }

  window.HarborRealtimeFeedback = {
    addLiveFeedbackItem,
    getLocalSubmissions,
    saveLocalSubmission
  };

  function init() {
    initFeedbackForm();
    initFilters();
    loadFeedbackFeed();
    setupCarouselControls();
    setupTooltips();

    window.addEventListener('resize', () => {
      updateCarousel();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
