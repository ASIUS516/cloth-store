// Логика страницы корзины: показать товары, менять количество,
// удалять товары, оформлять заказ.

document.addEventListener('DOMContentLoaded', () => {
  loadCart();

  document.querySelector('[data-checkout-form]').addEventListener('submit', handleCheckout);
});

async function loadCart() {
  const res = await fetch('/api/cart');
  const cart = await res.json();
  renderCart(cart);
}

function renderCart(cart) {
  const list = document.querySelector('[data-cart-list]');
  const emptyState = document.querySelector('[data-cart-empty]');
  const summary = document.querySelector('[data-cart-summary]');
  const checkoutSection = document.querySelector('[data-checkout-section]');

  list.innerHTML = '';

  if (cart.items.length === 0) {
    emptyState.style.display = 'block';
    summary.style.display = 'none';
    checkoutSection.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  summary.style.display = 'flex';
  checkoutSection.style.display = 'block';

  cart.items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name)}</strong><br>
        <span style="color: var(--text-muted); font-size: 0.85rem;">${item.size} · ${item.color}</span>
      </div>
      <div class="cart-item__qty">
        <button data-qty-minus>−</button>
        <span data-qty-value>${item.quantity}</span>
        <button data-qty-plus>+</button>
      </div>
      <div>${(item.price * item.quantity).toLocaleString()} ₼</div>
      <button class="btn btn-outline btn-small" data-remove data-i18n="cart_remove">${i18n.t('cart_remove')}</button>
    `;

    row.querySelector('[data-qty-minus]').addEventListener('click', () => {
      const newQty = item.quantity - 1;
      if (newQty < 1) return;
      updateQuantity(item.cart_item_id, newQty);
    });
    row.querySelector('[data-qty-plus]').addEventListener('click', () => {
      updateQuantity(item.cart_item_id, item.quantity + 1);
    });
    row.querySelector('[data-remove]').addEventListener('click', () => {
      removeItem(item.cart_item_id);
    });

    list.appendChild(row);
  });

  document.querySelector('[data-cart-total]').textContent = `${cart.total.toLocaleString()} ₼`;
}

async function updateQuantity(itemId, quantity) {
  const res = await fetch(`/api/cart/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  const cart = await res.json();
  renderCart(cart);
  updateCartBadge();
}

async function removeItem(itemId) {
  const res = await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
  const cart = await res.json();
  renderCart(cart);
  updateCartBadge();
}

async function handleCheckout(e) {
  e.preventDefault();
  const form = e.target;
  const errorBox = document.querySelector('[data-checkout-error]');
  errorBox.style.display = 'none';

  const payload = {
    shipping_name: form.name.value.trim(),
    shipping_address: form.address.value.trim(),
    shipping_phone: form.phone.value.trim(),
  };

  if (!payload.shipping_name || !payload.shipping_address || !payload.shipping_phone) {
    errorBox.textContent = 'Заполните все поля';
    errorBox.style.display = 'block';
    return;
  }

  const res = await fetch('/api/orders/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    errorBox.textContent = data.error || 'Не удалось оформить заказ';
    errorBox.style.display = 'block';
    return;
  }

  // Показываем подтверждение вместо формы
  document.querySelector('[data-cart-page-content]').style.display = 'none';
  const confirmation = document.querySelector('[data-order-confirmation]');
  confirmation.style.display = 'block';
  confirmation.querySelector('[data-order-id]').textContent = data.id;
  updateCartBadge();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
