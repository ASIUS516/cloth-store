document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-register-form]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.querySelector('[data-form-error]');
    errorBox.style.display = 'none';

    if (form.password.value !== form.password_confirm.value) {
      errorBox.textContent = i18n.t('register_password_mismatch');
      errorBox.style.display = 'block';
      return;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.error || 'Не удалось создать аккаунт';
      errorBox.style.display = 'block';
      return;
    }

    window.location.href = 'account.html';
  });
});
