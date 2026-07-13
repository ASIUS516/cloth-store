document.addEventListener('DOMContentLoaded', loadBestsellers);
document.addEventListener('i18n:changed', loadBestsellers);

async function loadBestsellers() {
  const res = await fetch('/api/products?limit=8&sort=newest');
  const data = await res.json();
  const grid = document.querySelector('[data-bestsellers-grid]');
  if (!grid) return;
  grid.innerHTML = '';

  data.products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <a class="product-card__media-link" href="product.html?id=${product.id}">
        <div class="product-card__view">${product.view_front_text}</div>
      </a>
      <a class="product-card__body-link" href="product.html?id=${product.id}">
        <div class="product-card__body">
          <span class="product-card__category">${product.category}</span>
          <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
          <span class="product-card__price">${product.price.toLocaleString()} ₼</span>
        </div>
      </a>
      <div class="product-card__actions">
        <a href="product.html?id=${product.id}" class="btn btn-outline btn-small btn-block" data-i18n="product_add_to_cart">${i18n.t('product_add_to_cart')}</a>
      </div>
    `;
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
