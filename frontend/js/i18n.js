// Простая система переводов без библиотек.
// Каждый текстовый элемент помечен атрибутом data-i18n="ключ",
// а сами переводы лежат в frontend/locales/{ru,en,az}.json

const i18n = (function () {
  const STORAGE_KEY = 'store_lang';
  let dictionary = {};

  // Достаёт перевод по ключу; если перевода нет — возвращает сам ключ,
  // чтобы страница не ломалась
  function t(key) {
    return dictionary[key] || key;
  }

  // Проходит по всем элементам с data-i18n и подставляет перевод.
  // Для полей ввода (placeholder) используется data-i18n-placeholder.
  function applyToPage() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
  }

  async function loadLanguage(lang) {
    const response = await fetch(`/locales/${lang}.json`);
    dictionary = await response.json();
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    applyToPage();
    // Сообщаем остальным скриптам страницы, что язык поменялся —
    // полезно, если какой-то список товаров нужно перерисовать с переводом
    document.dispatchEvent(new CustomEvent('i18n:changed'));
  }

  function getCurrentLang() {
    return localStorage.getItem(STORAGE_KEY) || 'ru';
  }

  function init() {
    const lang = getCurrentLang();
    loadLanguage(lang);

    document.addEventListener('DOMContentLoaded', () => {
      const select = document.querySelector('[data-lang-select]');
      if (select) {
        select.value = lang;
        select.addEventListener('change', (e) => loadLanguage(e.target.value));
      }
    });
  }

  init();

  return { t, loadLanguage, getCurrentLang, applyToPage };
})();
