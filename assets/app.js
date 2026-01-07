(function () {
  const DA2_URL = '#';
  const LEAD_API_URL = 'https://app.certouser.it/api/lead-submit';
  const WIZARD_STORAGE_KEY = 'rts_area_state_v1';
  const WIZARD_STORAGE_HINTS = ['wizard', 'rigenera', 'terzosettore', 'lead', 'esito'];

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

  const safeJsonParse = (value) => {
    try {
      return { ok: true, value: JSON.parse(value) };
    } catch (error) {
      return { ok: false, value: null };
    }
  };

  const collectStorageMatches = (storage) => {
    const matches = {};
    if (!storage) return matches;
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const lowerKey = key.toLowerCase();
      if (key !== WIZARD_STORAGE_KEY && !WIZARD_STORAGE_HINTS.some((hint) => lowerKey.includes(hint))) continue;
      const storedValue = storage.getItem(key);
      if (typeof storedValue !== 'string') continue;
      const parsed = safeJsonParse(storedValue);
      if (parsed.ok) {
        matches[key] = parsed.value;
      }
    }
    return matches;
  };

  const collectPageObjects = () => {
    const candidates = ['wizardState', 'wizard_state', 'wizard', 'run', 'state', 'result', 'answers'];
    return candidates.reduce((acc, key) => {
      const value = window[key];
      if (value && typeof value === 'object') {
        acc[key] = value;
      }
      return acc;
    }, {});
  };

  const collectHiddenFields = (form) => {
    if (!form) return {};
    const fields = {};
    form.querySelectorAll('input[type="hidden"]').forEach((input) => {
      const name = input.name || input.id;
      if (!name) return;
      fields[name] = input.value;
    });
    return fields;
  };

  const mergeWizardSelections = (target, source) => {
    if (!source || typeof source !== 'object') return;
    if (source.answers && typeof source.answers === 'object') {
      Object.assign(target, source.answers);
    }
    if (source.selections && typeof source.selections === 'object') {
      Object.assign(target, source.selections);
    }
    if (source.org_type && !target.org_type) {
      target.org_type = source.org_type;
    }
    if (source.ente_type && !target.org_type) {
      target.org_type = source.ente_type;
    }
  };

  const mergeWizardResult = (target, source) => {
    if (!source || typeof source !== 'object') return;
    if (source.result && typeof source.result === 'object') {
      Object.assign(target, source.result);
    }
    if (source.esito && typeof source.esito === 'object') {
      Object.assign(target, source.esito);
    }
    if (source.outcome && typeof source.outcome === 'object') {
      Object.assign(target, source.outcome);
    }
    if (source.score !== undefined) target.score = source.score;
    if (source.punteggio !== undefined) target.punteggio = source.punteggio;
    if (source.indicazioni && typeof source.indicazioni === 'object') {
      target.indicazioni = source.indicazioni;
    }
  };

  const buildWizardState = (form) => {
    const storageLocal = collectStorageMatches(window.localStorage);
    const storageSession = collectStorageMatches(window.sessionStorage);
    const pageObjects = collectPageObjects();
    const hiddenFields = collectHiddenFields(form);
    const selections = {};
    const result = {};

    const sources = [storageLocal, storageSession, pageObjects];
    sources.forEach((source) => {
      Object.values(source).forEach((value) => {
        mergeWizardSelections(selections, value);
        mergeWizardResult(result, value);
      });
    });

    Object.entries(hiddenFields).forEach(([key, value]) => {
      if (value !== '' && selections[key] === undefined) {
        selections[key] = value;
      }
    });

    return {
      page: window.location.pathname,
      ts: new Date().toISOString(),
      userAgent: window.navigator.userAgent,
      selections,
      result,
      raw: {
        storage: { local: storageLocal, session: storageSession },
        page: pageObjects,
        hidden_fields: hiddenFields
      }
    };
  };

  const normalizeWizardState = (payload, wizardState) => {
    const ws = payload.wizard_state ?? wizardState;
    payload.wizard_state = typeof ws === 'string' ? ws : JSON.stringify(ws);
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
    const wizardState = buildWizardState(form);
    const attachments = getAttachmentsMetadata(form);
    const resolvedLeadType =
      leadType || (window.location.pathname.includes('esito') ? 'esito' : 'contatto');
    const orgType = wizardState?.selections?.org_type || wizardState?.selections?.ente_type || 'ets';
    const payload = {
      source_site: 'rigeneraterzosettore.it',
      org_type: orgType,
      lead_type: resolvedLeadType,
      org_name: data.get('ente')?.toString().trim() || '',
      full_name: (data.get('referente') || data.get('nome'))?.toString().trim() || '',
      role: data.get('ruolo')?.toString().trim() || '',
      email: data.get('email')?.toString().trim() || '',
      phone: data.get('telefono')?.toString().trim() || '',
      city: data.get('citta')?.toString().trim() || '',
      message: data.get('messaggio')?.toString().trim() || '',
      source_url: window.location.href
    };
    normalizeWizardState(payload, wizardState);
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
