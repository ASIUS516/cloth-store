// Логика страницы каталога: загрузка товаров, фильтры, поиск,
// сортировка, пагинация и рендер карточек товара.

const state = {
  category: [],
  minPrice: '',
  maxPrice: '',
  size: '',
  color: '',
  search: '',
  sort: 'newest',
  page: 1,
};

const SIZES = ['S', 'M', 'L', 'XL', '40', '41', '42', '43'];
const COLORS = ['белый', 'чёрный', 'бордовый', 'золотой', 'синий', 'тёмно-синий', 'светло-синий', 'бежевый', 'серый', 'коричневый'];

document.addEventListener('DOMContentLoaded', () => {
  // Если пришли по ссылке с главной страницы вида catalog.html?category=джинсы —
  // сразу применяем эту категорию как фильтр
  const urlParams = new URLSearchParams(window.location.search);
  const categoryFromUrl = urlParams.get('category');
  if (categoryFromUrl) {
    state.category = [categoryFromUrl];
  }

  initFilterControls();
  loadCategories();
  loadProducts();

  document.querySelector('[data-search-input]').addEventListener('input', debounce((e) => {
    state.search = e.target.value;
    state.page = 1;
    loadProducts();
  }, 400));

  document.querySelector('[data-sort-select]').addEventListener('change', (e) => {
    state.sort = e.target.value;
    loadProducts();
  });

  document.querySelector('[data-filters-reset]').addEventListener('click', resetFilters);
  document.querySelector('[data-filters-apply]').addEventListener('click', () => {
    state.page = 1;
    loadProducts();
    closeMobileFilters();
  });

  // Открытие/закрытие панели фильтров на мобильном
  const filtersToggle = document.querySelector('[data-filters-toggle]');
  if (filtersToggle) {
    filtersToggle.addEventListener('click', () => {
      document.querySelector('[data-filters]').classList.add('open');
      document.querySelector('[data-filters-overlay]').classList.add('open');
    });
  }
  const overlay = document.querySelector('[data-filters-overlay]');
  if (overlay) overlay.addEventListener('click', closeMobileFilters);

  document.addEventListener('i18n:changed', loadProducts);
});

function closeMobileFilters() {
  document.querySelector('[data-filters]').classList.remove('open');
  document.querySelector('[data-filters-overlay]').classList.remove('open');
}

function initFilterControls() {
  const sizeWrap = document.querySelector('[data-size-filter]');
  SIZES.forEach((size) => {
    const label = document.createElement('label');
    label.className = 'filter-checkbox';
    label.innerHTML = `<input type="radio" name="size" value="${size}"> ${size}`;
    sizeWrap.appendChild(label);
  });
  sizeWrap.addEventListener('change', (e) => {
    state.size = e.target.value;
  });

  const colorSelect = document.querySelector('[data-color-filter]');
  COLORS.forEach((color) => {
    const option = document.createElement('option');
    option.value = color;
    option.textContent = color;
    colorSelect.appendChild(option);
  });
  colorSelect.addEventListener('change', (e) => {
    state.color = e.target.value;
  });

  document.querySelector('[data-price-min]').addEventListener('input', (e) => { state.minPrice = e.target.value; });
  document.querySelector('[data-price-max]').addEventListener('input', (e) => { state.maxPrice = e.target.value; });
}

async function loadCategories() {
  const res = await fetch('/api/categories');
  const categories = await res.json();
  const wrap = document.querySelector('[data-category-filter]');
  wrap.innerHTML = '';
  categories.forEach((cat) => {
    const label = document.createElement('label');
    label.className = 'filter-checkbox';
    const isChecked = state.category.includes(cat);
    label.innerHTML = `<input type="checkbox" value="${cat}" ${isChecked ? 'checked' : ''}> ${capitalize(cat)}`;
    wrap.appendChild(label);
  });
  wrap.addEventListener('change', () => {
    state.category = Array.from(wrap.querySelectorAll('input:checked')).map((i) => i.value);
  });
}

function resetFilters() {
  state.category = [];
  state.minPrice = '';
  state.maxPrice = '';
  state.size = '';
  state.color = '';
  state.page = 1;

  document.querySelectorAll('[data-category-filter] input').forEach((i) => { i.checked = false; });
  document.querySelectorAll('[data-size-filter] input').forEach((i) => { i.checked = false; });
  document.querySelector('[data-color-filter]').value = '';
  document.querySelector('[data-price-min]').value = '';
  document.querySelector('[data-price-max]').value = '';

  loadProducts();
}

function buildQuery() {
  const params = new URLSearchParams();
  state.category.forEach((c) => params.append('category', c));
  // Бэкенд ожидает один category — если выбрано несколько, делаем
  // несколько запросов невозможно одним GET, поэтому фильтруем по первой
  // выбранной категории (упрощение для учебного проекта)
  if (state.category.length) params.set('category', state.category[0]);
  if (state.minPrice) params.set('minPrice', state.minPrice);
  if (state.maxPrice) params.set('maxPrice', state.maxPrice);
  if (state.size) params.set('size', state.size);
  if (state.color) params.set('color', state.color);
  if (state.search) params.set('search', state.search);
  if (state.sort && state.sort !== 'newest') params.set('sort', state.sort);
  params.set('page', state.page);
  params.set('limit', 12);
  return params.toString();
}

async function loadProducts() {
  const grid = document.querySelector('[data-product-grid]');
  grid.innerHTML = `<p>${i18n.t('no_products_found') === 'no_products_found' ? 'Загрузка…' : ''}</p>`;

  const res = await fetch(`/api/products?${buildQuery()}`);
  const data = await res.json();

  renderProducts(data.products);
  renderPagination(data.total, data.page, data.limit);
}

async function renderProducts(products) {
  const grid = document.querySelector('[data-product-grid]');
  grid.innerHTML = '';

  if (products.length === 0) {
    grid.innerHTML = `<p>${i18n.t('no_products_found')}</p>`;
    return;
  }

  // Загружаем список избранного один раз, чтобы отметить сердечки
  const wishlistIds = await getWishlistIds();

  products.forEach((product) => {
    grid.appendChild(renderProductCard(product, wishlistIds.includes(product.id)));
  });
}

async function getWishlistIds() {
  try {
    const res = await fetch('/api/wishlist');
    if (!res.ok) return [];
    const items = await res.json();
    return items.map((p) => p.id);
  } catch {
    return [];
  }
}

function renderProductCard(product, isWishlisted) {
  const card = document.createElement('div');
  card.className = 'product-card';

  card.innerHTML = `
    <button class="wishlist-toggle ${isWishlisted ? 'active' : ''}" data-wishlist-btn data-id="${product.id}" aria-label="${i18n.t('product_add_to_wishlist')}">${isWishlisted ? '♥' : '♡'}</button>
    <div class="product-card__view" data-view-text>${product.view_front_text}</div>
    <div class="product-card__angles">
      <button class="active" data-angle="front" data-i18n="view_front">${i18n.t('view_front')}</button>
      <button data-angle="side" data-i18n="view_side">${i18n.t('view_side')}</button>
      <button data-angle="back" data-i18n="view_back">${i18n.t('view_back')}</button>
    </div>
    <div class="product-card__body">
      <span class="product-card__category">${capitalize(product.category)}</span>
      <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
      <span class="product-card__meta">${i18n.t('product_size')}: ${product.size} · ${i18n.t('product_color')}: ${product.color}</span>
      <span class="product-card__price">${product.price.toLocaleString()} ₼</span>
      <div class="product-card__actions">
        <button class="btn btn-small btn-block" data-add-to-cart data-id="${product.id}" data-i18n="product_add_to_cart">${i18n.t('product_add_to_cart')}</button>
      </div>
    </div>
  `;

  const viewText = card.querySelector('[data-view-text]');
  card.querySelectorAll('[data-angle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      card.querySelectorAll('[data-angle]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const angle = btn.getAttribute('data-angle');
      if (angle === 'front') viewText.textContent = product.view_front_text;
      if (angle === 'side') viewText.textContent = product.view_side_text;
      if (angle === 'back') viewText.textContent = product.view_back_text;
    });
  });

  card.querySelector('[data-add-to-cart]').addEventListener('click', async (e) => {
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, quantity: 1 }),
    });
    updateCartBadge();
    const btn = e.currentTarget;
    const original = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = original; }, 900);
  });

  const wishlistBtn = card.querySelector('[data-wishlist-btn]');
  wishlistBtn.addEventListener('click', async () => {
    const active = wishlistBtn.classList.contains('active');
    try {
      if (active) {
        await fetch(`/api/wishlist/${product.id}`, { method: 'DELETE' });
        wishlistBtn.classList.remove('active');
        wishlistBtn.textContent = '♡';
      } else {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: product.id }),
        });
        if (res.status === 401) {
          window.location.href = 'login.html';
          return;
        }
        wishlistBtn.classList.add('active');
        wishlistBtn.textContent = '♥';
      }
    } catch (err) {
      console.error(err);
    }
  });

  return card;
}

function renderPagination(total, page, limit) {
  const wrap = document.querySelector('[data-pagination]');
  wrap.innerHTML = '';
  const pageCount = Math.ceil(total / limit);
  if (pageCount <= 1) return;

  for (let i = 1; i <= pageCount; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === page) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.page = i;
      loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    wrap.appendChild(btn);
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
