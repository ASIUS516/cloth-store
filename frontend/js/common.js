// Общий скрипт для шапки сайта — подключается на всех страницах.
// Отвечает за: мобильное меню, счётчики корзины/избранного,
// отображение "Войти" или имени пользователя.

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  updateCartBadge();
  updateAuthState();
});

function initMobileNav() {
  const toggle = document.querySelector('[data-mobile-nav-toggle]');
  const nav = document.querySelector('[data-site-nav]');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

// Обновляет число товаров в значке корзины в шапке
async function updateCartBadge() {
  const badge = document.querySelector('[data-cart-badge]');
  if (!badge) return;

  try {
    const res = await fetch('/api/cart');
    const data = await res.json();
    const count = data.items.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  } catch (err) {
    console.error('Не удалось загрузить корзину', err);
  }
}

// Проверяет, залогинен ли пользователь, и показывает
// либо ссылку "Войти", либо имя пользователя + "Личный кабинет"
async function updateAuthState() {
  const authSlot = document.querySelector('[data-auth-slot]');
  if (!authSlot) return;

  try {
    const res = await fetch('/api/auth/me');
    if (res.status === 401) {
      renderLoggedOut(authSlot);
      return;
    }
    const user = await res.json();
    renderLoggedIn(authSlot, user);
  } catch (err) {
    renderLoggedOut(authSlot);
  }
}

function renderLoggedOut(slot) {
  slot.innerHTML = `<a href="login.html" class="icon-link" data-i18n="nav_login">${i18n.t('nav_login')}</a>`;
}

function renderLoggedIn(slot, user) {
  slot.innerHTML = `
    <a href="account.html" class="icon-link">${escapeHtml(user.name)}</a>
    <a href="#" class="icon-link" data-logout data-i18n="nav_logout">${i18n.t('nav_logout')}</a>
  `;
  slot.querySelector('[data-logout]').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = 'index.html';
  });
}

// Небольшая защита от XSS при вставке имени пользователя в HTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
