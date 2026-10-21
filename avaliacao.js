document.addEventListener("DOMContentLoaded", () => {
  const formId = "ir-google-site-ragali-6b2adf3e5ed8cd327742";
  const embed = document.getElementById(formId);
  const shell = document.getElementById("lead-form");
  const status = document.getElementById("rd-form-status");
  const fallback = document.getElementById("rd-form-fallback");
  if (!embed || !shell || !status || !fallback) return;

  const showLoadError = () => {
    shell.setAttribute("aria-busy", "false");
    status.textContent = "O formulário não carregou.";
    fallback.hidden = false;
  };

  const loadTimeout = window.setTimeout(showLoadError, 15000);
  const observer = new MutationObserver(() => {
    if (!embed.querySelector("form")) return;
    window.clearTimeout(loadTimeout);
    shell.setAttribute("aria-busy", "false");
    status.hidden = true;
    fallback.hidden = true;
    observer.disconnect();
  });
  observer.observe(embed, { childList: true, subtree: true });

  document.getElementById("rd-form-reload")?.addEventListener("click", () => {
    window.location.reload();
  });

  try {
    new RDStationForms(formId, "null").createForm();
  } catch {
    window.clearTimeout(loadTimeout);
    observer.disconnect();
    showLoadError();
  }

  // Keep the existing typography outside the form managed by RD Station.
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
  document.querySelectorAll("h1, h2, h3, p, strong, small, li").forEach((element) => {
    if (!shell.contains(element)) preventWidow(element);
  });
});
