/* Secondary pages need navigation and copy controls, not the restaurant engine. */
(() => {
  'use strict';
  const header = document.querySelector('#site-header');
  const dialog = document.querySelector('#navigation-dialog');
  const opener = document.querySelector('[data-open-nav]');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  opener?.addEventListener('click', () => {
    if (!dialog || dialog.open) return;
    dialog.showModal();
    opener.setAttribute('aria-expanded', 'true');
    document.body.classList.add('has-dialog');
  });
  dialog?.addEventListener('close', () => {
    opener?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('has-dialog');
    opener?.focus({ preventScroll: true });
  });
  dialog?.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-dialog]')) dialog.close();
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });

  const dropdown = document.querySelector('[data-forms-toggle]');
  const closeDropdown = () => {
    dropdown?.setAttribute('aria-expanded', 'false');
    dropdown?.closest('.nav-dropdown')?.classList.remove('is-open');
  };
  dropdown?.addEventListener('click', () => {
    const open = dropdown.closest('.nav-dropdown').classList.toggle('is-open');
    dropdown.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav-dropdown')) closeDropdown();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDropdown();
  });
  matchMedia('(min-width: 1321px)').addEventListener('change', ({ matches }) => {
    if (matches && dialog?.open) dialog.close();
  });

  const toc = document.querySelector('.legal-toc');
  if (toc && matchMedia('(max-width: 900px)').matches) toc.open = false;

  const status = document.querySelector('[data-copy-status]');
  document.querySelectorAll('[data-copy-iban]').forEach((button) => {
    const input = document.getElementById(button.dataset.copyIban);
    if (!input) return;
    button.hidden = false;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        if (!window.isSecureContext || !navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(input.value);
        if (status) status.textContent = `Αντιγράφηκε το ${input.getAttribute('aria-label')}.`;
      } catch {
        input.focus();
        input.select();
        if (status) status.textContent = 'Το IBAN επιλέχθηκε. Χρησιμοποιήστε «Αντιγραφή» από το μενού της συσκευής σας.';
      } finally {
        button.disabled = false;
      }
    });
  });
  document.querySelectorAll('[data-print-page]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => window.print());
  });
})();
