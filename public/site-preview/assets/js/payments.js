/* Payment methods progressively enhance ordinary anchor links. */
(() => {
  'use strict';
  const selector = document.querySelector('[data-payment-methods]');
  const tabs = [...document.querySelectorAll('[data-payment-tab]')];
  const panels = tabs.map(tab => document.getElementById(tab.hash.slice(1)));

  if (selector && tabs.length && panels.every(Boolean)) {
    const select = (index, { focus = false, save = false } = {}) => {
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
      if (focus) tabs[index].focus({ preventScroll: true });
      if (save) history.replaceState(history.state, '', tabs[index].hash);
    };
    selector.setAttribute('role', 'tablist');
    tabs.forEach((tab, index) => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panels[index].id);
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', tab.id);
      panels[index].tabIndex = 0;
      tab.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        select(index, { save: true });
      });
      tab.addEventListener('keydown', event => {
        const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1, ' ': index }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(next, { focus: true, save: true });
      });
    });
    const fromHash = () => {
      const index = tabs.findIndex(tab => tab.hash === location.hash);
      select(index >= 0 ? index : 0);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
  }

  document.querySelectorAll('[data-copy-iban]').forEach(button => {
    const input = document.getElementById(button.dataset.copyIban);
    const status = button.closest('.bank-account')?.querySelector('[data-copy-status]');
    const label = button.querySelector('[data-copy-label]');
    if (!input || !status || !label) return;
    let reset;
    button.hidden = false;
    button.addEventListener('click', async () => {
      clearTimeout(reset);
      status.textContent = '';
      label.textContent = 'Αντιγραφή…';
      button.disabled = true;
      try {
        if (!window.isSecureContext || !navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(input.value);
        label.textContent = 'Αντιγράφηκε ✓';
        status.textContent = 'Το IBAN αντιγράφηκε. Επικολλήστε το στην εφαρμογή της τράπεζάς σας.';
      } catch {
        input.focus();
        input.select();
        label.textContent = 'Αντιγραφή IBAN';
        status.textContent = 'Το IBAN επιλέχθηκε. Πατήστε «Αντιγραφή» από το μενού της συσκευής σας.';
      } finally {
        button.disabled = false;
        reset = setTimeout(() => { label.textContent = 'Αντιγραφή IBAN'; }, 3000);
      }
    });
  });
})();
