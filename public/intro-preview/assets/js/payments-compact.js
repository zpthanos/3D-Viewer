/* Compact payments: desktop shows both methods; narrow view uses accessible tabs. */
(() => {
  'use strict';
  const buttons = [...document.querySelectorAll('[data-pay-tab]')];
  if (buttons.length !== 2) return;
  const media = matchMedia('(max-width: 820px)');
  const panels = new Map([['card', document.getElementById('card-payment')], ['bank', document.getElementById('bank-payment')]]);
  let current = 'card';
  function show(which, focus = false) {
    current = which;
    buttons.forEach(button => {
      const active = button.dataset.payTab === current;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
    for (const [id, panel] of panels) {
      if (!panel) continue;
      if (media.matches) panel.hidden = id !== current;
      else panel.hidden = false;
    }
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => show(button.dataset.payTab));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (index + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
      show(buttons[next].dataset.payTab, true);
    });
  });
  media.addEventListener('change', () => show(current));
  show('card');
})();
