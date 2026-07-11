document.addEventListener('DOMContentLoaded', loadWishlist);

async function loadWishlist() {
  const res = await fetch('/api/wishlist');
  if (res.status === 401) {
    window.location.href = 'login.html';
    return;
  }
  const products = await res.json();
  renderWishlist(products);
}

function renderWishlist(products) {
  const grid = document.querySelector('[data-wishlist-grid]');
  const emptyState = document.querySelector('[data-wishlist-empty]');
  grid.innerHTML = '';

  if (products.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-card__view">${product.view_front_text}</div>
      <div class="product-card__body">
        <span class="product-card__category">${product.category}</span>
        <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
        <span class="product-card__price">${product.price.toLocaleString()} ₼</span>
        <div class="product-card__actions">
          <button class="btn btn-small" data-add-to-cart data-i18n="product_add_to_cart">${i18n.t('product_add_to_cart')}</button>
          <button class="btn btn-outline btn-small" data-remove data-i18n="product_remove_from_wishlist">${i18n.t('product_remove_from_wishlist')}</button>
        </div>
      </div>
    `;

    card.querySelector('[data-add-to-cart]').addEventListener('click', async () => {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      });
      updateCartBadge();
    });

    card.querySelector('[data-remove]').addEventListener('click', async () => {
      await fetch(`/api/wishlist/${product.id}`, { method: 'DELETE' });
      loadWishlist();
    });

    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
