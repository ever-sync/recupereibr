const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const forms = require("../form-validation.js");

const complete = {
  name: "Teste formulário", phone: "(11) 91234-5678", email: "formulario@example.invalid",
  consent: true, source: "landing_avaliacao", event: "capture_completed",
  leadFor: "Para mim", benefit: "Aposentadoria", paysIr: "Sim", health: "Sim", disease: "Não sei informar"
};

test("complete answers pass; each missing required answer blocks the CRM", () => {
  assert.equal(forms.validate(complete).valid, true);
  for (const field of ["name", "phone", "email", "consent", "leadFor", "benefit", "paysIr", "health", "disease"]) {
    const input = { ...complete, [field]: "   " };
    assert.equal(forms.validate(input).valid, false, field);
  }
  for (const input of [null, [], {}, "text"]) assert.equal(forms.validate(input).valid, false);
});

test("legacy initial captures never qualify for synchronization", () => {
  assert.equal(forms.validate({ ...complete, event: "lead_started" }).pending, true);
  assert.equal(forms.validate({ ...complete, event: "lead_started" }).valid, false);
  assert.equal(forms.validate({ ...complete, qualificationStatus: "LEAD_STARTED" }).valid, false);
});

test("negative and unknown answers are preserved, without inventing a disease", () => {
  assert.equal(forms.validate({ ...complete, health: "Não", disease: "" }).valid, true);
  assert.equal(forms.validate({ ...complete, benefit: "Não sei informar", paysIr: "Não sei" }).valid, true);
  assert.equal(forms.validate({ ...complete, health: "Não sei", disease: "" }).valid, false);
  assert.equal(forms.validate({ ...complete, benefit: "random" }).valid, false);
});

test("phone normalization preserves DDD 55 and rejects invalid lengths and leading zero", () => {
  assert.equal(forms.normalizePhone("(55) 91234-5678"), "5555912345678");
  assert.equal(forms.normalizePhone("+55 (11) 91234-5678"), "5511912345678");
  assert.equal(forms.normalizePhone("(11) 3123-4567"), "551131234567");
  for (const phone of ["011912345678", "1191234", "11111111111", "+54 11 91234-5678", ""]) {
    assert.equal(forms.normalizePhone(phone), "", phone);
  }
});

test("quiz requires answers and authorization; normalized n8n payload also passes", () => {
  const quiz = { ...complete, source: "family_quiz", respondentName: complete.name,
    respondentPhone: complete.phone, respondentEmail: complete.email,
    contactConsent: true, relationship: "Pai ou mãe", event: "simulation_completed" };
  assert.equal(forms.validate(quiz).valid, false);
  quiz.authorization = "Ainda não sabe";
  assert.equal(forms.validate(quiz).valid, true);
  const normalized = { ...quiz, phoneE164: "+5511912345678", respondentName: undefined, respondentPhone: undefined };
  assert.equal(forms.validate(normalized).valid, true);
});

test("home accepts its document-based form and requires actual attachments plus consent", () => {
  const home = { ...complete, source: "autoatendimento_home", email: "", disease: "", health: "Não sei",
    monthlyIr: "380", healthConsent: true };
  assert.equal(forms.validate(home, { documentCount: 1 }).valid, true);
  assert.equal(forms.validate(home).valid, false);
  assert.equal(forms.validate({ ...home, healthConsent: false }, { documentCount: 1 }).valid, false);
});

test("HTTP acceptance alone cannot show success; only confirmed persistence can", async () => {
  const response = (body, ok = true) => ({ ok, json: async () => body });
  await assert.rejects(forms.confirmSaved(response({ message: "Workflow was started" })));
  await assert.rejects(forms.confirmSaved(response({ ok: true, synchronized: false })));
  await assert.rejects(forms.confirmSaved(response({ ok: false, missingFields: ["email"] }, false)), /e-mail válido/);
  await assert.rejects(forms.confirmSaved({ ok: true, json: async () => { throw Error("bad JSON"); } }));
  assert.equal((await forms.confirmSaved(response({ ok: true, synchronized: true }))).ok, true);
});

test("the same validator executes without Node globals in the n8n/browser sandbox", () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve("../form-validation.js"), "utf8"), context);
  assert.equal(context.recupereibrForms.validate(complete).valid, true);
  assert.equal(context.recupereibrForms.validate({}).valid, false);
});
