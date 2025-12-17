(function () {
  const DA2_URL = 'https://www.da2spa.it/';

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.revealDelay;
          if (delay) {
            entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
          }
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -10%' }
  );

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal').forEach((el, index) => {
      const baseDelay = el.dataset.revealDelay || (index % 6) * 40;
      el.style.setProperty('--reveal-delay', `${baseDelay}ms`);
      observer.observe(el);
    });

    document.querySelectorAll('.da2-link').forEach((link) => {
      link.href = DA2_URL;
    });

    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
      skipLink.addEventListener('click', () => {
        skipLink.blur();
      });
    }
  });
})();
