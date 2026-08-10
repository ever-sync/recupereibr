document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("lead-form");
  const message = document.getElementById("form-message");
  const phone = document.getElementById("lead-phone");
  const submitButton = form.querySelector(".lead-submit[type='submit']");
  const steps = Array.from(form.querySelectorAll(".lead-form-step"));
  const nextButton = document.getElementById("form-next");
  const backButton = document.getElementById("form-back");
  const stepLabel = document.getElementById("form-step-label");
  const stepDescription = document.getElementById("form-step-description");
  const progressBar = document.getElementById("form-progress-bar");
  const diseaseField = document.getElementById("disease-field");
  const diseaseSelect = document.getElementById("lead-disease");
  const params = new URLSearchParams(window.location.search);
  let currentStep = 0;
  let formStarted = false;

  const trackEvent = (eventName, parameters = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...parameters });
  };

  const showMessage = (text, type) => {
    message.textContent = text;
    message.className = `form-message visible ${type}`;
    message.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const clearMessage = () => {
    message.textContent = "";
    message.className = "form-message";
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  phone.addEventListener("input", () => {
    phone.value = formatPhone(phone.value);
  });

  /* O diagnóstico é opcional. `health = Sim` já basta para qualificar o lead, e
     o detalhe é pergunta de ligação, não de formulário: obrigar alguém a
     selecionar "Neoplasia maligna" num select, antes de confiar na empresa, era
     o ponto de abandono mais caro da página. */
  const syncDiseaseField = () => {
    const selected = form.querySelector('input[name="health"]:checked')?.value || "";
    const needsDisease = Boolean(selected) && selected !== "Não";
    diseaseField.hidden = !needsDisease;
    if (!needsDisease) diseaseSelect.value = "";
  };
  form.querySelectorAll('input[name="health"]').forEach((input) => input.addEventListener("change", syncDiseaseField));

  const invalidField = (container) => {
    const required = Array.from(container.querySelectorAll("[required]"));
    return required.find((field) => {
      if (field.type === "radio") {
        return !container.querySelector(`input[name="${field.name}"]:checked`);
      }
      if (field.type === "checkbox") return !field.checked;
      if (field.type === "tel") return field.value.replace(/\D/g, "").length < 10;
      if (field.type === "email") return !field.validity.valid;
      return !field.value.trim();
    });
  };

  const setFieldValue = (name, value) => {
    const fields = Array.from(form.querySelectorAll(`[name="${name}"]`));
    if (!fields.length || !value) return;
    if (fields[0].type === "radio") {
      const match = fields.find((field) => field.value === value);
      if (match) match.checked = true;
      return;
    }
    fields[0].value = value;
  };

  const renderStep = () => {
    steps.forEach((step, index) => {
      const active = index === currentStep;
      step.hidden = !active;
      step.classList.toggle("active", active);
    });

    // o contato é o passo 1 desde a inversão da ordem (ver comentário no HTML)
    const contactStep = currentStep === 0;
    stepLabel.textContent = `Passo ${currentStep + 1} de 2`;
    stepDescription.textContent = contactStep
      ? "Comece pelo seu nome, WhatsApp e melhor e-mail."
      : "Agora algumas perguntas rápidas. Não envie documentos por aqui.";
    progressBar.style.width = contactStep ? "50%" : "100%";
    clearMessage();
  };

  const origem = () => params.get("origem") || "landing_avaliacao";
  const isSimulationLead = () => ["quiz", "simulador"].includes(origem());

  /* A isenção da Lei nº 7.713/88 exige duas coisas ao mesmo tempo: receber um
     benefício previdenciário E ter uma das condições previstas. Faltando
     qualquer uma delas não há o que analisar, e a pessoa merece saber na hora
     em vez de esperar por uma ligação que não viria.

     `paysIr = "Não"` de propósito NÃO desqualifica: quem não tem desconto hoje
     pode ter pago nos cinco anos anteriores, e esse valor é recuperável. */
  const motivoDesqualificacao = (payload) => {
    if (payload.benefit === "Nenhuma das opções") return "sem-beneficio";
    if (payload.health === "Não") return "sem-condicao";
    return null;
  };

  const destinoObrigado = (motivo) => {
    if (motivo) return `/obrigado-${motivo}`;
    return isSimulationLead() ? "/obrigado-simulacao" : "/obrigado-avaliacao";
  };
  const resolverEndpoint = () =>
    String(
      isSimulationLead()
        ? window.RECUPEREIBR_SIMULATION_ENDPOINT || form.dataset.simulationEndpoint
        : window.RECUPEREIBR_LEAD_ENDPOINT || form.dataset.endpoint
    ).trim();

  /* Envia o contato assim que ele é preenchido, antes das perguntas de
     qualificação — mesmo padrão do quiz de /simulacao. Quem desistir no passo 2
     já entrou como lead, em vez de sumir sem deixar rastro.

     Best-effort de propósito: se falhar, o fluxo continua e o envio final ainda
     tem sua chance. Bloquear aqui trocaria um lead parcial por lead nenhum. */
  /* A captura parcial só pode ser enviada a um fluxo que saiba distinguir
     `event: "lead_started"` do envio final — senão o n8n grava o mesmo lead duas
     vezes. O fluxo de Simulação (webhook 8ded9705) já trata esse evento; o de
     Captação (f48d604b) ainda não. Até ele tratar, ligue manualmente com
     `window.RECUPEREIBR_CAPTURA_PARCIAL = true`. */
  const capturaParcialAtiva = () =>
    window.RECUPEREIBR_CAPTURA_PARCIAL === true || isSimulationLead();

  let leadCaptured = false;
  const capturarContato = async () => {
    if (leadCaptured || !capturaParcialAtiva()) return;
    const endpoint = resolverEndpoint();
    if (!endpoint) return;

    const contato = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      email: form.elements.email.value.trim().toLowerCase(),
      consent: Boolean(form.elements.consent?.checked),
      source: origem(),
      event: "lead_started",
      eventId: window.recupereibr?.novoEventId?.() || "",
      ...(window.recupereibr?.atribuicao?.() || {}),
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contato)
      });
      if (!response.ok) throw new Error("Falha na captura parcial");
      leadCaptured = true;
      trackEvent("generate_lead", {
        source: contato.source,
        stage: "lead_started",
        persona: "idoso",
        eventId: contato.eventId
      });
    } catch {
      trackEvent("lead_form_partial_error", { source: contato.source });
    }
  };

  const loadPreviousAnswers = () => {
    const origin = params.get("origem") || "acesso_direto";
    if (origin === "hero_titular") setFieldValue("leadFor", "Para mim");
    setFieldValue("monthlyIr", params.get("valor_mensal"));
    setFieldValue("estimate", params.get("estimativa"));

    let quizData = null;
    try {
      quizData = JSON.parse(sessionStorage.getItem("recupereibrQuiz") || "null");
      sessionStorage.removeItem("recupereibrQuiz");
    } catch {
      quizData = null;
    }

    if (!quizData || origin !== "quiz") return;

    const relationshipMap = {
      "Pai ou mãe": "Para meu pai ou minha mãe",
      "Avô ou avó": "Para outro familiar",
      "Cônjuge ou companheiro": "Para meu cônjuge ou companheiro",
      "Outro familiar": "Para outro familiar",
      "Para mim": "Para mim"
    };
    const benefitMap = {
      "Aposentadoria": "Aposentadoria",
      "Pensão": "Pensão",
      "Militar reformado ou reserva": "Militar reformado ou da reserva",
      "Ainda não sei": "Não sei informar",
      "Nenhum desses": "Nenhuma das opções"
    };
    const irMap = {
      "Sim": "Sim",
      "Pagou nos últimos cinco anos": "Sim",
      "Não sabe": "Não sei",
      "Não": "Não"
    };

    setFieldValue("leadFor", relationshipMap[quizData.relationship]);
    setFieldValue("benefit", benefitMap[quizData.benefit]);
    setFieldValue("paysIr", irMap[quizData.paysIr]);
    setFieldValue("health", quizData.health === "Não" ? "Não" : "Sim");
    setFieldValue("disease", quizData.disease || "");
    setFieldValue("monthlyIr", String(quizData.monthlyIr || ""));
    // a qualificação veio pronta do quiz; o passo que falta é o contato, que
    // agora é o primeiro — por isso não mexemos em currentStep
    trackEvent("lead_form_prefilled", { source: "family_quiz" });
  };

  form.addEventListener("focusin", () => {
    if (formStarted) return;
    formStarted = true;
    trackEvent("lead_form_start", {
      source: params.get("origem") || "acesso_direto"
    });
  });

  nextButton.addEventListener("click", async () => {
    const invalid = invalidField(steps[0]);
    if (invalid) {
      showMessage(
        invalid.type === "checkbox"
          ? "Confirme a autorização para continuar."
          : "Informe nome, WhatsApp e e-mail válidos para continuar.",
        "error"
      );
      invalid.focus();
      return;
    }

    nextButton.disabled = true;
    await capturarContato();
    nextButton.disabled = false;

    trackEvent("lead_form_step_complete", { step: 1 });
    currentStep = 1;
    renderStep();
    document.getElementById("lead-for").focus();
  });

  backButton.addEventListener("click", () => {
    currentStep = 0;
    renderStep();
    document.getElementById("lead-name").focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    // o passo 2 agora é a qualificação; o contato já foi validado e enviado antes
    const invalid = invalidField(steps[1]);

    if (invalid) {
      showMessage("Responda os campos desta etapa para enviar.", "error");
      invalid.focus();
      return;
    }

    const source = origem();
    const endpoint = resolverEndpoint();
    if (!endpoint) {
      const isPreview = ["", "localhost", "127.0.0.1"].includes(window.location.hostname);
      trackEvent("lead_form_integration_missing");
      showMessage(
        isPreview
          ? "Formulário validado. Falta apenas conectar o endereço do CRM para receber o lead."
          : "Não foi possível enviar agora. Entre em contato pelo 0800 042-0676.",
        isPreview ? "success" : "error"
      );
      return;
    }

    submitButton.disabled = true;
    submitButton.firstChild.textContent = "Enviando ";

    const payload = Object.fromEntries(new FormData(form).entries());
    payload.email = String(payload.email || "").trim().toLowerCase();
    payload.source = source;
    // mesmo id vai para o n8n e para o pixel: é o que permite a Meta deduplicar
    payload.eventId = window.recupereibr?.novoEventId?.() || "";
    // atribuição da sessão inteira, não só desta URL: quem chegou pela home
    // e navegou até aqui traria os campos vazios se lêssemos só location.search
    Object.assign(payload, window.recupereibr?.atribuicao?.() || {});
    payload.createdAt = new Date().toISOString();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Falha no envio");
      form.reset();
      trackEvent("generate_lead", {
        source: payload.source,
        persona: "idoso",
        lead_for: payload.leadFor,
        benefit: payload.benefit
      });
      sessionStorage.setItem("recupereibrThankYou", JSON.stringify({
        name: payload.name,
        source: payload.source,
        monthlyIr: payload.monthlyIr || "",
        estimate: payload.estimate || "",
        eventId: payload.eventId
      }));
      window.location.assign(
        isSimulationLead()
          ? "/obrigado-simulacao"
          : "/obrigado-avaliacao"
      );
      return;
    } catch {
      trackEvent("lead_form_error", { source: payload.source });
      showMessage("Não foi possível enviar agora. Tente novamente ou ligue para 0800 042-0676.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.firstChild.textContent = "Solicitar avaliação gratuita ";
    }
  });

  const preventWidow = (element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    }
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      if (!/\s+\S+\s*$/.test(nodes[index].nodeValue)) continue;
      nodes[index].nodeValue = nodes[index].nodeValue.replace(/\s+(\S+)\s*$/, "\u00A0$1");
      break;
    }
  };

  loadPreviousAnswers();
  syncDiseaseField();
  renderStep();
  document.querySelectorAll("h1, h2, h3, p, strong, small, li, legend").forEach(preventWidow);
});
