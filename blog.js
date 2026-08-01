document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-post-updated]").forEach((node) => {
    const value = node.getAttribute("datetime");
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    node.textContent = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date);
  });
});
