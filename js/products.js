/**
 * Harbor & Thread — Products Catalog & New Arrivals System
 *
 * Implements:
 * - Dynamic Trending & New Arrivals products from Supabase / REST API
 * - 8 Brand-new separate products in the dedicated New Arrivals section
 * - Attractive, equal-sized balanced dual buttons for Quick View and Add to Bag
 * - Category filter tabs & budget slider integration
 * - Quick View Modal management
 */

(function () {
  'use strict';

  // Fallback curated trending products matching the visual source of truth
  const FALLBACK_TRENDING_PRODUCTS = [
    {
      id: 'fb-1',
      name: 'Beacon Denim Jeans',
      subtitle: 'Stonewashed Indigo',
      category: 'Clothing',
      price: 95,
      image_url: 'images/jeans.jpg',
      badge: 'NEW',
      is_trending: true,
      is_active: true,
      display_order: 1,
      description: 'Crafted from premium 13.5 oz Japanese selvedge denim with an authentic stonewashed fade, antique brass rivets, and a tailored straight-leg fit.'
    },
    {
      id: 'fb-2',
      name: 'Harbor Weekend Bag',
      subtitle: 'Premium Black',
      category: 'Accessories',
      price: 165,
      image_url: 'images/bag.jpg',
      badge: 'BESTSELLER',
      is_trending: true,
      is_active: true,
      display_order: 2,
      description: 'Constructed from weatherproof 1000D ballistic nylon with full-grain leather carry handles and dedicated 16-inch laptop compartment.'
    },
    {
      id: 'fb-3',
      name: 'Commonwealth Watch',
      subtitle: 'Minimal Silver',
      category: 'Accessories',
      price: 220,
      image_url: 'images/watch.jpg',
      badge: 'PREMIUM',
      is_trending: true,
      is_active: true,
      display_order: 3,
      description: 'Surgical-grade 316L brushed stainless steel case with scratch-resistant sapphire crystal and 50m water resistance.'
    },
    {
      id: 'fb-4',
      name: 'Back Bay Oversized Knit Polo',
      subtitle: 'Ivory Texture',
      category: 'Clothing',
      price: 145,
      image_url: 'images/shirt.jpg',
      badge: 'TRENDING',
      is_trending: true,
      is_active: true,
      display_order: 4,
      description: 'Spun from 100% Peruvian pima cotton waffle-knit with a relaxed dropped-shoulder silhouette and mother-of-pearl buttons.'
    },
    {
      id: 'fb-5',
      name: 'North End Outfit Set',
      subtitle: 'Camel / Cream',
      category: 'Clothing',
      price: 255,
      image_url: 'images/outfit.jpg',
      badge: 'LIMITED',
      is_trending: true,
      is_active: true,
      display_order: 5,
      description: 'Two-piece coordinated set featuring an unlined camel wool-blend overshirt jacket paired with pleated cream relaxed trousers.'
    },
    {
      id: 'fb-6',
      name: 'Seaport Sunglasses',
      subtitle: 'Amber Frame',
      category: 'Accessories',
      price: 130,
      image_url: 'images/sunglasses.jpg',
      badge: 'CURATED',
      is_trending: true,
      is_active: true,
      display_order: 6,
      description: 'Handcrafted Italian Mazzucchelli acetate in rich amber tortoiseshell with polarized 100% UVA/UVB Carl Zeiss lenses.'
    },
    {
      id: 'fb-7',
      name: 'Beacon Leather Penny Loafers',
      subtitle: 'Chestnut Italian Calfskin',
      category: 'Footwear',
      price: 195,
      image_url: 'images/loafers.jpg',
      badge: 'NEW',
      is_trending: true,
      is_active: true,
      display_order: 7,
      description: 'Handcrafted in genuine full-grain Italian calfskin with Goodyear-welted construction and stacked leather heel.'
    },
    {
      id: 'fb-8',
      name: 'Seaport Suede Chelsea Boots',
      subtitle: 'Espresso Weather-Resistant Suede',
      category: 'Footwear',
      price: 225,
      image_url: 'images/boots.jpg',
      badge: 'BESTSELLER',
      is_trending: true,
      is_active: true,
      display_order: 8,
      description: 'Cut from supple espresso calf suede with weather-resistant finishing, elastic side gussets, and custom lugged traction soles.'
    },
    {
      id: 'fb-9',
      name: 'Commonwealth Low-Top Sneaker',
      subtitle: 'Pristine White Calfskin / Gum Sole',
      category: 'Footwear',
      price: 160,
      image_url: 'images/sneakers.jpg',
      badge: 'PREMIUM',
      is_trending: true,
      is_active: true,
      display_order: 9,
      description: 'Minimalist Boston city sneakers crafted from smooth Italian Nappa leather with soft off-white suede accents and natural gum cupsoles.'
    }
  ];

  // 8 Brand-new separate products for the New Arrivals section
  const FALLBACK_NEW_ARRIVALS = [
    {
      id: 'na-1',
      name: 'Somerset Double-Faced Wool Trench',
      subtitle: 'Camel Heritage Melange',
      category: 'Clothing',
      price: 385,
      image_url: 'images/outfit.jpg',
      badge: 'NEW ARRIVAL',
      is_active: true,
      display_order: 1,
      description: 'Tailored from heavyweight 24 oz double-faced New England wool melange with genuine horn buttons and belted storm storm flaps.'
    },
    {
      id: 'na-2',
      name: 'Charles River Merino Turtleneck',
      subtitle: 'Oatmeal Heather Knit',
      category: 'Clothing',
      price: 175,
      image_url: 'images/shirt.jpg',
      badge: 'NEW ARRIVAL',
      is_active: true,
      display_order: 2,
      description: 'Spun from extra-fine 19.5 micron Zegna Baruffa Italian merino wool with a refined micro-rib neck and seamless raglan shoulders.'
    },
    {
      id: 'na-3',
      name: 'Tremont Italian Suede Belt',
      subtitle: 'Espresso Brushed Suede',
      category: 'Accessories',
      price: 85,
      image_url: 'images/accessories.jpg',
      badge: 'NEW ARRIVAL',
      is_active: true,
      display_order: 3,
      description: 'Handcrafted in Tuscany from full-grain calf suede with bevelled edges, nubuck leather backing, and a solid antique brass buckle.'
    },
    {
      id: 'na-4',
      name: 'Back Bay Flannel Pleated Trousers',
      subtitle: 'Charcoal Wool Flannel',
      category: 'Clothing',
      price: 165,
      image_url: 'images/jeans.jpg',
      badge: 'NEW ARRIVAL',
      is_active: true,
      display_order: 4,
      description: 'Single forward pleats, side waist adjusters, and a graceful gentle taper cut from soft 100% British wool flannel.'
    },
    {
      id: 'na-5',
      name: 'Beacon Hill Heritage Weekender',
      subtitle: 'Tan Waxed Canvas / Bridle Leather',
      category: 'Accessories',
      price: 240,
      image_url: 'images/bag.jpg',
      badge: 'NEW ARRIVAL',
      is_active: true,
      display_order: 5,
      description: 'Rugged 18 oz British water-resistant waxed cotton canvas trimmed with vegetable-tanned bridle leather and brass YKK Excella zippers.'
    },
    {
      id: 'na-6',
      name: 'Newbury Suede Chelsea Boots',
      subtitle: 'Snuff Brown Weatherproof Suede',
      category: 'Footwear',
      price: 225,
      image_url: 'images/boots.jpg',
      badge: 'NEW ARRIVAL',
      is_active: true,
      display_order: 6,
      description: 'Scotchgard suede treatment, natural plantation crepe rubber outsoles, and Goodyear storm welts for Boston damp autumns.'
    },
    {
      id: 'na-7',
      name: 'Copley Polarized Acetate Sunglasses',
      subtitle: 'Smoky Champagne Acetate',
      category: 'Accessories',
      price: 140,
      image_url: 'images/sunglasses.jpg',
      badge: 'NEW ARRIVAL',
      is_active: true,
      display_order: 7,
      description: 'Custom sculpted champagne cellulose acetate frames paired with anti-reflective polarized bottle green Carl Zeiss optics.'
    },
    {
      id: 'na-8',
      name: 'Boston Maritime Automatic Watch',
      subtitle: 'Deep Navy Nautical Dial',
      category: 'Accessories',
      price: 295,
      image_url: 'images/watch.jpg',
      badge: 'NEW ARRIVAL',
      is_active: true,
      display_order: 8,
      description: 'Japanese Miyota automatic movement, deep Atlantic navy sunburst dial, 100m water resistance, and an interchangeable Horween strap.'
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

  let currentProducts = [...FALLBACK_TRENDING_PRODUCTS];
  let currentNewArrivals = [...FALLBACK_NEW_ARRIVALS];

  /**
   * Builds an attractive product card with balanced, equal-sized buttons
   */
  function createProductCardElement(item) {
    const card = document.createElement('article');
    card.className = 'product-card';
    const id = item.id || '';
    const name = item.name || item.title || 'Curated Item';
    const price = item.price != null ? Number(item.price) : 0;

    card.dataset.id = id;
    card.dataset.name = name;
    card.dataset.category = (item.category || '').toLowerCase();
    card.dataset.price = String(price);
    card.dataset.description = item.description || '';

    // Image container
    const imageWrap = document.createElement('div');
    imageWrap.className = 'product-image real-product';

    const img = document.createElement('img');
    img.src = item.image_url || 'images/outfit.jpg';
    img.alt = name;
    img.loading = 'lazy';
    img.onerror = () => {
      img.onerror = null;
      img.src = 'images/outfit.jpg';
    };
    imageWrap.appendChild(img);

    const badgeText = item.badge || (item.is_trending ? 'TRENDING' : '');
    if (badgeText) {
      const badgeSpan = document.createElement('span');
      badgeSpan.textContent = badgeText;
      imageWrap.appendChild(badgeSpan);
    }
    card.appendChild(imageWrap);

    // Category
    const category = item.category || item.category_name || '';
    if (category) {
      const categorySpan = document.createElement('span');
      categorySpan.className = 'product-category';
      categorySpan.textContent = category;
      card.appendChild(categorySpan);
    }

    // Name
    const h3 = document.createElement('h3');
    h3.textContent = name;
    card.appendChild(h3);

    // Subtitle
    const subtitle = item.subtitle || '';
    if (subtitle) {
      const p = document.createElement('p');
      p.className = 'product-subtitle';
      p.textContent = subtitle;
      card.appendChild(p);
    }

    // Snippet description
    if (item.description) {
      const descEl = document.createElement('p');
      descEl.className = 'product-card-desc';
      descEl.textContent = item.description;
      card.appendChild(descEl);
    }

    // Bottom container: Price and equal-sized dual buttons
    const bottom = document.createElement('div');
    bottom.className = 'product-card-bottom';

    const priceDiv = document.createElement('div');
    priceDiv.className = 'price';
    priceDiv.textContent = item.price != null ? `$${price.toFixed(0)}` : '';
    bottom.appendChild(priceDiv);

    // Equal-sized attractive action buttons
    const btnGroup = document.createElement('div');
    btnGroup.className = 'product-card-actions';

    const quickViewBtn = document.createElement('button');
    quickViewBtn.className = 'product-btn product-btn-view';
    quickViewBtn.type = 'button';
    quickViewBtn.dataset.action = 'quickview';
    quickViewBtn.dataset.productId = id;
    quickViewBtn.setAttribute('aria-label', `Quick view of ${name}`);
    quickViewBtn.innerHTML = '<span>👁</span> View';
    quickViewBtn.addEventListener('click', () => {
      openQuickViewModal(item);
    });
    btnGroup.appendChild(quickViewBtn);

    const addBagBtn = document.createElement('button');
    addBagBtn.className = 'product-btn product-btn-bag';
    addBagBtn.type = 'button';
    addBagBtn.setAttribute('aria-label', `Add ${name} to shopping bag`);
    addBagBtn.innerHTML = '<span>👜</span> + Bag';
    addBagBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.HarborCart) {
        window.HarborCart.addToCart(item, 1);
      }
    });
    btnGroup.appendChild(addBagBtn);

    bottom.appendChild(btnGroup);
    card.appendChild(bottom);
    return card;
  }

  function renderProductCards(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!products || products.length === 0) {
      const catalogEmpty = document.createElement('div');
      catalogEmpty.className = 'catalog-empty-state';
      catalogEmpty.setAttribute('role', 'status');
      catalogEmpty.textContent = 'No products are currently available.';
      grid.appendChild(catalogEmpty);
      return;
    }

    currentProducts = products;
    const fragment = document.createDocumentFragment();
    products.forEach(item => {
      fragment.appendChild(createProductCardElement(item));
    });
    grid.appendChild(fragment);

    if (typeof window.filterProducts === 'function') {
      window.filterProducts();
    }
  }

  function renderNewArrivals(items = FALLBACK_NEW_ARRIVALS) {
    const grid = document.getElementById('newArrivalsGrid');
    if (!grid) return;

    grid.innerHTML = '';
    currentNewArrivals = items;
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
      fragment.appendChild(createProductCardElement(item));
    });
    grid.appendChild(fragment);
  }

  async function loadTrendingProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    // Load New Arrivals first
    renderNewArrivals(FALLBACK_NEW_ARRIVALS);

    try {
      // Fetch from local full-stack server
      const res = await fetch('/api/products?section=trending');
      if (res.ok) {
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          renderProductCards(data.products);
          return;
        }
      }
    } catch (_) {}

    // Fallback
    renderProductCards(FALLBACK_TRENDING_PRODUCTS);
  }

  function openQuickViewModal(product) {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    modal.dataset.currentProductId = product.id || '';

    const modalImage = document.getElementById('modalImage');
    const modalCategory = document.getElementById('modalCategory');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const modalPrice = document.getElementById('modalPrice');
    const modalDescription = modal.querySelector('.modal-description') || document.getElementById('modalDescription');
    const modalToast = document.getElementById('modalToast');
    const modalWishlistBtn = document.getElementById('modalWishlistBtn');
    const modalAddBagBtn = document.getElementById('modalAddBagBtn');

    if (modalImage) {
      modalImage.src = product.image_url || 'images/outfit.jpg';
      modalImage.alt = product.name || 'Harbor & Thread product';
      modalImage.onerror = () => {
        modalImage.onerror = null;
        modalImage.src = 'images/outfit.jpg';
      };
    }

    if (modalCategory) {
      modalCategory.textContent = product.category || 'Harbor & Thread';
    }
    if (modalTitle) {
      modalTitle.textContent = product.name || 'Curated Item';
    }
    if (modalSubtitle) {
      modalSubtitle.textContent = product.subtitle || '';
      modalSubtitle.style.display = product.subtitle ? 'block' : 'none';
    }
    if (modalPrice) {
      modalPrice.textContent = product.price != null ? `$${Number(product.price).toFixed(0)}` : '';
    }
    if (modalDescription) {
      modalDescription.textContent =
        product.description ||
        'Crafted with New England sensibilities and refined materials for effortless everyday elegance.';
    }

    if (modalToast) modalToast.classList.remove('show');

    // Add to Bag action inside Modal
    if (modalAddBagBtn) {
      modalAddBagBtn.onclick = () => {
        if (window.HarborCart) {
          window.HarborCart.addToCart(product, 1);
        }
        if (modalToast) {
          modalToast.textContent = `Added ${product.name} to your shopping bag!`;
          modalToast.classList.add('show');
          setTimeout(() => modalToast.classList.remove('show'), 2500);
        }
      };
    }

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeQuickViewModal() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
    modal.setAttribute('aria-hidden', 'true');
  }

  function setupCategoryTabs() {
    document.querySelectorAll('.cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const cat = pill.dataset.category || 'all';
        window.selectCategory(cat);
      });
    });

    window.selectCategory = function (category) {
      const activeCat = (category || 'all').toLowerCase();
      document.querySelectorAll('.cat-pill').forEach(p => {
        const pCat = (p.dataset.category || 'all').toLowerCase();
        const isActive = pCat === activeCat;
        p.classList.toggle('active', isActive);
        p.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      if (typeof window.filterProducts === 'function') {
        window.filterProducts();
      }
    };
  }

  function setupModalListeners() {
    const modal = document.getElementById('productModal');
    const closeBtn = document.getElementById('closeProductModal');
    const backBtn = document.getElementById('modalCloseBtn');

    closeBtn?.addEventListener('click', closeQuickViewModal);
    backBtn?.addEventListener('click', closeQuickViewModal);

    modal?.addEventListener('click', e => {
      if (e.target === modal) closeQuickViewModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal?.open) closeQuickViewModal();
    });
  }

  // Smooth scroll to New Arrivals when clicking hero or nav links
  function setupNewArrivalsScroll() {
    const heroBtn = document.querySelector('a[href="#new"], a[href="#new-arrivals"]');
    heroBtn?.addEventListener('click', e => {
      e.preventDefault();
      const section = document.getElementById('new-arrivals');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupModalListeners();
      setupCategoryTabs();
      setupNewArrivalsScroll();
      loadTrendingProducts();
    });
  } else {
    setupModalListeners();
    setupCategoryTabs();
    setupNewArrivalsScroll();
    loadTrendingProducts();
  }

  window.reloadTrendingProducts = loadTrendingProducts;
})();
