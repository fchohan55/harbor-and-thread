const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');
const overlay = document.getElementById('overlay');

function openMenu() {
  if (!sidebar || !overlay) return;
  sidebar.classList.add('open');
  overlay.classList.add('show');
  sidebar.setAttribute('aria-hidden', 'false');
  hamburger?.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  closeSidebar?.focus();
}

function closeMenu() {
  if (!sidebar || !overlay) return;
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
  sidebar.setAttribute('aria-hidden', 'true');
  hamburger?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

hamburger?.addEventListener('click', openMenu);
closeSidebar?.addEventListener('click', closeMenu);
overlay?.addEventListener('click', closeMenu);
sidebar?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sidebar?.classList.contains('open')) {
    closeMenu();
    hamburger?.focus();
  }
});

const budgetSlider = document.getElementById('budgetSlider');
const budgetValue = document.getElementById('budgetValue');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const emptyState = document.getElementById('emptyState');

function filterProducts() {
  const cards = document.querySelectorAll('.product-card');
  if (!cards.length) return;
  const maxBudget = Number(budgetSlider?.value || 500);
  const term = (searchInput?.value || '').trim().toLowerCase();
  const activeTab = document.querySelector('.cat-pill.active');
  const activeCat = (activeTab?.dataset?.category || 'all').toLowerCase();
  let visible = 0;

  cards.forEach(card => {
    const price = Number(card.dataset.price || 0);
    const name = (card.dataset.name || '').toLowerCase();
    const cat = (card.dataset.category || '').toLowerCase();
    const desc = (card.dataset.description || '').toLowerCase();

    const matchesCat = (activeCat === 'all') || (cat === activeCat);
    const isFootQuery = term === 'foot' || term === 'footwear' || term === 'shoes' || term === 'shoe' || term === 'boots' || term === 'loafers' || term === 'sneakers';
    const matchesSearch = !term || name.includes(term) || cat.includes(term) || desc.includes(term) || (isFootQuery && cat === 'footwear');

    const show = matchesCat && price <= maxBudget && matchesSearch;
    card.classList.toggle('hidden', !show);
    if (show) visible++;
  });

  if (budgetValue) budgetValue.textContent = `$${maxBudget}`;
  if (emptyState) emptyState.style.display = visible ? 'none' : 'block';
}

if (!window.filterProducts) {
  window.filterProducts = filterProducts;
}

budgetSlider?.addEventListener('input', filterProducts);

function handleSearchAction() {
  if (document.getElementById('productGrid')) {
    filterProducts();
  } else {
    window.location.href = 'index.html#shop';
  }
}

searchInput?.addEventListener('input', () => {
  if (document.getElementById('productGrid')) {
    filterProducts();
  }
});

searchInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSearchAction();
  }
});

searchBtn?.addEventListener('click', handleSearchAction);

document.querySelectorAll('.page-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    const action = btn.dataset.page || btn.textContent.trim();

    // Determine current active page
    const activeBtn = document.querySelector('.page-btn.active');
    const currentPage = activeBtn ? parseInt(activeBtn.dataset.page, 10) : 1;

    let targetPage = action;
    if (action === 'prev') {
      targetPage = String(Math.max(1, currentPage - 1));
    } else if (action === 'next') {
      targetPage = String(Math.min(4, currentPage + 1));
    }

    const routeMap = {
      '1': 'index.html',
      '2': 'lookbook.html',
      '3': 'experience.html',
      '4': 'heritage.html'
    };

    if (routeMap[targetPage]) {
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      const destPath = routeMap[targetPage];

      // If already on destination page, scroll smoothly
      if (currentPath === destPath || (currentPath === '' && destPath === 'index.html')) {
        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }) ||
        document.getElementById('looks')?.scrollIntoView({ behavior: 'smooth' }) ||
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      window.location.href = destPath;
    }
  });
});

// Feedback submission and Supabase insertion are handled by js/feedback.js
filterProducts();


document.querySelectorAll('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.accordion-item');
    const wasActive = item.classList.contains('active');

    document.querySelectorAll('.accordion-item').forEach(other => {
      other.classList.remove('active');
      const t = other.querySelector('.accordion-trigger');
      const p = other.querySelector('.accordion-plus');
      if (t) t.setAttribute('aria-expanded', 'false');
      if (p) p.textContent = '+';
    });

    if (!wasActive) {
      item.classList.add('active');
      trigger.setAttribute('aria-expanded', 'true');
      const plus = trigger.querySelector('.accordion-plus');
      if (plus) plus.textContent = '−';
    }
  });
});

document.getElementById('dismissAlert')?.addEventListener('click', () => {
  document.querySelector('.alert-panel')?.classList.add('hidden-alert');
});

document.getElementById('showThanks')?.addEventListener('click', () => {
  const alert = document.getElementById('thankYouAlert');
  if (!alert) return;
  alert.classList.add('show');
  setTimeout(() => alert.classList.remove('show'), 7000);
});
