// Переключение светлой/тёмной темы.
// Выбор сохраняется в localStorage и применяется при каждой загрузке страницы.

(function () {
  const STORAGE_KEY = 'store_theme';

  // Применяем класс к <html>, а не к <body> — так тема ставится
  // ещё до того, как браузер отрисует body, и не будет "мигания"
  // светлой темой перед переключением на тёмную.
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }

  // Применяем сохранённую тему сразу, до отрисовки остального контента
  const savedTheme = localStorage.getItem(STORAGE_KEY) || 'light';
  applyTheme(savedTheme);

  // Когда DOM готов — вешаем обработчик на кнопку переключения темы
  document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.querySelector('[data-theme-toggle]');
    if (!toggleButton) return;

    toggleButton.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark-theme');
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    });
  });
})();
