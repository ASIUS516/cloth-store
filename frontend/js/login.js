document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-login-form]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.querySelector('[data-form-error]');
    errorBox.style.display = 'none';

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email.value.trim(),
        password: form.password.value,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.error || i18n.t('login_error');
      errorBox.style.display = 'block';
      return;
    }

    window.location.href = 'account.html';
  });
});
