/* =========================================================
   Pixel da Meta — conjunto de dados 1069596948024447

   Arquivo único em vez do trecho repetido em 11 páginas: trocar o ID
   ou acrescentar um evento passa a ser uma edição só.

   Deduplicação: cada lead recebe um eventId gerado aqui, gravado em
   sessionStorage e enviado no payload do n8n. Se o fluxo do n8n repassar
   esse mesmo valor como `event_id` na API de Conversões, a Meta entende
   que o evento do navegador e o do servidor são o mesmo e conta uma vez só.
   Sem isso, cada lead é contado em dobro.
   ========================================================= */
(function () {
  var DATASET_ID = "1069596948024447";

  /* trecho oficial da Meta */
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', DATASET_ID);
  fbq('track', 'PageView');

  /* ---- utilidades expostas para os demais scripts ---- */
  window.recupereibr = window.recupereibr || {};

  // id único por evento, base da deduplicação com a API de Conversões
  window.recupereibr.novoEventId = function () {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "evt-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  };

  window.recupereibr.rastrear = function (evento, parametros, eventId) {
    if (typeof fbq !== "function") return;
    fbq("track", evento, parametros || {}, eventId ? { eventID: eventId } : undefined);
  };

  document.addEventListener("DOMContentLoaded", function () {
    var tipoObrigado = document.body.dataset.thankType;

    /* Lead nas páginas de obrigado: só chegam aqui os envios que deram certo,
       o que torna a conversão mais confiável que disparar no clique do botão */
    if (tipoObrigado) {
      var dados = {};
      try { dados = JSON.parse(sessionStorage.getItem("recupereibrThankYou") || "{}"); } catch (e) { dados = {}; }

      // marca só o id como usado, em vez de apagar os dados: o obrigado.js
      // lê esse mesmo sessionStorage depois para personalizar o nome na tela
      var chaveUsada = "recupereibrLeadEnviado";
      var jaEnviado = false;
      try { jaEnviado = sessionStorage.getItem(chaveUsada) === (dados.eventId || tipoObrigado); } catch (e) {}

      if (!jaEnviado) {
        window.recupereibr.rastrear("Lead", {
          content_name: tipoObrigado === "simulacao" ? "Simulação para familiar" : "Avaliação gratuita",
          content_category: dados.source || "desconhecida"
        }, dados.eventId);
        try { sessionStorage.setItem(chaveUsada, dados.eventId || tipoObrigado); } catch (e) {}
      }
    }

    /* o autoatendimento da home não redireciona, então o Lead sai do dataLayer */
    var jaEnviados = {};
    var fila = window.dataLayer || [];
    var observar = function (registro) {
      if (!registro || typeof registro !== "object") return;

      if (registro.event === "generate_lead" && registro.source === "autoatendimento_home") {
        if (jaEnviados[registro.eventId || "sem-id"]) return;
        jaEnviados[registro.eventId || "sem-id"] = true;
        window.recupereibr.rastrear("Lead", {
          content_name: "Autoatendimento",
          content_category: "autoatendimento_home"
        }, registro.eventId);
      }

      if (registro.event === "whatsapp_click" || registro.event === "phone_click") {
        window.recupereibr.rastrear("Contact", { content_name: registro.event });
      }
    };

    fila.forEach(observar);
    var pushOriginal = fila.push.bind(fila);
    fila.push = function () {
      var resultado = pushOriginal.apply(null, arguments);
      Array.prototype.forEach.call(arguments, observar);
      return resultado;
    };
  });
})();
