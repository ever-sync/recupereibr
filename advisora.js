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
      const params = new URLSearchParams({ origem: "simulador" });
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
