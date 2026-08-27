document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const menuButton = document.querySelector(".menu-button");
  const mainNav = document.getElementById("main-nav");
  const trackEvent = (eventName, parameters = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...parameters });
  };

  document.querySelectorAll("[data-track]").forEach((link) => {
    link.addEventListener("click", () => {
      trackEvent("cta_click", {
        cta_name: link.dataset.track,
        destination: link.getAttribute("href") || ""
      });
    });
  });

  document.querySelectorAll('a[href^="/avaliacao"]:not([data-track])').forEach((link) => {
    link.addEventListener("click", () => {
      trackEvent("cta_click", {
        cta_name: "avaliacao",
        cta_text: link.textContent.trim(),
        destination: link.getAttribute("href") || ""
      });
    });
  });

  document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
    link.addEventListener("click", () => trackEvent("phone_click"));
  });

  document.querySelectorAll('a[href*="wa.me"]').forEach((link) => {
    link.addEventListener("click", () => trackEvent("whatsapp_click"));
  });

  const preventWidow = (element) => {
    if (!element || element.dataset.widowProtected === "true") return;

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => node.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
      }
    );

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    for (let index = textNodes.length - 1; index >= 0; index -= 1) {
      const node = textNodes[index];
      if (!/\s+\S+\s*$/.test(node.nodeValue)) continue;
      node.nodeValue = node.nodeValue.replace(/\s+(\S+)\s*$/, "\u00A0$1");
      element.dataset.widowProtected = "true";
      break;
    }
  };

  if (menuButton && mainNav) {
    const setMenu = (open) => {
      body.classList.toggle("menu-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    };

    menuButton.addEventListener("click", () => {
      setMenu(!body.classList.contains("menu-open"));
    });

    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.focus();
      }
    });
  }

  // ---- Autoatendimento: cada passo só libera o seguinte quando fica completo ----
  const selfservice = document.getElementById("selfservice-form");

  if (selfservice) {
    const cards = Array.from(selfservice.querySelectorAll("[data-step]"));
    const submitButton = selfservice.querySelector(".selfservice-submit");
    const ctaText = document.getElementById("selfservice-cta-text");
    const estimate = document.getElementById("selfservice-estimate");
    const filesHint = document.getElementById("selfservice-files");
    const message = document.getElementById("selfservice-message");
    const phone = selfservice.querySelector('[name="phone"]');
    const monthlyIr = selfservice.querySelector('[name="monthlyIr"]');
    const documents = selfservice.querySelector('[name="documents"]');
    const currency = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    });
    const MAX_FILE_BYTES = 10 * 1024 * 1024;
    const MAX_TOTAL_FILE_BYTES = 15 * 1024 * 1024;
    const MAX_FILES = 5;

    const onlyDigits = (value) => String(value).replace(/\D/g, "");

    const formatPhone = (value) => {
      const digits = onlyDigits(value).slice(0, 11);
      if (digits.length <= 2) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    const stepComplete = (step) => {
      if (step === 1) {
        const name = selfservice.querySelector('[name="name"]').value.trim();
        const benefit = selfservice.querySelector('[name="benefit"]').value;
        return name.length >= 3 && onlyDigits(phone.value).length >= 10 && Boolean(benefit);
      }
      if (step === 2) return Number(onlyDigits(monthlyIr.value)) > 0;
      if (step === 3) {
        const consent = selfservice.querySelector('[name="healthConsent"]').checked;
        const files = Array.from(documents.files);
        const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
        const filesAreValid =
          files.length > 0 &&
          files.length <= MAX_FILES &&
          totalBytes <= MAX_TOTAL_FILE_BYTES &&
          files.every((file) => file.size <= MAX_FILE_BYTES);
        return filesAreValid && consent;
      }
      return false;
    };

    const refresh = () => {
      let unlocked = true;

      cards.forEach((card) => {
        const step = Number(card.dataset.step);
        if (step === 1) {
          card.dataset.done = String(stepComplete(1));
          return;
        }
        // um passo só abre se todos os anteriores estiverem completos
        unlocked = unlocked && stepComplete(step - 1);
        card.dataset.locked = String(!unlocked);
        if (step < 4) card.dataset.done = String(unlocked && stepComplete(step));
      });

      const ready = stepComplete(1) && stepComplete(2) && stepComplete(3);
      if (submitButton) submitButton.disabled = !ready;
      if (ctaText) {
        ctaText.textContent = ready
          ? "Um especialista analisa e retorna com o resultado, sem custo."
          : "Complete os três passos ao lado para liberar o envio.";
      }
    };

    phone?.addEventListener("input", () => {
      phone.value = formatPhone(phone.value);
    });

    monthlyIr?.addEventListener("input", () => {
      monthlyIr.value = onlyDigits(monthlyIr.value).slice(0, 6);
      const fiveYears = Number(monthlyIr.value || 0) * 60;
      if (estimate) {
        estimate.innerHTML = `Em cinco anos, isso representa cerca de <strong>${currency.format(fiveYears)}</strong>.`;
      }
    });

    documents?.addEventListener("change", () => {
      const files = Array.from(documents.files);
      const tooBig = files.filter((file) => file.size > MAX_FILE_BYTES);
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

      if (tooBig.length) {
        documents.value = "";
        if (filesHint) filesHint.textContent = `${tooBig[0].name} passa de 10 MB. Escolha um arquivo menor.`;
      } else if (files.length > MAX_FILES) {
        documents.value = "";
        if (filesHint) filesHint.textContent = `Envie no máximo ${MAX_FILES} arquivos por atendimento.`;
      } else if (totalBytes > MAX_TOTAL_FILE_BYTES) {
        documents.value = "";
        if (filesHint) filesHint.textContent = "Os arquivos juntos passam de 15 MB. Reduza ou compacte os documentos.";
      } else if (files.length) {
        if (filesHint) {
          filesHint.textContent = files.length === 1
            ? `1 arquivo anexado: ${files[0].name}`
            : `${files.length} arquivos anexados`;
        }
      } else if (filesHint) {
        filesHint.textContent = "PDF, JPG, PNG ou HEIC · até 5 arquivos e 15 MB no total";
      }

      refresh();
    });

    selfservice.addEventListener("input", refresh);
    selfservice.addEventListener("change", refresh);
    refresh();

    selfservice.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!(stepComplete(1) && stepComplete(2) && stepComplete(3))) return;

      const endpoint = String(
        window.RECUPEREIBR_SELFSERVICE_ENDPOINT || selfservice.dataset.endpoint || ""
      ).trim();

      const showMessage = (text, type) => {
        if (!message) return;
        message.textContent = text;
        message.className = `form-message ${type}`;
      };

      if (!endpoint) {
        const isPreview = ["", "localhost", "127.0.0.1"].includes(window.location.hostname);
        trackEvent("selfservice_integration_missing");
        showMessage(
          isPreview
            ? "Formulário validado. Falta conectar o endereço que vai receber os dados."
            : "Não foi possível enviar agora. Fale com a gente pelo 0800 042-0676.",
          isPreview ? "success" : "error"
        );
        return;
      }

      submitButton.disabled = true;
      showMessage("Enviando…", "");

      // multipart, e não JSON: o passo 3 carrega anexos
      const payload = new FormData(selfservice);
      const eventId = window.recupereibr?.novoEventId?.() || "";
      payload.append("source", "autoatendimento_home");
      payload.append("event", "capture_completed");
      payload.append("leadId", eventId);
      payload.append("eventId", eventId);
      payload.append("leadFor", "Para mim");
      payload.append("paysIr", "Sim");
      payload.append("health", "Não sei");
      payload.append("consent", "true");
      payload.append("contactConsent", "true");
      payload.append("estimate", String(Number(onlyDigits(monthlyIr.value)) * 60));
      payload.append("pageUrl", window.location.href);
      payload.append("createdAt", new Date().toISOString());

      // mesma atribuição dos outros formulários, para o lead do autoatendimento
      // também poder voltar como conversão offline
      const atribuicao = window.recupereibr?.atribuicao?.() || {};
      Object.keys(atribuicao).forEach((chave) => payload.append(chave, atribuicao[chave]));

      try {
        const response = await fetch(endpoint, { method: "POST", body: payload });
        if (!response.ok) throw new Error("Falha no envio");
        trackEvent("generate_lead", { source: "autoatendimento_home", eventId });
        showMessage("Recebemos seus dados. Um especialista entra em contato pelo WhatsApp.", "success");
        selfservice.reset();
        refresh();
      } catch (error) {
        submitButton.disabled = false;
        showMessage("Não foi possível enviar agora. Tente novamente ou ligue 0800 042-0676.", "error");
      }
    });
  }

  const videoTrack = document.getElementById("video-track");
  const videoPrev = document.getElementById("video-prev");
  const videoNext = document.getElementById("video-next");
  let videoIndex = 0;

  const visibleVideos = () => {
    if (window.innerWidth <= 560) return 1;
    if (window.innerWidth <= 820) return 2;
    return 3;
  };

  const maxVideoIndex = () => Math.max(0, videoTrack.children.length - visibleVideos());

  const updateVideos = () => {
    if (!videoTrack) return;
    const maxIndex = maxVideoIndex();
    videoIndex = Math.min(Math.max(videoIndex, 0), maxIndex);

    // com poucos vídeos todos cabem na tela; as setas ficam inertes e são desativadas
    if (videoPrev) videoPrev.disabled = maxIndex === 0;
    if (videoNext) videoNext.disabled = maxIndex === 0;

    const card = videoTrack.querySelector(".video-card");
    if (!card) return;
    const gap = 22;
    videoTrack.style.transform = `translateX(-${videoIndex * (card.getBoundingClientRect().width + gap)}px)`;
  };

  updateVideos();

  videoPrev?.addEventListener("click", () => {
    videoIndex -= 1;
    updateVideos();
  });

  videoNext?.addEventListener("click", () => {
    videoIndex = videoIndex >= maxVideoIndex() ? 0 : videoIndex + 1;
    updateVideos();
  });

  // miniatura montada a partir do id, e o player só é criado no clique:
  // nada do YouTube (script, cookie, requisição) entra na página antes de o visitante querer assistir
  document.querySelectorAll(".video-thumb").forEach((thumb) => {
    const videoId = thumb.dataset.youtubeId;
    if (!videoId) return;

    thumb.style.backgroundImage = `url("https://i.ytimg.com/vi/${videoId}/hqdefault.jpg")`;

    thumb.addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.className = "video-frame";
      frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
      frame.title = thumb.dataset.videoTitle || "Vídeo";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      thumb.replaceWith(frame);
    });
  });

  // o botão "Ler completo" só aparece nos depoimentos que realmente foram cortados
  document.querySelectorAll(".testimonial-card").forEach((card) => {
    const text = card.querySelector(".testimonial-text");
    const button = card.querySelector(".testimonial-more");
    if (!text || !button) return;

    const checkOverflow = () => {
      if (card.classList.contains("is-expanded")) return;
      button.hidden = text.scrollHeight <= text.clientHeight + 1;
    };

    button.addEventListener("click", () => {
      const expanded = card.classList.toggle("is-expanded");
      button.textContent = expanded ? "Mostrar menos" : "Ler completo";
    });

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
  });

  const track = document.getElementById("testimonial-track");
  const previous = document.getElementById("testimonial-prev");
  const next = document.getElementById("testimonial-next");
  let testimonialIndex = 0;

  const visibleTestimonials = () => {
    if (window.innerWidth <= 560) return 1;
    if (window.innerWidth <= 820) return 2;
    return 3;
  };

  const updateTestimonials = () => {
    if (!track) return;
    const maxIndex = Math.max(0, track.children.length - visibleTestimonials());
    testimonialIndex = Math.min(Math.max(testimonialIndex, 0), maxIndex);
    const card = track.querySelector(".testimonial-card");
    if (!card) return;
    const gap = 18;
    track.style.transform = `translateX(-${testimonialIndex * (card.getBoundingClientRect().width + gap)}px)`;
  };

  previous?.addEventListener("click", () => {
    testimonialIndex -= 1;
    updateTestimonials();
  });

  next?.addEventListener("click", () => {
    const maxIndex = Math.max(0, track.children.length - visibleTestimonials());
    testimonialIndex = testimonialIndex >= maxIndex ? 0 : testimonialIndex + 1;
    updateTestimonials();
  });

  window.addEventListener("resize", () => {
    updateTestimonials();
    updateVideos();
  });

  const simulatorInput = document.getElementById("simulator-input");
  const simulatorRange = document.getElementById("simulator-range");
  const estimateOneYear = document.getElementById("estimate-one-year");
  const estimateFiveYears = document.getElementById("estimate-five-years");
  const heroEstimate = document.getElementById("hero-estimate");
  const simulatorWhatsapp = document.getElementById("simulator-whatsapp");
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  });

  const numericValue = (value) => {
    const digits = String(value).replace(/\D/g, "");
    return Math.min(3000, Math.max(0, Number(digits) || 0));
  };

  const updateSimulator = (rawValue, source) => {
    const monthly = numericValue(rawValue);
    const oneYear = monthly * 12;
    const fiveYears = monthly * 60;

    if (simulatorInput && source !== "input") simulatorInput.value = String(monthly);
    if (simulatorRange && source !== "range") simulatorRange.value = String(Math.max(50, monthly));
    if (estimateOneYear) estimateOneYear.textContent = currency.format(oneYear);
    if (estimateFiveYears) estimateFiveYears.textContent = currency.format(fiveYears);
    if (heroEstimate) heroEstimate.textContent = currency.format(fiveYears);

    if (simulatorWhatsapp) {
      const params = new URLSearchParams({
        origem: "simulador",
        valor_mensal: String(monthly),
        estimativa: String(fiveYears)
      });
      simulatorWhatsapp.href = `avaliacao.html?${params.toString()}`;
    }
  };

  simulatorInput?.addEventListener("input", (event) => {
    updateSimulator(event.target.value, "input");
  });

  simulatorInput?.addEventListener("blur", (event) => {
    const value = numericValue(event.target.value);
    event.target.value = String(value);
    updateSimulator(value);
  });

  simulatorRange?.addEventListener("input", (event) => {
    updateSimulator(event.target.value, "range");
    if (simulatorInput) simulatorInput.value = event.target.value;
  });

  // balões das condições: desloca na horizontal para não vazar da viewport nas pílulas das pontas
  const alignConditionTip = (item) => {
    const tip = item.querySelector(".condition-tip");
    if (!tip) return;

    tip.style.setProperty("--tip-shift", "0px");
    const rect = tip.getBoundingClientRect();
    const margin = 16;
    let shift = 0;

    if (rect.left < margin) shift = margin - rect.left;
    else if (rect.right > window.innerWidth - margin) shift = window.innerWidth - margin - rect.right;

    tip.style.setProperty("--tip-shift", `${Math.round(shift)}px`);
  };

  document.querySelectorAll(".condition-pills li").forEach((item) => {
    item.addEventListener("pointerenter", () => alignConditionTip(item));
    item.addEventListener("focusin", () => alignConditionTip(item));
  });

  document.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, li, summary, .button, .text-link, .float-card strong, .float-card small, .footer-meta span"
  ).forEach(preventWidow);

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    reveals.forEach((element) => observer.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add("visible"));
  }

  // ---- Efeitos de entrada e de rolagem ----
  const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const animados = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");

  if (animados.length && "IntersectionObserver" in window && !semMovimento) {
    // numera os filhos para o CSS escalonar o atraso de cada um
    document.querySelectorAll("[data-reveal-stagger]").forEach((grupo) => {
      Array.from(grupo.children).forEach((filho, indice) => {
        filho.style.setProperty("--reveal-index", String(indice));
      });
    });

    const entradaObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        entradaObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    animados.forEach((element) => entradaObserver.observe(element));
  } else {
    animados.forEach((element) => element.classList.add("is-visible"));
  }

  // parallax: um único rAF para todos os elementos, em vez de um listener por elemento
  const camadas = Array.from(document.querySelectorAll("[data-parallax]"));

  if (camadas.length && !semMovimento) {
    let agendado = false;

    const posicionar = () => {
      agendado = false;
      const alturaJanela = window.innerHeight;

      camadas.forEach((camada) => {
        const caixa = camada.getBoundingClientRect();
        if (caixa.bottom < 0 || caixa.top > alturaJanela) return;

        // -1 quando o elemento está saindo por cima, 1 quando ainda vem de baixo
        const progresso = (caixa.top + caixa.height / 2 - alturaJanela / 2) / (alturaJanela / 2);
        const intensidade = Number(camada.dataset.parallax) || 18;
        camada.style.transform = `translate3d(0, ${(progresso * intensidade).toFixed(1)}px, 0)`;
      });
    };

    const aoRolar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(posicionar);
    };

    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    posicionar();
  }

  // contagem crescente do valor estimado na hero
  const contador = document.getElementById("hero-estimate");

  if (contador && "IntersectionObserver" in window && !semMovimento) {
    const alvo = Number(contador.textContent.replace(/\D/g, ""));
    const moeda = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    });

    if (alvo > 0) {
      const contarObserver = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        contarObserver.disconnect();

        const duracao = 1100;
        const inicio = performance.now();

        const passo = (agora) => {
          const t = Math.min((agora - inicio) / duracao, 1);
          // desacelera no fim: o número "assenta" em vez de parar seco
          const suave = 1 - Math.pow(1 - t, 3);
          contador.textContent = moeda.format(Math.round(alvo * suave));
          if (t < 1) requestAnimationFrame(passo);
        };

        requestAnimationFrame(passo);
      }, { threshold: 0.4 });

      contarObserver.observe(contador);
    }
  }

  document.querySelector(".newsletter-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    if (button) {
      button.textContent = "✓";
      button.setAttribute("aria-label", "Inscrição registrada");
    }
  });
});
