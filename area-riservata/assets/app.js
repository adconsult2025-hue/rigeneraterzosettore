const STORAGE_KEY = "rts_area_state_v1";
const CONTACT_KEY = "userContact";

const steps = [
  {
    id: "immobili",
    question: "L’ente dispone o gestisce uno o più immobili?",
    help: "Indicare sedi, immobili in gestione o in comodato d'uso.",
    nextYes: "consumi",
    nextNo: "consumi"
  },
  {
    id: "consumi",
    question: "Esistono consumi elettrici significativi sulle sedi?",
    help: "Valutare bollette, potenza installata e costi annuali.",
    nextYes: "fotovoltaico",
    nextNo: "fotovoltaico"
  },
  {
    id: "fotovoltaico",
    question: "È presente o valutabile un impianto FV (anche su copertura)?",
    help: "Anche solo pre-fattibilità o spazi potenzialmente idonei.",
    nextYes: "impianti_termici",
    nextNo: "impianti_termici"
  },
  {
    id: "impianti_termici",
    question: "L’ente ha impianti termici da sostituire o riqualificare (PDC, caldaie, ecc.) con interesse a incentivi?",
    help: "Conto Termico, bandi e incentivi per riqualificazione energetica.",
    nextYes: "rigenerazione",
    nextNo: "rigenerazione"
  },
  {
    id: "rigenerazione",
    question: "L’ente intende attivare un percorso di rigenerazione immobiliare (adeguamento, riqualificazione, manutenzione straordinaria)?",
    help: "Valutiamo impatti su spazi, servizi e sostenibilità economica.",
    nextYes: "documenti",
    nextNo: "documenti"
  },
  {
    id: "documenti",
    question: "Sono disponibili documenti base (titolo disponibilità immobile, bollette, dati catastali)?",
    help: "Serve per accelerare la valutazione tecnica preliminare.",
    nextYes: "cer",
    nextNo: "cer"
  },
  {
    id: "cer",
    question: "L’ente è interessato a CER/CEC per la condivisione di energia?",
    help: "Comunità Energetiche per ottimizzare produzione e consumi.",
    nextYes: "governance",
    nextNo: "governance"
  },
  {
    id: "governance",
    question: "L’ente necessita supporto per governance, delibere e atti deliberativi?",
    help: "Supportiamo la formalizzazione delle decisioni e del percorso.",
    nextYes: "vincoli",
    nextNo: "vincoli"
  },
  {
    id: "vincoli",
    question: "Sono presenti vincoli (tutela, autorizzazioni, vincoli urbanistici) noti?",
    help: "Informazioni utili per evitare rallentamenti.",
    nextYes: "certo_user",
    nextNo: "certo_user"
  },
  {
    id: "certo_user",
    question: "L’ente vuole una presa in carico operativa su CERtoUSER?",
    help: "Attivazione percorso operativo con team dedicato.",
    nextYes: null,
    nextNo: null
  }
];

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const nowISO = () => new Date().toISOString();

const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const state = stored ? JSON.parse(stored) : {};
    return {
      currentStepId: state.currentStepId || steps[0].id,
      answers: state.answers || {},
      notes: state.notes || {},
      history: state.history || [],
      lastUpdated: state.lastUpdated || null,
      userContact: state.userContact || null
    };
  } catch (error) {
    return {
      currentStepId: steps[0].id,
      answers: {},
      notes: {},
      history: [],
      lastUpdated: null,
      userContact: null
    };
  }
};

const saveState = (state) => {
  const payload = {
    ...state,
    lastUpdated: nowISO()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
};

const resetState = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CONTACT_KEY);
  return loadState();
};

const getCurrentStepId = () => loadState().currentStepId || steps[0].id;

const setCurrentStepId = (stepId) => {
  const state = loadState();
  state.currentStepId = stepId;
  return saveState(state);
};

const registraRisposta = (stepId, answer, note) => {
  const state = loadState();
  state.answers[stepId] = answer;
  if (note) {
    state.notes[stepId] = note;
  }
  if (!state.history.includes(stepId)) {
    state.history.push(stepId);
  }
  return saveState(state);
};

const calcolaCompletezza = () => {
  const state = loadState();
  const answered = Object.keys(state.answers || {}).length;
  return Math.round((answered / steps.length) * 100);
};

const getStoredContact = () => {
  try {
    const stored = localStorage.getItem(CONTACT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
};

const setUserContact = (contact) => {
  localStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
  const state = loadState();
  state.userContact = contact;
  saveState(state);
};

const buildLeadPayload = (type) => {
  const state = loadState();
  return {
    type: "terzo_settore",
    leadType: type || null,
    timestamp: nowISO(),
    currentStepId: state.currentStepId || steps[0].id,
    answers: state.answers || {},
    notes: state.notes || {},
    userContact: state.userContact || getStoredContact()
  };
};

const renderJson = (target, data) => {
  if (target) {
    target.textContent = JSON.stringify(data, null, 2);
  }
};

const initContactForms = () => {
  const forms = qsa("[data-contact-form]");
  if (!forms.length) return;

  forms.forEach((form) => {
    const notice = qs("[data-form-notice]", form.parentElement);
    const debug = qs("[data-form-debug]", form.parentElement);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const contact = {
        nome: data.nome || "",
        ruolo: data.ruolo || "",
        ente: data.ente || "",
        sede: data.sede || "",
        citta: data.citta || "",
        email: data.email || "",
        telefono: data.telefono || "",
        messaggio: data.messaggio || "",
        privacy: data.privacy ? true : false,
        timestamp: nowISO()
      };
      setUserContact(contact);
      if (notice) {
        notice.classList.add("show");
        notice.textContent = "Richiesta registrata. Verrai ricontattato.";
      }
      if (debug) {
        renderJson(debug, buildLeadPayload("contact"));
      }
    });
  });
};

const initDashboard = () => {
  const root = qs("[data-page='dashboard']");
  if (!root) return;
  const state = loadState();
  const completion = calcolaCompletezza();
  const completionEl = qs("[data-completion]", root);
  const updatedEl = qs("[data-updated]", root);
  if (completionEl) completionEl.textContent = `${completion}%`;
  if (updatedEl) {
    updatedEl.textContent = state.lastUpdated ? new Date(state.lastUpdated).toLocaleString("it-IT") : "Non disponibile";
  }
  const debug = qs("[data-dashboard-debug]", root);
  renderJson(debug, buildLeadPayload("dashboard"));

  const newBtn = qs("[data-action='new-eval']", root);
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      resetState();
      window.location.href = "/area-riservata/wizard.html";
    });
  }
};

const initWizard = () => {
  const root = qs("[data-page='wizard']");
  if (!root) return;
  const questionEl = qs("[data-question]", root);
  const helpEl = qs("[data-help]", root);
  const progressEl = qs("[data-progress]", root);
  const progressLabel = qs("[data-progress-label]", root);
  const noteInput = qs("[data-note-input]", root);
  const saveNoteBtn = qs("[data-note-save]", root);
  const summary = qs("[data-summary-json]", root);
  const backBtn = qs("[data-action='back']", root);

  const renderStep = () => {
    const state = loadState();
    const currentId = state.currentStepId || steps[0].id;
    const step = steps.find((item) => item.id === currentId) || steps[0];
    if (questionEl) questionEl.textContent = step.question;
    if (helpEl) helpEl.textContent = step.help;
    if (noteInput) noteInput.value = state.notes[step.id] || "";
    const completion = calcolaCompletezza();
    if (progressEl) progressEl.style.width = `${completion}%`;
    if (progressLabel) progressLabel.textContent = `${completion}% completato`;
    renderJson(summary, buildLeadPayload("wizard"));
  };

  const goNext = (answer) => {
    const state = loadState();
    const currentId = state.currentStepId || steps[0].id;
    const step = steps.find((item) => item.id === currentId) || steps[0];
    const note = noteInput ? noteInput.value.trim() : "";
    registraRisposta(step.id, answer, note);
    const nextId = answer === "yes" ? step.nextYes : step.nextNo;
    if (nextId) {
      setCurrentStepId(nextId);
      renderStep();
      return;
    }
    setCurrentStepId(step.id);
    window.location.href = "/area-riservata/esito";
  };

  qsa("[data-answer]", root).forEach((btn) => {
    btn.addEventListener("click", () => goNext(btn.dataset.answer));
  });

  if (saveNoteBtn) {
    saveNoteBtn.addEventListener("click", () => {
      const state = loadState();
      const currentId = state.currentStepId || steps[0].id;
      const note = noteInput ? noteInput.value.trim() : "";
      if (note) {
        state.notes[currentId] = note;
        saveState(state);
        renderStep();
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const state = loadState();
      if (state.history.length > 1) {
        state.history.pop();
        const previous = state.history[state.history.length - 1];
        state.currentStepId = previous;
        saveState(state);
      } else {
        state.currentStepId = steps[0].id;
        saveState(state);
      }
      renderStep();
    });
  }

  renderStep();
};

const initEsito = () => {
  const root = qs("[data-page='esito']");
  if (!root) return;
  const state = loadState();
  const list = qs("[data-response-list]", root);
  const statusBadge = qs("[data-status-badge]", root);
  const indicationList = qs("[data-indication-list]", root);
  const debug = qs("[data-esito-debug]", root);

  const completion = calcolaCompletezza();
  if (statusBadge) {
    statusBadge.textContent = completion >= 100 ? "Valutazione completata" : "Valutazione in corso";
  }

  if (list) {
    list.innerHTML = "";
    steps.forEach((step) => {
      const answer = state.answers[step.id];
      if (!answer) return;
      const item = document.createElement("li");
      item.className = "response-item";
      const note = state.notes[step.id];
      item.innerHTML = `
        <strong>${step.question}</strong>
        <span>${answer === "yes" ? "Sì" : "No"}</span>
        ${note ? `<div class="small">Nota: ${note}</div>` : ""}
      `;
      list.appendChild(item);
    });
  }

  if (indicationList) {
    const conditions = [];
    if (state.answers.immobili === "yes" && state.answers.consumi === "yes" && state.answers.cer === "yes") {
      conditions.push("Percorso CER/CEC prioritario");
    }
    if (state.answers.impianti_termici === "yes") {
      conditions.push("Percorso Conto Termico prioritario");
    }
    if (state.answers.rigenerazione === "yes") {
      conditions.push("Percorso Rigenerazione immobiliare prioritario");
    }

    indicationList.innerHTML = "";
    if (!conditions.length) {
      const li = document.createElement("li");
      li.textContent = "È necessaria un’analisi tecnica preliminare aggiuntiva.";
      indicationList.appendChild(li);
    } else {
      conditions.forEach((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        indicationList.appendChild(li);
      });
    }
  }

  renderJson(debug, buildLeadPayload("esito"));
};

document.addEventListener("DOMContentLoaded", () => {
  initContactForms();
  initDashboard();
  initWizard();
  initEsito();
});
