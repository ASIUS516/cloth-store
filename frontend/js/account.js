document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/api/auth/me');
  if (res.status === 401) {
    window.location.href = 'login.html';
    return;
  }
  const user = await res.json();
  document.querySelector('[data-user-name]').textContent = user.name;
  document.querySelector('[data-user-email]').textContent = user.email;

  loadOrders();
});

async function loadOrders() {
  const res = await fetch('/api/orders');
  const orders = await res.json();
  const list = document.querySelector('[data-orders-list]');
  const emptyState = document.querySelector('[data-orders-empty]');

  if (orders.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  list.innerHTML = orders.map((order) => `
    <div class="order-card">
      <strong>${i18n.t('account_order_number')}${order.id}</strong>
      <div>${i18n.t('account_order_status')}: ${order.status}</div>
      <div>${i18n.t('account_order_total')}: ${order.total_price.toLocaleString()} ₼</div>
      <div style="color: var(--text-muted); font-size: 0.82rem;">${new Date(order.created_at).toLocaleString()}</div>
    </div>
  `).join('');
}
