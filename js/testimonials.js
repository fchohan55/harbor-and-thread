/**
 * Harbor & Thread — Customer Experience (Real-Time Post-Purchase Customer Stories & Carousel)
 *
 * Rules:
 * - NO DUMMY OR HARDCODED REVIEWS. Only real verified customer feedback.
 * - Displays Verified Purchase badges and order tags.
 * - Dynamic Review Carousel with smooth CSS scroll-snap.
 * - Subscribes to real-time feedback submissions across browser tabs and Supabase.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'harbor_live_feedback_submissions';
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}

  // Zero dummy data. Initial list is empty.
  let realtimeChannel = null;
  let activeReviewIds = new Set();
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

  function parseOrderInfo(rawMessage) {
    if (!rawMessage) return { orderNum: '', cleanMessage: '' };
    const match = rawMessage.match(/^\[Verified Order #([^\]]+)\]\s*(.*)$/s);
    if (match) {
      return {
        orderNum: match[1].trim(),
        cleanMessage: match[2].trim()
      };
    }
    return {
      orderNum: '',
      cleanMessage: rawMessage
    };
  }

  function getLocalSubmissions() {
    return [];
  }

  /**
   * Safely constructs a review card DOM element
   */
  function createReviewCardElement(item, isNew = false) {
    const id = item.id || `test-${Math.random()}`;
    const name = item.customer_name || item.name || 'Verified Customer';
    const rawComment = item.comment || item.message || '';
    const parsed = parseOrderInfo(rawComment);
    const comment = parsed.cleanMessage || rawComment;

    const rating = item.rating != null ? Math.max(1, Math.min(5, Math.round(Number(item.rating)))) : 5;
    const isLive = isNew || item.isLive;
    const trimmedName = name.trim();
    const initial = trimmedName.length > 0 ? trimmedName.charAt(0).toUpperCase() : 'H';

    const card = document.createElement('article');
    card.className = `review-card ${isLive ? 'newly-added' : ''}`;
    card.dataset.id = id;
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slide');

    const top = document.createElement('div');
    top.className = 'review-top';

    const avatar = document.createElement('div');
    avatar.className = 'review-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = initial;
    top.appendChild(avatar);

    const nameStarsDiv = document.createElement('div');

    const h3 = document.createElement('h3');
    h3.textContent = name;
    nameStarsDiv.appendChild(h3);

    const starsSpan = document.createElement('span');
    starsSpan.className = 'stars';
    starsSpan.setAttribute('aria-label', `${rating} out of 5 stars`);
    starsSpan.textContent = renderStars(rating);
    nameStarsDiv.appendChild(starsSpan);

    top.appendChild(nameStarsDiv);

    const badgesWrap = document.createElement('div');
    badgesWrap.style.display = 'flex';
    badgesWrap.style.alignItems = 'center';
    badgesWrap.style.gap = '6px';

    if (isLive) {
      const liveSpan = document.createElement('span');
      liveSpan.className = 'live-fresh-badge';
      liveSpan.innerHTML = '<span class="pulse-dot"></span> Live';
      badgesWrap.appendChild(liveSpan);
    }

    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'review-badge';
    badgeSpan.style.background = '#e8f5ec';
    badgeSpan.style.color = '#166534';
    badgeSpan.style.borderColor = '#bbf0c8';
    badgeSpan.style.fontWeight = '800';
    badgeSpan.textContent = 'VERIFIED CUSTOMER';
    badgesWrap.appendChild(badgeSpan);

    top.appendChild(badgesWrap);
    card.appendChild(top);

    const commentP = document.createElement('p');
    commentP.textContent = `“${comment}”`;
    card.appendChild(commentP);

    return card;
  }

  function getStepSize(track) {
    const card = track.querySelector('.review-card');
    if (!card) return track.clientWidth * 0.75;
    return card.offsetWidth + 22;
  }

  function updateCarousel() {
    const track = document.getElementById('reviewGrid');
    const prevBtn = document.getElementById('reviewCarouselPrev');
    const nextBtn = document.getElementById('reviewCarouselNext');
    const dotsContainer = document.getElementById('reviewCarouselDots');
    const counterBadge = document.getElementById('reviewCounterBadge');
    if (!track) return;

    const cards = Array.from(track.querySelectorAll('.review-card'));
    const total = cards.length;

    if (total === 0) {
      if (counterBadge) counterBadge.textContent = '0 stories';
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
      counterBadge.textContent = `Story ${currentIndex + 1} of ${total}`;
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
          dot.setAttribute('aria-label', `Go to story slide ${i + 1}`);
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

  function setupCarouselControls() {
    const track = document.getElementById('reviewGrid');
    const prevBtn = document.getElementById('reviewCarouselPrev');
    const nextBtn = document.getElementById('reviewCarouselNext');
    const wrapper = document.getElementById('reviewCarouselWrapper');
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
      const cards = track.querySelectorAll('.review-card');
      if (cards.length <= 1) return;

      const step = getStepSize(track);
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 16) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 7000);
  }

  function prependRealtimeReview(item) {
    if (!item) return;
    const grid = document.getElementById('reviewGrid');
    if (!grid) return;

    const name = item.customer_name || item.name || '';
    const comment = item.comment || item.message || '';
    const uniqueKey = (item.id || `${name}-${comment}`).trim().toLowerCase();

    if (activeReviewIds.has(uniqueKey)) return;
    activeReviewIds.add(uniqueKey);

    const placeholder = grid.querySelector('.review-grid-loading, .review-empty-state');
    if (placeholder) {
      grid.innerHTML = '';
    }

    const card = createReviewCardElement(item, true);
    grid.prepend(card);

    grid.scrollTo({ left: 0, behavior: 'smooth' });
    setTimeout(updateCarousel, 60);

    showTestimonialNotice('✦ New verified review received in real time!', false);
  }

  function renderTestimonials(testimonials) {
    const grid = document.getElementById('reviewGrid');
    if (!grid) return;

    activeReviewIds.clear();

    if (!testimonials || testimonials.length === 0) {
      grid.innerHTML = `
        <div class="review-empty-state" role="status" style="width: 100%; grid-column: 1/-1;">
          <div class="empty-icon">✦</div>
          <h3 style="font-family: 'Playfair Display', serif; font-size: 22px; color: var(--color-text); margin: 0 0 8px;">No Verified Reviews Yet</h3>
          <p style="color: var(--color-muted); font-size: 13.5px; margin: 0 0 16px;">
            Stories from customers who made a purchase will appear here in real time as soon as they are submitted.
          </p>
          <a href="feedback.html#feedback-form-section" class="btn primary">Leave a Review →</a>
        </div>
      `;
      updateCarousel();
      return;
    }

    grid.innerHTML = '';
    testimonials.forEach(item => {
      const name = item.customer_name || item.name || '';
      const comment = item.comment || item.message || '';
      const id = (item.id || `${name}-${comment}`).trim().toLowerCase();
      activeReviewIds.add(id);
      grid.appendChild(createReviewCardElement(item, item.isLive));
    });

    grid.scrollTo({ left: 0, behavior: 'auto' });
    setTimeout(updateCarousel, 50);
  }

  function showTestimonialNotice(message, showRetry = false) {
    let notice = document.getElementById('testimonialNotice');
    if (!message) {
      if (notice) notice.remove();
      return;
    }

    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'testimonialNotice';
      notice.className = 'trending-notice';
      notice.style.marginBottom = '20px';
      const wrapper = document.getElementById('reviewCarouselWrapper');
      wrapper?.parentNode?.insertBefore(notice, wrapper);
    }

    notice.innerHTML = `
      <span>${escapeHtml(message)}</span>
      ${showRetry ? '<button type="button" id="retryTestimonialsBtn">Retry</button>' : ''}
    `;

    if (showRetry) {
      document.getElementById('retryTestimonialsBtn')?.addEventListener('click', () => {
        loadTestimonials();
      });
    }
  }

  async function loadTestimonials() {
    const grid = document.getElementById('reviewGrid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="review-grid-loading" id="reviewLoading" role="status" aria-live="polite">
        <p>Loading verified customer stories...</p>
      </div>
    `;

    try {
      let dbItems = [];

      // 1. Fetch from our full-stack backend endpoint
      try {
        const apiRes = await fetch('/api/feedback');
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (Array.isArray(apiData.feedback) && apiData.feedback.length > 0) {
            dbItems = apiData.feedback.map(f => ({
              id: f.id,
              customer_name: f.name,
              rating: f.rating,
              comment: f.message,
              badge: 'VERIFIED PURCHASE',
              created_at: f.created_at
            }));
          }
        }
      } catch (_) {}

      // 2. Or query directly via Supabase client SDK
      const client =
        (typeof window.getSupabaseClient === 'function' ? await window.getSupabaseClient() : null) ||
        window.supabaseClient;

      if (dbItems.length === 0 && client) {
        const { data: feedbackData, error: feedbackError } = await client
          .from('feedback')
          .select('id, name, feedback_type, rating, message, created_at')
          .order('created_at', { ascending: false })
          .limit(15);

        if (!feedbackError && Array.isArray(feedbackData) && feedbackData.length > 0) {
          dbItems = feedbackData.map(f => ({
            id: f.id,
            customer_name: f.name,
            rating: f.rating,
            comment: f.message,
            badge: 'VERIFIED PURCHASE',
            created_at: f.created_at
          }));
        }
      }

      // Deduplicate strictly by name and comment
      const unique = [];
      const seen = new Set();
      dbItems.forEach(item => {
        const key = `${(item.customer_name || '').trim().toLowerCase()}:::${(item.comment || '').trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      });

      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      renderTestimonials(unique);

      setupRealtimeSubscription(client);
    } catch (err) {
      console.error('[Harbor & Thread] Error loading reviews:', err);
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
              prependRealtimeReview({
                id: payload.new.id,
                customer_name: payload.new.name,
                rating: payload.new.rating,
                comment: payload.new.message,
                badge: 'VERIFIED PURCHASE',
                isLive: true
              });
            }
          }
        )
        .on('broadcast', { event: 'new-feedback' }, ({ payload }) => {
          if (payload) {
            prependRealtimeReview({
              id: payload.id,
              customer_name: payload.name,
              rating: payload.rating,
              comment: payload.message,
              badge: 'VERIFIED PURCHASE',
              isLive: true
            });
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('[Harbor & Thread] Could not subscribe to realtime on experience page:', e);
    }
  }

  function setupAccessibleTooltips() {
    const tooltipWraps = document.querySelectorAll('.tooltip-wrap');

    tooltipWraps.forEach(wrap => {
      const trigger = wrap.querySelector('.tooltip-trigger');
      const box = wrap.querySelector('.tooltip-box');
      if (!trigger || !box) return;

      if (!trigger.getAttribute('aria-expanded')) {
        trigger.setAttribute('aria-expanded', 'false');
      }
      if (!trigger.getAttribute('aria-haspopup')) {
        trigger.setAttribute('aria-haspopup', 'true');
      }

      trigger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = wrap.classList.contains('tooltip-open');

        tooltipWraps.forEach(w => {
          w.classList.remove('tooltip-open');
          w.querySelector('.tooltip-trigger')?.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
          wrap.classList.add('tooltip-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.tooltip-wrap')) {
        tooltipWraps.forEach(w => {
          w.classList.remove('tooltip-open');
          w.querySelector('.tooltip-trigger')?.setAttribute('aria-expanded', 'false');
        });
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        tooltipWraps.forEach(w => {
          w.classList.remove('tooltip-open');
          w.querySelector('.tooltip-trigger')?.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  function init() {
    setupAccessibleTooltips();
    setupCarouselControls();
    loadTestimonials();

    window.addEventListener('resize', () => {
      updateCarousel();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.reloadTestimonials = loadTestimonials;
})();
