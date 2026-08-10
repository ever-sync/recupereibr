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
  var GA4_ID = "G-7VDNRXZQ5Q";

  /* ---- Google Analytics 4 ---- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  var ga = document.createElement("script");
  ga.async = true;
  ga.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
  document.head.appendChild(ga);

  gtag("js", new Date());
  gtag("config", GA4_ID);

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

  /* ---------------------------------------------------------
     Atribuição de tráfego pago

     Antes, cada formulário lia os parâmetros só da própria URL. Quem
     clicava no anúncio, caía na home e depois navegava até /avaliacao
     chegava ao CRM como "acesso_direto": o gclid se perdia no caminho e
     o lead nunca podia ser enviado de volta como conversão offline.

     Aqui os identificadores são capturados na primeira página e guardados
     pela sessão inteira. Um clique novo em anúncio sobrescreve, porque
     representa uma nova intenção.
     --------------------------------------------------------- */
  var CHAVE_ATRIB = "recupereibrAtribuicao";
  var IDS_CLIQUE = ["gclid", "gbraid", "wbraid", "fbclid", "ttclid", "msclkid"];
  var UTMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  function lerCookie(nome) {
    var achado = document.cookie.split("; ").find(function (linha) {
      return linha.indexOf(nome + "=") === 0;
    });
    return achado ? achado.split("=")[1] : "";
  }

  (function capturarAtribuicao() {
    var url = new URLSearchParams(window.location.search);
    var guardado = {};
    try { guardado = JSON.parse(sessionStorage.getItem(CHAVE_ATRIB) || "{}"); } catch (e) {}

    var temCliqueNovo = IDS_CLIQUE.some(function (id) { return url.get(id); });
    if (temCliqueNovo) guardado = {};

    IDS_CLIQUE.concat(UTMS).forEach(function (campo) {
      var valor = url.get(campo);
      if (valor) guardado[campo] = valor;
    });

    if (!guardado.landingPage) guardado.landingPage = window.location.pathname;
    if (!guardado.referrer) guardado.referrer = document.referrer || "";
    if (!guardado.primeiroAcesso) guardado.primeiroAcesso = new Date().toISOString();

    try { sessionStorage.setItem(CHAVE_ATRIB, JSON.stringify(guardado)); } catch (e) {}
  })();

  window.recupereibr.atribuicao = function () {
    var dados = {};
    try { dados = JSON.parse(sessionStorage.getItem(CHAVE_ATRIB) || "{}"); } catch (e) {}

    // cookies do pixel: sem eles a API de Conversões perde muito na
    // correspondência, que é justamente o 6.1/10 do Gerenciador
    dados.fbp = lerCookie("_fbp");
    dados.fbc = lerCookie("_fbc");

    // a Meta só grava _fbc quando o pixel carrega depois do clique;
    // se o fbclid veio na URL e o cookie ainda não existe, monta o valor
    if (!dados.fbc && dados.fbclid) {
      dados.fbc = "fb.1." + Date.now() + "." + dados.fbclid;
    }

    dados.paginaConversao = window.location.pathname;
    dados.userAgent = navigator.userAgent;
    return dados;
  };

  /* A conta está sob "configuração básica": a Meta classificou o site em categoria
     restrita e descarta parâmetros personalizados e tudo que venha depois do
     domínio na URL. Isso significa que `content_category` NÃO pode ser a única
     forma de separar as personas — ele é removido antes de chegar ao dataset.

     Por isso a persona vai no próprio nome do evento, que sempre passa. Os
     parâmetros continuam sendo enviados: se a restrição cair depois de uma
     revisão de categoria, eles voltam a valer sem precisar mexer no código. */
  window.recupereibr.capitalizar = function (texto) {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  };

  // id único por evento, base da deduplicação com a API de Conversões
  window.recupereibr.novoEventId = function () {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "evt-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  };

  /* Eventos padrão da Meta. Qualquer nome fora desta lista precisa ir por
     `trackCustom`: com `track`, o Gerenciador de Eventos descarta o evento
     silenciosamente e ele nunca fica disponível para otimização. */
  var EVENTOS_PADRAO = ["PageView", "Lead", "Contact", "CompleteRegistration",
    "ViewContent", "InitiateCheckout", "SubmitApplication", "Schedule", "Search"];

  // dispara nas duas plataformas de uma vez, com os nomes que cada uma espera
  window.recupereibr.rastrear = function (evento, parametros, eventId) {
    if (typeof fbq === "function") {
      var metodo = EVENTOS_PADRAO.indexOf(evento) === -1 ? "trackCustom" : "track";
      fbq(metodo, evento, parametros || {}, eventId ? { eventID: eventId } : undefined);
    }

    var nomeGa4 = { Lead: "generate_lead", Contact: "contact" }[evento];
    if (nomeGa4 && typeof window.gtag === "function") {
      window.gtag("event", nomeGa4, Object.assign({}, parametros, { transaction_id: eventId || undefined }));
    }
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
        var personaLead = tipoObrigado === "simulacao" ? "filho" : "idoso";
        var paramsLead = {
          content_name: tipoObrigado === "simulacao" ? "Simulação para familiar" : "Avaliação gratuita",
          content_category: dados.source || "desconhecida",
          persona: personaLead
        };

        // o Lead padrão é a conversão de referência e vale em qualquer cenário
        window.recupereibr.rastrear("Lead", paramsLead, dados.eventId);

        /* o par por persona vai junto porque o parâmetro acima é descartado sob
           configuração básica; sem estes, os dois funis viram um número só e não
           há como semear lookalike separado */
        window.recupereibr.rastrear(
          "Lead" + window.recupereibr.capitalizar(personaLead),
          paramsLead,
          dados.eventId
        );
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

      /* -----------------------------------------------------------------
         Meio de funil

         Estes passos já existiam no dataLayer (GA4), mas nunca chegavam ao
         Pixel: o repasse acima exige `source === "autoatendimento_home"`, e
         os fluxos de /simulacao e /avaliacao usam outros valores. Resultado:
         a Meta só enxergava PageView e o Lead final, e não havia evento
         intermediário em que otimizar um público de meio de funil.

         `persona` separa os dois funis paralelos do site:
           filho → /simulacao ("Ajude quem cuidou de você")
           idoso → /avaliacao ("Descubra se você pode parar de pagar")

         Não repassar `disease`, `health` nem `result_type`: os dois primeiros
         são condição de saúde e o terceiro deriva dela. Mandar isso à Meta
         viola a Personalized Attributes Policy e põe o dataset em risco.
         ----------------------------------------------------------------- */
      var MEIO_DE_FUNIL = {
        lead_started: { evento: "InicioCadastro", persona: "filho", porPersona: true },
        family_quiz_complete: { evento: "SimulacaoCompleta", persona: "filho", porPersona: false }
      };

      /* `lead_started` sai das duas páginas com o mesmo significado — contato
         capturado, qualificação ainda por vir — então cada uma envia a própria
         `persona`, que tem precedência sobre o default do mapa.

         `lead_form_start` ficou de fora de propósito: dispara no `focusin`, ou
         seja, em qualquer toque num campo. Otimizar por ele faria a Meta
         perseguir quem só encostou no formulário, e o evento não significaria a
         mesma coisa nas duas personas. */
      var chaveMeio = registro.stage === "lead_started" ? "lead_started" : registro.event;
      var meio = MEIO_DE_FUNIL[chaveMeio];
      if (meio) {
        var chaveDedup = chaveMeio + ":" + (registro.eventId || "unico");
        if (jaEnviados[chaveDedup]) return;
        jaEnviados[chaveDedup] = true;
        var persona = registro.persona || meio.persona;
        window.recupereibr.rastrear(
          meio.porPersona ? meio.evento + window.recupereibr.capitalizar(persona) : meio.evento,
          { content_category: persona, content_name: registro.source || chaveMeio },
          registro.eventId
        );
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
