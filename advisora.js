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

  document.querySelectorAll('a[href^="avaliacao.html"]:not([data-track])').forEach((link) => {
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

  const services = [
    {
      id: "avaliacao",
      number: "01",
      title: "Primeiro, entendemos o seu caso",
      text: "Verificamos o benefício que você recebe, o desconto de Imposto de Renda e a condição de saúde relatada. A avaliação inicial é gratuita e sem compromisso.",
      image: "assets/advisor.jpg"
    },
    {
      id: "documentos",
      number: "02",
      title: "Você recebe orientação para reunir os documentos",
      text: "Explicamos o que será necessário e ajudamos a conferir as informações para evitar dúvidas, erros e retrabalho.",
      image: "assets/meeting.jpg"
    },
    {
      id: "solicitacao",
      number: "03",
      title: "Cuidamos do pedido e acompanhamos o andamento",
      text: "Preparamos a solicitação para o órgão responsável e mantemos você informado durante o processo.",
      image: "assets/team.jpg"
    },
    {
      id: "recuperacao",
      number: "04",
      title: "Com a aprovação, buscamos o benefício completo",
      text: "Além de interromper o desconto do Imposto de Renda, avaliamos os valores pagos indevidamente que podem ser recuperados, respeitando o limite legal.",
      image: "assets/advisor.jpg"
    }
  ];

  const tabs = Array.from(document.querySelectorAll(".service-tab"));
  const servicePanel = document.getElementById("service-panel");
  const serviceImage = document.getElementById("service-image");
  let serviceIndex = 0;

  const renderService = (index) => {
    serviceIndex = (index + services.length) % services.length;
    const service = services[serviceIndex];

    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === serviceIndex;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    if (servicePanel) {
      servicePanel.querySelector(".panel-number").textContent = service.number;
      servicePanel.querySelector("h3").textContent = service.title;
      servicePanel.querySelector("p").textContent = service.text;
      servicePanel.querySelectorAll("h3, p").forEach((element) => {
        delete element.dataset.widowProtected;
        preventWidow(element);
      });
    }

    if (serviceImage) {
      serviceImage.style.backgroundImage = `url("${service.image}")`;
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => renderService(index));
  });

  document.querySelectorAll("[data-service-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      renderService(serviceIndex + Number(button.dataset.serviceDirection));
    });
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

  window.addEventListener("resize", updateTestimonials);

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

  document.querySelector(".newsletter-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    if (button) {
      button.textContent = "✓";
      button.setAttribute("aria-label", "Inscrição registrada");
    }
  });
});
