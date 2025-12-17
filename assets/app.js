(function () {
  const DA2_URL = '#';

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
      skipLink.addEventListener('click', () => {
        skipLink.blur();
      });
    }

    const poweredBy = document.querySelector('.powered-by-link');
    if (poweredBy) {
      poweredBy.setAttribute('href', DA2_URL);
      poweredBy.setAttribute('title', 'Sito in pubblicazione');
      poweredBy.setAttribute('aria-label', 'Powered by DA2 - sito in pubblicazione');

      if (DA2_URL === '#') {
        poweredBy.addEventListener('click', (event) => {
          event.preventDefault();
        });
      }
    }
  });
})();
