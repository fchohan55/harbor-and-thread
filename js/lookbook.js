/**
 * Harbor & Thread — Lookbook (Supabase Integration)
 *
 * Visual outfit discoverability connected to Supabase:
 * Query:
 *   table: 'lookbook'
 *   filter: is_published = true
 *   sort: display_order ASC
 *   relationship: lookbook_products (associated products)
 *
 * Each entry displays:
 * - Large fashion image
 * - Title
 * - Description
 * - Optional season
 * - Associated products (product thumbnail, name, price)
 *
 * Features:
 * - Clean interactive drawer per look exposing outfit pieces without clutter
 * - Accessible HTML with ARIA controls
 * - Graceful fallback when database tables have pending RLS permissions
 */

(function () {
  'use strict';

  // Fallback curated lookbook entries using existing project assets
  const FALLBACK_LOOKBOOK = [
    {
      id: 'look-1',
      title: 'Back Bay Minimal',
      description: 'Cream knitwear, camel tailoring, and relaxed structure for polished city days.',
      season: 'Fall / Winter 2026',
      image_url: 'images/outfit.jpg',
      is_published: true,
      display_order: 1,
      associated_products: [
        {
          name: 'Back Bay Oversized Knit Polo',
          price: 145,
          image_url: 'images/shirt.jpg'
        },
        {
          name: 'North End Outfit Set',
          price: 255,
          image_url: 'images/outfit.jpg'
        }
      ]
    },
    {
      id: 'look-2',
      title: 'Beacon Hill Casual',
      description: 'Classic denim paired with elevated layers for effortless everyday styling.',
      season: 'Autumn Everyday',
      image_url: 'images/jeans.jpg',
      is_published: true,
      display_order: 2,
      associated_products: [
        {
          name: 'Beacon Denim Jeans',
          price: 95,
          image_url: 'images/jeans.jpg'
        },
        {
          name: 'Commonwealth Watch',
          price: 220,
          image_url: 'images/watch.jpg'
        }
      ]
    },
    {
      id: 'look-3',
      title: 'Seaport Weekend',
      description: 'Clean accessories and practical luxury for an easy waterfront weekend edit.',
      season: 'Coastal Weekend',
      image_url: 'images/bag.jpg',
      is_published: true,
      display_order: 3,
      associated_products: [
        {
          name: 'Harbor Weekend Bag',
          price: 165,
          image_url: 'images/bag.jpg'
        },
        {
          name: 'Seaport Sunglasses',
          price: 130,
          image_url: 'images/sunglasses.jpg'
        }
      ]
    }
  ];

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Normalizes lookbook products from Supabase nested relations or flat lookbook_products
   * Strictly preserves order defined by lookbook_products.display_order
   */
  function extractAssociatedProducts(entry) {
    if (Array.isArray(entry.associated_products) && entry.associated_products.length > 0) {
      return entry.associated_products;
    }

    if (Array.isArray(entry.lookbook_products)) {
      // Sort strictly by lookbook_products.display_order ascending
      const sorted = [...entry.lookbook_products].sort((a, b) => {
        const orderA = a.display_order != null ? a.display_order : 0;
        const orderB = b.display_order != null ? b.display_order : 0;
        return orderA - orderB;
      });

      return sorted
        .map(lp => {
          const prod = lp.products || lp.product || lp;
          if (!prod) return null;
          return {
            id: prod.id,
            name: prod.name || prod.title || 'Curated Item',
            price: prod.price,
            image_url: prod.image_url || 'images/outfit.jpg',
            category: prod.category || '',
            display_order: lp.display_order
          };
        })
        .filter(Boolean);
    }

    return [];
  }

  /**
   * Safely constructs a lookbook card DOM element
   */
  function createLookCardElement(entry, index) {
    const id = entry.id || `look-${index + 1}`;
    const number = String(index + 1).padStart(2, '0');
    const title = entry.title || 'Boston Look';
    const description = entry.description || '';
    const season = entry.season || '';
    const imageUrl = entry.image_url || entry.image || 'images/outfit.jpg';
    const products = extractAssociatedProducts(entry);
    const drawerId = `drawer-${id}`;

    const card = document.createElement('article');
    card.className = 'look-card';
    card.dataset.lookId = id;

    // Image Wrap
    const imageWrap = document.createElement('div');
    imageWrap.className = 'look-image-wrap';
    imageWrap.tabIndex = 0;
    imageWrap.setAttribute('role', 'button');
    imageWrap.setAttribute('aria-expanded', 'false');
    imageWrap.setAttribute('aria-controls', drawerId);
    imageWrap.setAttribute('aria-label', `Toggle outfit details for ${title}`);

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = title;
    img.loading = 'lazy';
    img.onerror = () => {
      img.onerror = null;
      img.src = 'images/outfit.jpg';
    };
    imageWrap.appendChild(img);

    if (season) {
      const seasonTag = document.createElement('span');
      seasonTag.className = 'look-season-tag';
      seasonTag.textContent = season;
      imageWrap.appendChild(seasonTag);
    }
    card.appendChild(imageWrap);

    // Card Body
    const cardBody = document.createElement('div');
    cardBody.className = 'look-card-body';

    const metaDiv = document.createElement('div');
    metaDiv.className = 'look-meta';

    const numSpan = document.createElement('span');
    numSpan.className = 'look-number';
    numSpan.textContent = number;
    metaDiv.appendChild(numSpan);

    if (season) {
      const seasonSpan = document.createElement('span');
      seasonSpan.className = 'look-season';
      seasonSpan.textContent = season;
      metaDiv.appendChild(seasonSpan);
    }
    cardBody.appendChild(metaDiv);

    const h3 = document.createElement('h3');
    h3.textContent = title;
    cardBody.appendChild(h3);

    const pDesc = document.createElement('p');
    pDesc.textContent = description;
    cardBody.appendChild(pDesc);

    // Toggle Button
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'look-toggle-btn';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-controls', drawerId);

    const toggleText = document.createElement('span');
    toggleText.className = 'toggle-text';
    toggleText.textContent = `View Outfit Pieces (${products.length})`;
    toggleBtn.appendChild(toggleText);

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'toggle-icon';
    toggleIcon.setAttribute('aria-hidden', 'true');
    toggleIcon.textContent = '+';
    toggleBtn.appendChild(toggleIcon);

    cardBody.appendChild(toggleBtn);

    // Drawer
    const drawer = document.createElement('div');
    drawer.className = 'look-products-drawer';
    drawer.id = drawerId;
    drawer.setAttribute('hidden', '');

    const drawerHeading = document.createElement('div');
    drawerHeading.className = 'look-products-heading';
    drawerHeading.textContent = 'Associated Pieces';
    drawer.appendChild(drawerHeading);

    if (products.length > 0) {
      const prodList = document.createElement('div');
      prodList.className = 'look-products-list';

      products.forEach(p => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'look-prod-item';

        const thumb = document.createElement('img');
        thumb.src = p.image_url || 'images/outfit.jpg';
        thumb.alt = p.name || 'Outfit item';
        thumb.className = 'look-prod-thumb';
        thumb.onerror = () => {
          thumb.onerror = null;
          thumb.src = 'images/outfit.jpg';
        };
        itemDiv.appendChild(thumb);

        const details = document.createElement('div');
        details.className = 'look-prod-details';

        const strongName = document.createElement('strong');
        strongName.textContent = p.name || 'Curated Item';
        details.appendChild(strongName);

        if (p.price != null) {
          const spanPrice = document.createElement('span');
          spanPrice.textContent = `$${Number(p.price).toFixed(0)}`;
          details.appendChild(spanPrice);
        }
        itemDiv.appendChild(details);

        const shopLink = document.createElement('a');
        shopLink.href = 'index.html#shop';
        shopLink.className = 'look-prod-link';
        shopLink.setAttribute('aria-label', `Shop ${p.name} in store`);
        shopLink.textContent = 'Shop Item';
        itemDiv.appendChild(shopLink);

        prodList.appendChild(itemDiv);
      });
      drawer.appendChild(prodList);
    } else {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'look-empty-products';
      emptyMsg.textContent = 'Complete Boston styling from our atelier collection.';
      drawer.appendChild(emptyMsg);
    }

    cardBody.appendChild(drawer);
    card.appendChild(cardBody);

    // Drawer toggle interaction logic
    function toggleDrawer() {
      const isHidden = drawer.hasAttribute('hidden');
      if (isHidden) {
        drawer.removeAttribute('hidden');
        toggleBtn.setAttribute('aria-expanded', 'true');
        imageWrap.setAttribute('aria-expanded', 'true');
        toggleText.textContent = `Hide Outfit Pieces (${products.length})`;
      } else {
        drawer.setAttribute('hidden', '');
        toggleBtn.setAttribute('aria-expanded', 'false');
        imageWrap.setAttribute('aria-expanded', 'false');
        toggleText.textContent = `View Outfit Pieces (${products.length})`;
      }
    }

    toggleBtn.addEventListener('click', toggleDrawer);
    imageWrap.addEventListener('click', toggleDrawer);
    imageWrap.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDrawer();
      }
    });

    return card;
  }

  /**
   * Renders lookbook cards into #lookbookGrid
   */
  function renderLookbook(entries) {
    const grid = document.getElementById('lookbookGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!entries || entries.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'lookbook-empty-state';
      emptyDiv.setAttribute('role', 'status');
      emptyDiv.textContent = 'No lookbook entries are currently available.';
      grid.appendChild(emptyDiv);
      return;
    }

    const fragment = document.createDocumentFragment();
    entries.forEach((entry, index) => {
      fragment.appendChild(createLookCardElement(entry, index));
    });
    grid.appendChild(fragment);
  }

  /**
   * Displays or clears a subtle status notice
   */
  function showLookbookNotice(message, showRetry = false) {
    let notice = document.getElementById('lookbookNotice');
    const heading = document.querySelector('.lookbook-section .section-heading');
    const grid = document.getElementById('lookbookGrid');

    if (!notice && heading && grid) {
      notice = document.createElement('div');
      notice.id = 'lookbookNotice';
      notice.className = 'trending-notice';
      heading.parentNode.insertBefore(notice, grid);
    }

    if (!notice) return;

    if (!message) {
      notice.style.display = 'none';
      return;
    }

    notice.style.display = 'flex';
    notice.innerHTML = `
      <span>${escapeHtml(message)}</span>
      ${showRetry ? '<button type="button" id="retryLookbookBtn">Retry Connection</button>' : ''}
    `;

    if (showRetry) {
      document.getElementById('retryLookbookBtn')?.addEventListener('click', () => {
        loadLookbook();
      });
    }
  }

  /**
   * Fetches published lookbook entries with associated products from Supabase
   */
  async function loadLookbook() {
    const grid = document.getElementById('lookbookGrid');
    if (!grid) return;

    // Show loading state
    grid.innerHTML = `
      <div class="lookbook-grid-loading" id="lookbookLoading" role="status" aria-live="polite">
        <p>Loading curated Boston lookbook...</p>
      </div>
    `;

    try {
      const client =
        (typeof window.getSupabaseClient === 'function' ? await window.getSupabaseClient() : null) ||
        window.supabaseClient;

      if (!client) {
        showLookbookNotice('Displaying curated Boston looks (client initializing).', true);
        renderLookbook(FALLBACK_LOOKBOOK);
        return;
      }

      // Query: public.lookbook, required columns, ordered by display_order ascending
      // RLS already restricts results to published looks and active products
      const { data, error } = await client
        .from('lookbook')
        .select(`
          id,
          title,
          description,
          season,
          image_url,
          display_order,
          lookbook_products (
            id,
            display_order,
            products (
              id,
              name,
              price,
              image_url,
              category
            )
          )
        `)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[Harbor & Thread] Error loading lookbook from Supabase:', error.message || error);
        showLookbookNotice('Unable to reach live lookbook service. Showing curated Boston looks.', true);
        renderLookbook(FALLBACK_LOOKBOOK);
        return;
      }

      if (!data || data.length === 0) {
        showLookbookNotice('');
        renderLookbook([]);
        return;
      }

      showLookbookNotice('');
      renderLookbook(data);
      console.log(`[Harbor & Thread] Successfully loaded ${data.length} lookbook entries from Supabase.`);
    } catch (err) {
      console.error('[Harbor & Thread] Unexpected error loading lookbook:', err);
      showLookbookNotice('Unable to reach live lookbook service. Showing curated Boston looks.', true);
      renderLookbook(FALLBACK_LOOKBOOK);
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLookbook);
  } else {
    loadLookbook();
  }

  window.reloadLookbook = loadLookbook;
})();
