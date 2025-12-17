(function () {
  const header = document.querySelector('.site-header');
  const btn = document.querySelector('.menu-toggle');
  const nav = document.getElementById('primary-nav');
  if (!header || !btn || !nav) return;

  function closeMenu() {
    header.classList.remove('nav-open');
    btn.setAttribute('aria-expanded', 'false');
  }
  function openMenu() {
    header.classList.add('nav-open');
    btn.setAttribute('aria-expanded', 'true');
  }
  function toggleMenu() {
    const isOpen = header.classList.contains('nav-open');
    isOpen ? closeMenu() : openMenu();
  }

  btn.addEventListener('click', toggleMenu);

  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 769) {
      closeMenu();
    }
  });
})();
