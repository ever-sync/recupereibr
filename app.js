/* ==========================================================================
   RECUPEREIBR: INTERACTIVE APPLICATION LOGIC
   Handles Simulator, Eligibility Quiz, Disease Filtering, & WhatsApp Hand-off
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const whatsappNumber = '5511912133116';

  function trackEvent(eventName, parameters = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...parameters });
    window.dispatchEvent(new CustomEvent('recupereibr:analytics', {
      detail: { event: eventName, ...parameters }
    }));
  }

  function openWhatsApp(message) {
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    const newWindow = window.open(whatsappURL, '_blank', 'noopener,noreferrer');
    if (newWindow) newWindow.opener = null;
  }

  /* ------------------------------------------------------------------------
     1. SIMULATOR CALCULATOR LOGIC
     ------------------------------------------------------------------------ */
  const monthlyTaxInput = document.getElementById('monthlyTaxInput');
  const yearsInput = document.getElementById('yearsInput');
  const diseaseSelect = document.getElementById('diseaseSelect');
  
  const monthlyTaxDisplay = document.getElementById('monthlyTaxDisplay');
  const yearsDisplay = document.getElementById('yearsDisplay');
  
  const totalRestitutionResult = document.getElementById('totalRestitutionResult');
  const annualSavingsResult = document.getElementById('annualSavingsResult');
  const monthlySavingsResult = document.getElementById('monthlySavingsResult');
  const heroEstimatedValue = document.getElementById('heroEstimatedValue');

  const btnSendSimulation = document.getElementById('btnSendSimulation');
  const simNameInput = document.getElementById('simNameInput');
  const simPhoneInput = document.getElementById('simPhoneInput');
  const privacyConsent = document.getElementById('privacyConsent');
  const consentError = document.getElementById('consentError');

  function formatCurrencyBRL(amount) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  function updateSimulator() {
    if (!monthlyTaxInput || !yearsInput) return;

    const monthlyTax = parseFloat(monthlyTaxInput.value) || 0;
    const years = parseInt(yearsInput.value) || 1;
    const totalMonths = years * 12;

    // Calculation: Total 5-year restitution = Monthly tax * total months
    const totalRestitution = monthlyTax * totalMonths;
    const annualSavings = monthlyTax * 12;

    // Update UI displays
    if (monthlyTaxDisplay) monthlyTaxDisplay.textContent = formatCurrencyBRL(monthlyTax);
    if (yearsDisplay) yearsDisplay.textContent = `${years} ${years === 1 ? 'Ano' : 'Anos'} (${totalMonths} meses)`;
    
    if (totalRestitutionResult) totalRestitutionResult.textContent = formatCurrencyBRL(totalRestitution);
    if (annualSavingsResult) annualSavingsResult.textContent = `${formatCurrencyBRL(annualSavings)} / ano`;
    if (monthlySavingsResult) monthlySavingsResult.textContent = `${formatCurrencyBRL(monthlyTax)} / mês`;
    
    if (heroEstimatedValue) heroEstimatedValue.textContent = formatCurrencyBRL(totalRestitution);
  }

  if (monthlyTaxInput) monthlyTaxInput.addEventListener('input', updateSimulator);
  if (yearsInput) yearsInput.addEventListener('input', updateSimulator);
  if (monthlyTaxInput) monthlyTaxInput.addEventListener('change', () => trackEvent('use_calculator'));
  if (yearsInput) yearsInput.addEventListener('change', () => trackEvent('use_calculator'));
  if (privacyConsent) {
    privacyConsent.addEventListener('change', () => {
      if (privacyConsent.checked && consentError) consentError.hidden = true;
    });
  }

  // Send simulation result directly to WhatsApp
  if (btnSendSimulation) {
    btnSendSimulation.addEventListener('click', () => {
      if (!privacyConsent || !privacyConsent.checked) {
        if (consentError) consentError.hidden = false;
        if (privacyConsent) privacyConsent.focus();
        return;
      }

      const name = simNameInput ? simNameInput.value.trim() : '';
      const phone = simPhoneInput ? simPhoneInput.value.trim() : '';
      const monthlyTax = monthlyTaxInput ? monthlyTaxInput.value : '600';
      const years = yearsInput ? yearsInput.value : '5';
      const disease = diseaseSelect ? diseaseSelect.value : 'Doença da Lei 7.713/88';
      const totalEstimated = totalRestitutionResult ? totalRestitutionResult.textContent : 'R$ 36.000,00';

      let message = `Olá! Fiz a simulação de restituição no site da RecupereiBR.\n\n`;
      if (name) message += `👤 *Nome:* ${name}\n`;
      if (phone) message += `📱 *Telefone:* ${phone}\n`;
      message += `💰 *Desconto de IR Mensal:* R$ ${monthlyTax}/mês\n`;
      message += `⏱️ *Tempo com a condição:* ${years} ano(s)\n`;
      message += `🩺 *Doença:* ${disease}\n`;
      message += `📊 *Estimativa Calculada:* ${totalEstimated} de restituição retroativa\n\n`;
      message += `Gostaria de agendar uma avaliação técnica gratuita para o meu caso!`;

      trackEvent('generate_lead', { lead_source: 'simulator_whatsapp' });
      openWhatsApp(message);
    });
  }

  // Initial calculation trigger
  updateSimulator();


  /* ------------------------------------------------------------------------
     2. 3-STEP ELIGIBILITY QUIZ LOGIC
     ------------------------------------------------------------------------ */
  const quizAnswers = {
    step1: null,
    step2: null,
    step3: null
  };

  const stepCards = [
    document.getElementById('stepCard1'),
    document.getElementById('stepCard2'),
    document.getElementById('stepCard3')
  ];

  const quizResultBox = document.getElementById('quizResultBox');
  const quizResultTitle = document.getElementById('quizResultTitle');
  const quizResultDesc = document.getElementById('quizResultDesc');
  const quizResultHeader = document.getElementById('quizResultHeader');
  const quizResultIcon = document.getElementById('quizResultIcon');
  const quizWhatsappLink = document.getElementById('quizWhatsappLink');
  const btnRestartQuiz = document.getElementById('btnRestartQuiz');

  const optionBtns = document.querySelectorAll('.quiz-opt-btn');

  optionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const step = parseInt(e.currentTarget.getAttribute('data-step'));
      const val = e.currentTarget.getAttribute('data-val');

      quizAnswers[`step${step}`] = val;

      if (step < 3) {
        // Move to next step
        stepCards[step - 1].classList.remove('active');
        stepCards[step].classList.add('active');
      } else {
        // Show result
        stepCards[step - 1].classList.remove('active');
        showQuizResult();
      }
    });
  });

  function showQuizResult() {
    if (!quizResultBox) return;

    quizResultBox.style.display = 'block';

    const isIneligible = quizAnswers.step1 === 'Trabalhador Ativa' ||
      quizAnswers.step2 === 'Não possui doença';
    const needsReview = quizAnswers.step2 === 'Em Investigação' ||
      quizAnswers.step3 !== 'IR no benefício';

    quizResultBox.classList.remove('result-success', 'result-review', 'result-ineligible');

    let resultType = 'eligible';
    let whatsappMessage = 'Fiz o teste no site e gostaria de uma análise gratuita do meu caso.';

    if (isIneligible) {
      resultType = 'ineligible';
      quizResultBox.classList.add('result-ineligible');
      if (quizResultIcon) quizResultIcon.textContent = 'ℹ️';
      if (quizResultTitle) quizResultTitle.textContent = 'Os Requisitos Podem Não Estar Preenchidos';
      if (quizResultDesc) {
        quizResultDesc.innerHTML = `
          Pelas respostas selecionadas, a natureza do rendimento ou a condição de saúde pode não atender
          aos requisitos da Lei nº 7.713/88. A isenção não se estende, em regra, a salário, trabalho autônomo,
          aluguel ou outras rendas não elegíveis.
        `;
      }
    } else if (needsReview) {
      resultType = 'review';
      quizResultBox.classList.add('result-review');
      if (quizResultIcon) quizResultIcon.textContent = '🔎';
      if (quizResultTitle) quizResultTitle.textContent = 'Seu Caso Precisa de Análise';
      if (quizResultDesc) {
        quizResultDesc.innerHTML = `
          Suas respostas não permitem concluir que há imposto sobre um rendimento elegível ou que o
          diagnóstico já está comprovado. Uma análise dos documentos pode esclarecer se existe direito
          à isenção e eventual valor a restituir.
        `;
      }
    } else {
      quizResultBox.classList.add('result-success');
      if (quizResultIcon) quizResultIcon.textContent = '✅';
      if (quizResultTitle) quizResultTitle.textContent = 'Há Indícios de Elegibilidade';
      if (quizResultDesc) {
        quizResultDesc.innerHTML = `
          As respostas indicam rendimento potencialmente elegível, diagnóstico de doença prevista em lei
          e IR sobre o benefício. A confirmação depende da análise da documentação e da data de início do direito.
        `;
      }
    }

    if (quizWhatsappLink) {
      quizWhatsappLink.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    }
    trackEvent('eligibility_quiz_complete', { result_type: resultType });
  }

  if (btnRestartQuiz) {
    btnRestartQuiz.addEventListener('click', () => {
      quizAnswers.step1 = null;
      quizAnswers.step2 = null;
      quizAnswers.step3 = null;

      if (quizResultBox) quizResultBox.style.display = 'none';

      stepCards.forEach(card => card.classList.remove('active'));
      if (stepCards[0]) stepCards[0].classList.add('active');
      if (stepCards[0]) stepCards[0].querySelector('.quiz-opt-btn')?.focus();
    });
  }


  /* ------------------------------------------------------------------------
     3. DISEASE CATEGORY FILTER LOGIC
     ------------------------------------------------------------------------ */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const diseaseCards = document.querySelectorAll('.disease-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      e.currentTarget.classList.add('active');
      e.currentTarget.setAttribute('aria-pressed', 'true');

      const filter = e.currentTarget.getAttribute('data-filter');

      diseaseCards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter || cat === 'all') {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
      trackEvent('view_disease_category');
    });
  });


  /* ------------------------------------------------------------------------
     4. FAQ ACCORDION LOGIC
     ------------------------------------------------------------------------ */
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (questionBtn) {
      if (answer) {
        const answerId = `faq-answer-${Array.from(faqItems).indexOf(item) + 1}`;
        answer.id = answerId;
        answer.setAttribute('aria-hidden', 'true');
        questionBtn.setAttribute('aria-controls', answerId);
      }
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Close all items
        faqItems.forEach(i => {
          i.classList.remove('active');
          i.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
          i.querySelector('.faq-answer')?.setAttribute('aria-hidden', 'true');
        });

        // Toggle clicked item
        if (!isActive) {
          item.classList.add('active');
          questionBtn.setAttribute('aria-expanded', 'true');
          if (answer) answer.setAttribute('aria-hidden', 'false');
          trackEvent('faq_open');
        }
      });
    }
  });


  /* ------------------------------------------------------------------------
     5. MOBILE NAVIGATION TOGGLE LOGIC
     ------------------------------------------------------------------------ */
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('active');
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
      mobileToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    });

    // Close menu when clicking nav links on mobile
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileToggle.setAttribute('aria-label', 'Abrir menu');
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileToggle.setAttribute('aria-label', 'Abrir menu');
        mobileToggle.focus();
      }
    });
  }

  document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
    link.addEventListener('click', () => {
      trackEvent('generate_lead', { lead_source: 'whatsapp_link' });
    });
  });

});
