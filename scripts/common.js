const setCopyrightYear = () => {
  const yearEl = document.querySelector('#copyright-year');
  if (!yearEl) {
    return;
  }

  yearEl.textContent = String(new Date().getFullYear());
};

const init = () => {
  setCopyrightYear();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
