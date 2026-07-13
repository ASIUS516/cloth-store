// Логика страницы одного товара: подгружает товар по id из URL
// (product.html?id=5), рендерит фото-переключатель, инфо, добавление
// в корзину и в избранное.

let currentProduct = null;
let currentAngle = 'front';

document.addEventListener('DOMContentLoaded', loadProduct);
document.addEventListener('i18n:changed', () => {
  if (currentProduct) renderProduct(currentProduct);
});

function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function loadProduct() {
  const root = document.querySelector('[data-product-root]');
  const id = getProductId();

  if (!id) {
    root.innerHTML = `<p>${i18n.t('product_not_found')}</p>`;
    return;
  }

  try {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) {
      root.innerHTML = `<p>${i18n.t('product_not_found')}</p>`;
      return;
    }
    currentProduct = await res.json();
    currentAngle = 'front';
    renderProduct(currentProduct);
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p>${i18n.t('product_not_found')}</p>`;
  }
}

async function renderProduct(product) {
  const root = document.querySelector('[data-product-root]');
  document.title = `${product.name} — LUXE MAISON`;

  const wishlistIds = await getWishlistIds();
  const isWishlisted = wishlistIds.includes(product.id);

  const viewTextByAngle = {
    front: product.view_front_text,
    side: product.view_side_text,
    back: product.view_back_text,
  };

  root.innerHTML = `
    <div class="product-detail">
      <div>
        <div class="product-detail__view" data-view-text>${viewTextByAngle[currentAngle] || product.view_front_text}</div>
        <div class="product-detail__angles">
          <button class="${currentAngle === 'front' ? 'active' : ''}" data-angle="front" data-i18n="view_front">${i18n.t('view_front')}</button>
          <button class="${currentAngle === 'side' ? 'active' : ''}" data-angle="side" data-i18n="view_side">${i18n.t('view_side')}</button>
          <button class="${currentAngle === 'back' ? 'active' : ''}" data-angle="back" data-i18n="view_back">${i18n.t('view_back')}</button>
        </div>
      </div>
      <div>
        <span class="product-detail__category">${capitalize(product.category)}</span>
        <h1 class="product-detail__name">${escapeHtml(product.name)}</h1>
        <div class="product-detail__price">${product.price.toLocaleString()} ₼</div>
        <div class="product-detail__meta">
          <span>${i18n.t('product_size')}: ${escapeHtml(product.size)}</span>
          <span>${i18n.t('product_color')}: ${escapeHtml(product.color)}</span>
        </div>
        ${product.description ? `
          <h3>${i18n.t('product_description_title')}</h3>
          <p class="product-detail__description">${escapeHtml(product.description)}</p>
        ` : ''}
        <div class="product-detail__actions">
          <button class="btn" data-add-to-cart data-i18n="product_add_to_cart">${i18n.t('product_add_to_cart')}</button>
          <button class="btn btn-outline ${isWishlisted ? 'active' : ''}" data-wishlist-btn>
            ${isWishlisted ? '♥ ' + i18n.t('product_remove_from_wishlist') : '♡ ' + i18n.t('product_add_to_wishlist')}
          </button>
        </div>
      </div>
    </div>
  `;

  const viewText = root.querySelector('[data-view-text]');
  root.querySelectorAll('[data-angle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-angle]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentAngle = btn.getAttribute('data-angle');
      viewText.textContent = viewTextByAngle[currentAngle];
    });
  });

  root.querySelector('[data-add-to-cart]').addEventListener('click', async (e) => {
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

  const wishlistBtn = root.querySelector('[data-wishlist-btn]');
  wishlistBtn.addEventListener('click', async () => {
    const active = wishlistBtn.classList.contains('active');
    try {
      if (active) {
        await fetch(`/api/wishlist/${product.id}`, { method: 'DELETE' });
        wishlistBtn.classList.remove('active');
        wishlistBtn.textContent = '♡ ' + i18n.t('product_add_to_wishlist');
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
        wishlistBtn.textContent = '♥ ' + i18n.t('product_remove_from_wishlist');
      }
    } catch (err) {
      console.error(err);
    }
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

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
