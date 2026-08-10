document.addEventListener("DOMContentLoaded", () => {
  const type = document.body.dataset.thankType;
  const title = document.getElementById("thank-title");
  const estimateBox = document.getElementById("thank-estimate-box");
  const estimateValue = document.getElementById("thank-estimate");
  let data = {};

  try {
    data = JSON.parse(sessionStorage.getItem("recupereibrThankYou") || "{}");
  } catch {
    data = {};
  }

  const firstName = String(data.name || "")
    .trim()
    .split(/\s+/)[0]
    .replace(/[^\p{L}'-]/gu, "");

  // Nas páginas de fora-dos-critérios o nome vem antes da notícia: dirigir-se à
  // pessoa antes de dizer que não há direito soa menos automático.
  const TITULOS = {
    "simulacao": (nome) => `${nome}, recebemos sua simulação.`,
    "avaliacao": (nome) => `${nome}, recebemos sua solicitação.`,
    "sem-beneficio": (nome) => `${nome}, a isenção ainda não se aplica ao seu caso.`,
    "sem-condicao": (nome) => `${nome}, o caso não se encaixa nos critérios.`
  };

  if (firstName) {
    const montar = TITULOS[type] || TITULOS.avaliacao;
    title.textContent = montar(firstName);
  }

  if (type === "simulacao" && estimateBox && estimateValue) {
    const explicitEstimate = Number(String(data.estimate || "").replace(/\D/g, ""));
    const monthlyValue = Number(String(data.monthlyIr || "").replace(/\D/g, ""));
    const estimate = explicitEstimate || monthlyValue * 60;

    if (estimate > 0) {
      estimateValue.textContent = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0
      }).format(estimate);
      estimateBox.hidden = false;
    }
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "thank_you_view",
    page_type: type,
    lead_source: data.source || "desconhecida"
  });

  const preventWidow = (element) => {
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

  document.querySelectorAll("h1, p, strong, a").forEach(preventWidow);
});
