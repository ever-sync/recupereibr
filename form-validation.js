/* Shared by the website and the n8n form guards. No contact is sent before completion. */
(function (root) {
  const text = (value) => typeof value === "string" ? value.trim() : "";
  const consented = (value) => value === true || ["true", "1", "on", "sim"].includes(text(value).toLowerCase());
  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value));
  const normalizePhone = (value) => {
    let digits = text(value).replace(/\D/g, "");
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
    if (!/^[1-9]\d{9,10}$/.test(digits) || /^(\d)\1+$/.test(digits)) return "";
    return "55" + digits;
  };
  const validate = (raw, { documentCount = 0 } = {}) => {
    raw = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const missingFields = [];
    const need = (key, valid) => { if (!valid) missingFields.push(key); };
    const home = raw.source === "autoatendimento_home";
    const quiz = raw.source === "family_quiz" || Object.hasOwn(raw, "respondentName");
    const phoneDigits = normalizePhone(raw.respondentPhone || raw.phoneE164 || raw.phone || raw.telefone);
    need("name", text(raw.respondentName || raw.name).length >= 2);
    need("phone", Boolean(phoneDigits));
    const email = raw.respondentEmail || raw.email;
    need("email", home && !text(email) ? true : validEmail(email));
    need("consent", consented(raw.contactConsent ?? raw.consent));
    need("relationship", [
      "Para mim", "É para mim", "Pai ou mãe", "Avô ou avó", "Cônjuge ou companheiro", "Outro familiar",
      "Para meu pai ou minha mãe", "Para meu cônjuge ou companheiro", "Para outro familiar"
    ].includes(text(raw.relationship || raw.leadFor)));
    need("benefit", [
      "Aposentadoria", "Pensão", "Militar reformado ou reserva", "Militar reformado ou da reserva",
      "Previdência privada", "Ainda não sei", "Não sei informar", "Nenhum desses", "Nenhuma das opções"
    ].includes(text(raw.benefit)));
    need("paysIr", ["Sim", "Não", "Não sei", "Não sabe", "Pagou nos últimos cinco anos"].includes(text(raw.paysIr)));
    need("health", ["Sim", "Não", "Não sei", "Tem atualmente", "Teve ou está controlada", "Não sabe se está na lista"].includes(text(raw.health)));
    if (!home && text(raw.health) && raw.health !== "Não") need("disease", text(raw.disease || raw.condition || raw.doenca).length >= 2);
    if (quiz) need("authorization", ["Sabe e autorizou", "Sabe, mas ainda não autorizou", "Ainda não sabe"].includes(text(raw.authorization)));
    if (home) {
      need("healthConsent", consented(raw.healthConsent));
      need("documents", documentCount > 0);
      need("monthlyIr", Number(String(raw.monthlyIr ?? "").replace(/\D/g, "")) > 0);
    }
    const pending = raw.event === "lead_started" || raw.qualificationStatus === "LEAD_STARTED" || raw.classification === "LEAD_STARTED";
    return { valid: !pending && missingFields.length === 0, pending, missingFields, phoneDigits };
  };
  const fieldLabels = {
    name: "nome", phone: "WhatsApp válido com DDD", email: "e-mail válido", consent: "autorização para contato",
    relationship: "para quem é a avaliação", benefit: "benefício", paysIr: "desconto de IR", health: "condição de saúde",
    disease: "doença ou condição", authorization: "autorização do familiar", healthConsent: "autorização dos documentos",
    documents: "documentos", monthlyIr: "desconto mensal"
  };
  const validationMessage = (fields) => "Confira os campos: " + fields.map((field) => fieldLabels[field] || field).join(", ") + ".";
  const confirmSaved = async (response) => {
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true || result?.synchronized !== true) {
      throw new Error(result?.missingFields?.length ? validationMessage(result.missingFields) : "Não foi possível confirmar o envio. Seus dados continuam no formulário; tente novamente.");
    }
    return result;
  };
  const api = { normalizePhone, validEmail, validate, validationMessage, confirmSaved };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.recupereibrForms = api;
})(globalThis);
