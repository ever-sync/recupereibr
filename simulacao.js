document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("family-quiz");
  const steps = Array.from(document.querySelectorAll(".quiz-step"));
  const backButton = document.getElementById("quiz-back");
  const nextButton = document.getElementById("quiz-next");
  const currentStepLabel = document.getElementById("current-step");
  const totalStepsLabel = document.getElementById("total-steps");
  const progressBar = document.getElementById("progress-bar");
  const status = document.getElementById("quiz-status");
  const result = document.getElementById("quiz-result");
  const resultTitle = document.getElementById("result-title");
  const resultCopy = document.getElementById("result-copy");
  const resultEstimate = document.getElementById("result-estimate");
  const resultSpecialist = document.getElementById("result-specialist");
  const resultActionStatus = document.getElementById("result-action-status");
  const restartButton = document.getElementById("restart-quiz");
  const amountInput = document.getElementById("family-ir-value");
  const amountRange = document.getElementById("family-ir-range");
  const amountEstimate = document.getElementById("family-estimate");
  const diseaseField = document.getElementById("disease-field");
  const diseaseSelect = document.getElementById("family-disease");
  const respondentPhone = document.getElementById("respondent-phone");
  const params = new URLSearchParams(window.location.search);
  const createLeadId = () => (
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  let currentStep = 0;
  let leadCaptured = false;
  let currentResultType = "needs_review";
  const leadId = createLeadId();

  const trackEvent = (eventName, parameters = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...parameters });
  };

  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  });

  const numericValue = (value) => {
    const digits = String(value).replace(/\D/g, "");
    return Math.min(3000, Math.max(0, Number(digits) || 0));
  };

  const selectedValue = (name) => {
    const field = form.elements[name];
    if (!field) return "";
    if (typeof field.value === "string" && !field.length) return field.value;
    return Array.from(field).find((item) => item.checked)?.value || "";
  };

  const formatPhone = (value) => {
    const digits = String(value).replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  respondentPhone.addEventListener("input", () => {
    respondentPhone.value = formatPhone(respondentPhone.value);
  });

  const protectWidow = (element) => {
    if (!element) return;
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

  const showStatus = (message) => {
    status.textContent = message;
    status.classList.toggle("visible", Boolean(message));
  };

  const showResultStatus = (message) => {
    resultActionStatus.textContent = message;
    resultActionStatus.classList.toggle("visible", Boolean(message));
  };

  const updateAmount = (rawValue, source) => {
    const monthly = numericValue(rawValue);
    if (source !== "input") amountInput.value = String(monthly);
    if (source !== "range") amountRange.value = String(monthly);
    amountEstimate.textContent = currency.format(monthly * 60);
  };

  amountInput.addEventListener("input", (event) => updateAmount(event.target.value, "input"));
  amountInput.addEventListener("blur", () => {
    amountInput.value = String(numericValue(amountInput.value));
    updateAmount(amountInput.value);
  });
  amountRange.addEventListener("input", (event) => {
    updateAmount(event.target.value, "range");
    amountInput.value = event.target.value;
  });

  const syncDiseaseField = () => {
    const health = selectedValue("health");
    const needsDisease = Boolean(health) && health !== "Não";
    diseaseField.hidden = !needsDisease;
    diseaseSelect.required = needsDisease;
    if (!needsDisease) diseaseSelect.value = "";
  };
  form.querySelectorAll('input[name="health"]').forEach((input) => input.addEventListener("change", syncDiseaseField));

  const validateCurrentStep = () => {
    const step = steps[currentStep];
    const required = Array.from(step.querySelectorAll("[required]"));
    const invalid = required.find((field) => {
      if (field.type === "radio") {
        return !step.querySelector(`input[name="${field.name}"]:checked`);
      }
      if (field.type === "checkbox") return !field.checked;
      if (field.type === "tel") return field.value.replace(/\D/g, "").length < 10;
      if (field.type === "email") return !field.validity.valid;
      return !field.value.trim();
    });

    if (!invalid) {
      showStatus("");
      return true;
    }

    showStatus(
      invalid.type === "checkbox"
        ? "Confirme a autorização para liberar a simulação."
        : currentStep === 0
          ? "Informe seu primeiro nome, um WhatsApp válido e um e-mail válido."
          : "Escolha uma opção para continuar."
    );
    invalid.focus();
    return false;
  };

  const basePayload = () => ({
    leadId,
    source: "family_quiz",
    respondentName: String(form.elements.respondentName?.value || "").trim(),
    respondentPhone: String(form.elements.respondentPhone?.value || "").trim(),
    respondentEmail: String(form.elements.respondentEmail?.value || "").trim().toLowerCase(),
    contactConsent: Boolean(form.elements.contactConsent?.checked),
    utmSource: params.get("utm_source") || "",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
    gclid: params.get("gclid") || "",
    pageUrl: window.location.href,
    createdAt: new Date().toISOString()
  });

  const completePayload = () => {
    const monthly = numericValue(amountInput.value);
    return {
      ...basePayload(),
      event: "simulation_completed",
      relationship: selectedValue("relationship"),
      authorization: selectedValue("authorization"),
      benefit: selectedValue("benefit"),
      paysIr: selectedValue("paysIr"),
      health: selectedValue("health"),
      disease: diseaseSelect.value,
      monthlyIr: monthly,
      estimate: monthly * 60,
      resultType: currentResultType,
      completedAt: new Date().toISOString()
    };
  };

  const sendToN8n = async (payload) => {
    const endpoint = String(
      window.RECUPEREIBR_SIMULATION_ENDPOINT || form.dataset.endpoint || ""
    ).trim();
    if (!endpoint) throw new Error("Webhook não configurado");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Falha no envio");
  };

  const captureLead = async () => {
    if (leadCaptured) return true;
    nextButton.disabled = true;
    nextButton.firstChild.textContent = "Salvando ";
    showStatus("");

    try {
      await sendToN8n({
        ...basePayload(),
        event: "lead_started"
      });
      leadCaptured = true;
      trackEvent("generate_lead", {
        source: "family_quiz",
        stage: "lead_started"
      });
      return true;
    } catch {
      showStatus("Não foi possível liberar a simulação agora. Confira sua conexão e tente novamente.");
      return false;
    } finally {
      nextButton.disabled = false;
      nextButton.firstChild.textContent = "Continuar ";
    }
  };

  const renderStep = () => {
    steps.forEach((step, index) => {
      step.classList.toggle("active", index === currentStep);
      step.hidden = index !== currentStep;
    });

    currentStepLabel.textContent = String(currentStep + 1);
    totalStepsLabel.textContent = String(steps.length);
    progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    backButton.disabled = currentStep === 0;
    nextButton.firstChild.textContent = currentStep === steps.length - 1 ? "Ver resultado " : "Continuar ";
    showStatus("");
  };

  const buildResult = () => {
    const benefit = selectedValue("benefit");
    const paysIr = selectedValue("paysIr");
    const health = selectedValue("health");
    const monthly = numericValue(amountInput.value);
    const estimate = monthly * 60;
    const benefitEligible = !["Nenhum desses", "Ainda não sei"].includes(benefit);
    const strongMatch = benefitEligible && paysIr !== "Não" && health !== "Não";
    currentResultType = strongMatch ? "strong_match" : "needs_review";

    if (strongMatch) {
      resultTitle.textContent = "Vale conversar com um especialista.";
      resultCopy.textContent = "A simulação indica pontos que merecem uma análise individual.";
    } else {
      resultTitle.textContent = "Um especialista pode esclarecer seu caso.";
      resultCopy.textContent = "Algumas respostas ainda precisam ser confirmadas.";
    }

    resultEstimate.textContent = currency.format(estimate);
    trackEvent("family_quiz_complete", {
      result_type: currentResultType,
      relationship: selectedValue("relationship")
    });

    steps.forEach((step) => {
      step.hidden = true;
      step.classList.remove("active");
    });
    document.querySelector(".quiz-top").hidden = true;
    document.querySelector(".progress-track").hidden = true;
    document.querySelector(".quiz-navigation").hidden = true;
    result.hidden = false;
    showResultStatus("");
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  syncDiseaseField();

  nextButton.addEventListener("click", async () => {
    if (!validateCurrentStep()) return;
    if (currentStep === 0 && !(await captureLead())) return;

    trackEvent("family_quiz_step_complete", { step: currentStep + 1 });
    if (currentStep === steps.length - 1) {
      buildResult();
      return;
    }
    currentStep += 1;
    renderStep();
  });

  backButton.addEventListener("click", () => {
    if (currentStep === 0) return;
    currentStep -= 1;
    renderStep();
  });

  resultSpecialist.addEventListener("click", async () => {
    resultSpecialist.disabled = true;
    resultSpecialist.firstChild.textContent = "Enviando ";
    showResultStatus("");
    const payload = completePayload();
    // mesmo id vai para o n8n e para o pixel: é o que permite a Meta deduplicar
    payload.eventId = window.recupereibr?.novoEventId?.() || "";

    try {
      await sendToN8n(payload);
      trackEvent("simulation_contact_requested", {
        source: "family_quiz",
        result_type: currentResultType
      });
      sessionStorage.setItem("recupereibrThankYou", JSON.stringify({
        name: payload.respondentName,
        source: "quiz",
        monthlyIr: String(payload.monthlyIr),
        estimate: String(payload.estimate),
        eventId: payload.eventId || ""
      }));
      window.location.assign("obrigado-simulacao.html");
    } catch {
      showResultStatus("Seus dados iniciais foram salvos, mas não conseguimos enviar o resultado. Tente novamente.");
    } finally {
      resultSpecialist.disabled = false;
      resultSpecialist.firstChild.textContent = "Quero falar com um especialista ";
    }
  });

  restartButton.addEventListener("click", () => {
    form.reset();
    amountInput.value = "380";
    amountRange.value = "380";
    updateAmount(380);
    currentStep = 0;
    result.hidden = true;
    document.querySelector(".quiz-top").hidden = false;
    document.querySelector(".progress-track").hidden = false;
    document.querySelector(".quiz-navigation").hidden = false;
    renderStep();
    document.getElementById("quiz").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  form.addEventListener("submit", (event) => event.preventDefault());
  document.querySelectorAll("h1, h2, legend, p, strong, small, li").forEach(protectWidow);
  renderStep();
});
