/* Medição genérica. Respostas, diagnósticos, renda e documentos ficam no RD/CRM.
   Uma visita à página de obrigado, sozinha, não é uma conversão. */
(function () {
  var GA4_ID = "G-7VDNRXZQ5Q";
  var ATTR_KEY = "recupereibrAtribuicao";
  var PENDING_KEY = "recupereibrRdPending";
  var ATTR_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "gclid", "gbraid", "wbraid", "fbclid"];
  var FORM_PATHS = ["/avaliacao", "/avaliacao.html"];
  var THANK_PATHS = ["/obrigado-avaliacao", "/obrigado-avaliacao.html"];
  function read(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || "{}"); } catch (_) { return {}; }
  }
  function write(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
  function cleanUrl(value) {
    try { var url = new URL(value); return url.origin + url.pathname; } catch (_) { return ""; }
  }

  // Retira os valores financeiros usados por links antigos antes de carregar tags.
  var current = new URL(window.location.href);
  var changed = false;
  ["valor_mensal", "estimativa", "email", "phone", "name", "disease", "health", "cpf"].forEach(function (key) {
    if (current.searchParams.has(key)) { current.searchParams.delete(key); changed = true; }
  });
  if (changed) window.history.replaceState(null, "", current.pathname + current.search + current.hash);

  var attribution = read(ATTR_KEY);
  if (["gclid", "gbraid", "wbraid", "fbclid"].some(function (key) { return current.searchParams.has(key); })) attribution = {};
  ATTR_FIELDS.forEach(function (key) {
    var value = current.searchParams.get(key);
    if (value && value.length <= 250) attribution[key] = value;
  });
  write(ATTR_KEY, attribution);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA4_ID, {
    page_location: cleanUrl(window.location.href),
    page_referrer: cleanUrl(document.referrer),
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  var ga = document.createElement("script");
  ga.async = true;
  ga.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
  document.head.appendChild(ga);

  !function(f,b,e,v,n,t,s) {
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', '1069596948024447');
  window.fbq('track', 'PageView');

  window.recupereibr = window.recupereibr || {};
  window.recupereibr.atribuicao = function () { return read(ATTR_KEY); };
  window.recupereibr.novoEventId = function () {
    return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "evt-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  };
  window.recupereibr.rastrear = function (event, ignoredParameters, eventId) {
    var gaEvent = { Lead: "generate_lead", Contact: "contact" }[event];
    if (!gaEvent) return;
    // Allowlist: nenhum parâmetro livre ou classificação de saúde é transmitido.
    window.fbq("track", event, {}, eventId ? { eventID: eventId } : undefined);
    window.gtag("event", gaEvent, eventId ? { transaction_id: eventId } : {});
  };

  // Captura a tentativa válida; o Lead só será registrado após o redirecionamento.
  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (FORM_PATHS.indexOf(window.location.pathname) === -1 || !form.closest || !form.closest("#lead-form")) return;
    if (form.checkValidity && !form.checkValidity()) return;
    write(PENDING_KEY, { id: window.recupereibr.novoEventId(), at: Date.now() });
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    // Mantém a origem do anúncio ao sair da home para o formulário RD.
    document.querySelectorAll('a[href]').forEach(function (link) {
      var target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin || FORM_PATHS.indexOf(target.pathname) === -1) return;
      ATTR_FIELDS.forEach(function (key) {
        if (!target.searchParams.has(key) && attribution[key]) target.searchParams.set(key, attribution[key]);
      });
      link.href = target.toString();
    });

    if (THANK_PATHS.indexOf(window.location.pathname) !== -1) {
      var pending = read(PENDING_KEY);
      var ref;
      try { ref = new URL(document.referrer); } catch (_) {}
      if (pending.id && pending.at <= Date.now() && Date.now() - pending.at < 300000 && ref && ref.origin === window.location.origin && FORM_PATHS.indexOf(ref.pathname) !== -1) {
        // Consome antes de enviar: atualizar ou voltar não duplica a conversão.
        try { sessionStorage.removeItem(PENDING_KEY); } catch (_) { return; }
        window.recupereibr.rastrear("Lead", {}, pending.id);
      }
    }
    var queue = window.dataLayer;
    function observe(record) {
      if (record && (record.event === "whatsapp_click" || record.event === "phone_click")) window.recupereibr.rastrear("Contact");
    }
    queue.forEach(observe);
    var push = queue.push.bind(queue);
    queue.push = function () {
      var result = push.apply(null, arguments);
      Array.prototype.forEach.call(arguments, observe);
      return result;
    };
  });
})();
