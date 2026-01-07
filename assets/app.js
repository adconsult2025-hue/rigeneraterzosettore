(function () {
  const DA2_URL = '#';
  const LEAD_API_URL = 'https://app.certouser.it/api/lead-submit';
  const WIZARD_STORAGE_KEY = 'rts_area_state_v1';

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

  const getWizardState = () => {
    try {
      const stored = localStorage.getItem(WIZARD_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  };

  const getAttachmentsMetadata = (form) => {
    const inputs = Array.from(form.querySelectorAll('input[type="file"]'));
    return inputs.flatMap((input) =>
      Array.from(input.files || []).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type
      }))
    );
  };

  const buildLeadPayload = (form, leadType) => {
    const data = new FormData(form);
    const wizardState = getWizardState();
    const attachments = getAttachmentsMetadata(form);
    const payload = {
      source_site: 'rigeneraterzosettore.it',
      org_type: 'ets',
      lead_type: leadType,
      org_name: data.get('ente')?.toString().trim() || '',
      full_name: (data.get('referente') || data.get('nome'))?.toString().trim() || '',
      role: data.get('ruolo')?.toString().trim() || '',
      email: data.get('email')?.toString().trim() || '',
      phone: data.get('telefono')?.toString().trim() || '',
      city: data.get('citta')?.toString().trim() || '',
      message: data.get('messaggio')?.toString().trim() || '',
      source_url: window.location.href
    };
    if (wizardState) {
      payload.wizard_state = wizardState;
    }
    if (attachments.length) {
      payload.attachments = attachments;
    }
    return payload;
  };

  const setFormNotice = (notice, message, isError = false) => {
    if (!notice) return;
    if (!message) {
      notice.textContent = '';
      notice.classList.remove('show', 'error');
      return;
    }
    notice.textContent = message;
    notice.classList.add('show');
    notice.classList.toggle('error', isError);
  };

  const setSubmitState = (button, isBusy) => {
    if (!button) return;
    if (isBusy) {
      button.dataset.label = button.textContent;
      button.textContent = 'Invio in corso...';
      button.disabled = true;
      return;
    }
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  };

  const initLeadForms = () => {
    const forms = document.querySelectorAll('[data-lead-form]');
    if (!forms.length) return;

    forms.forEach((form) => {
      const notice = form.querySelector('[data-form-notice]');
      const submitButton = form.querySelector('button[type="submit"]');
      const leadType = form.dataset.leadType || 'contatto';

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setFormNotice(notice, '', false);
        setSubmitState(submitButton, true);
        const payload = buildLeadPayload(form, leadType);

        try {
          const response = await fetch(LEAD_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error('lead-submit-failed');
          }

          form.reset();
          setFormNotice(notice, 'Richiesta inviata correttamente', false);
        } catch (error) {
          setFormNotice(
            notice,
            'Errore durante l’invio. Verifica i dati e riprova tra poco.',
            true
          );
        } finally {
          setSubmitState(submitButton, false);
        }
      });
    });
  };

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

    initLeadForms();
  });
})();
