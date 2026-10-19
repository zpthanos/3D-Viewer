import { validateLead, attachmentError } from './validation.js';

const purposes = {
  start: { title: 'Ας ξεκινήσουμε.', description: 'Πείτε μας λίγα πράγματα για την επιχείρησή σας.', motto: 'Εσείς φροντίζετε τη φιλοξενία. Εμείς τον κατάλογο.', required: ['business','name','email','phone','category','consent'] },
  preview: { title: 'Το δικό σας MENNOO.', description: 'Δώστε μας την εικόνα της επιχείρησής σας για να συζητήσουμε τη δική σας προεπισκόπηση.', motto: 'Ο δικός σας κατάλογος. Η δική σας ταυτότητα.', required: ['business','name','email','category','consent'] },
  package: { title: 'Βρείτε το πακέτο σας.', description: 'Επιλέξτε πόσες γλώσσες χρειάζεστε. Η ομάδα θα σας βοηθήσει με τις λεπτομέρειες.', motto: 'Η σωστή επιλογή ξεκινά από τις ανάγκες σας.', required: ['name','email','package','consent'] },
  contact: { title: 'Ας μιλήσουμε.', description: 'Μια ερώτηση, μια ιδέα ή κάτι διαφορετικό; Είμαστε εδώ.', motto: 'Κάθε καλή συνεργασία ξεκινά με μια κουβέντα.', required: ['name','email','notes','consent'] },
};

export function initForms(config, openDialog) {
  const dialog = document.querySelector('#lead-dialog');
  const form = dialog.querySelector('form');
  const result = dialog.querySelector('.form-result');
  const submit = form.querySelector('[type=submit]');
  const field = name => form.elements.namedItem(name);
  let controller;
  let requestRevision = 0;
  let summary = '';

  function abort() { requestRevision++; controller?.abort(); controller = null; }
  function busy(value) { submit.disabled = value; submit.textContent = value ? 'Γίνεται έλεγχος…' : 'Έλεγχος αιτήματος'; form.setAttribute('aria-busy', String(value)); }
  function clearErrors() {
    form.querySelectorAll('.field-error, .server-error').forEach(item => { item.hidden = true; item.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(item => item.removeAttribute('aria-invalid'));
  }
  function showErrors(errors) {
    Object.entries(errors).forEach(([name, message]) => {
      const element = document.getElementById(name === 'form' ? 'form-error' : `error-${name}`);
      if (element) { element.hidden = false; element.textContent = message; }
      field(name)?.setAttribute('aria-invalid', 'true');
    });
    const invalid = form.querySelector('[aria-invalid=true]:not([type=hidden])');
    if (invalid) invalid.focus();
    else { const error = document.querySelector('#form-error'); error.tabIndex = -1; error.focus(); }
  }

  const open = (kind, packageId, opener) => {
    if (!purposes[kind]) return;
    abort(); busy(false); clearErrors(); form.reset(); form.hidden = false; result.hidden = true;
    const purpose = purposes[kind];
    field('kind').value = kind; field('startedAt').value = Date.now();
    dialog.querySelector('#lead-title').textContent = purpose.title;
    dialog.querySelector('#lead-description').textContent = purpose.description;
    dialog.querySelector('[data-lead-motto]').textContent = purpose.motto;
    dialog.querySelector('[data-lead-number]').textContent = `0${Object.keys(purposes).indexOf(kind)+1} / Η ΕΠΟΜΕΝΗ ΚΙΝΗΣΗ`;
    form.querySelectorAll('[data-for]').forEach(row => {
      row.hidden = !row.dataset.for.split(' ').includes(kind);
      row.querySelectorAll('input, select').forEach(input => { input.disabled = row.hidden; });
    });
    Array.from(form.elements).forEach(input => {
      if (['INPUT','SELECT','TEXTAREA'].includes(input.tagName)) input.required = !input.disabled && purpose.required.includes(input.name);
    });
    form.querySelectorAll('[data-required-star]').forEach(star => { star.hidden = !star.closest('.form-field').querySelector('input,select').required; });
    form.querySelector('[data-notes-label]').textContent = kind === 'contact' ? 'Το μήνυμά σας *' : 'Κάτι ακόμη που θα θέλατε να γνωρίζουμε; (προαιρετικό)';
    if (config.packages.some(plan => plan.id === packageId)) field('package').value = packageId;
    openDialog(dialog, opener);
    dialog.querySelector('.lead-main').scrollTop = 0;
    // Keep the heading visible and the mobile keyboard closed until a field is tapped.
    const heading = dialog.querySelector('#lead-title'); heading.tabIndex = -1; heading.focus({ preventScroll: true });
  };
  dialog.addEventListener('close', () => { abort(); busy(false); });
  form.addEventListener('input', event => {
    const input = event.target;
    const error = document.getElementById(`error-${input.name}`);
    if (error) error.hidden = true;
    input.removeAttribute('aria-invalid');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    clearErrors(); busy(true);
    const revision = ++requestRevision;
    const payload = new FormData(form);
    const raw = Object.fromEntries(payload);
    const validation = validateLead(raw, config);
    let timeout;
    try {
      const file = payload.get('attachment');
      if (file instanceof File && file.name) {
        const error = attachmentError(file.name, file.size, new Uint8Array(await file.slice(0,12).arrayBuffer()));
        if (error) validation.errors.attachment = error;
      }
      if (revision !== requestRevision) return;
      if (Object.keys(validation.errors).length) { showErrors(validation.errors); return; }
      if (document.body.dataset.runtime === 'php') {
        controller = new AbortController();
        timeout = setTimeout(() => controller?.abort(), 15000);
        const response = await fetch(form.action, { method: 'POST', body: payload, signal: controller.signal, credentials: 'same-origin', headers: { Accept: 'application/json' } });
        const body = await response.json();
        if (revision !== requestRevision) return;
        if (!response.ok) { showErrors(body.errors || { form: body.error || 'Ο έλεγχος δεν ολοκληρώθηκε. Δοκιμάστε ξανά.' }); return; }
        if (body.validated !== true || body.delivered !== false || body.mode !== 'prototype') throw new Error('Unexpected validation response');
      }
      if (revision !== requestRevision) return;
      const labels = { business:'Επιχείρηση',name:'Ονοματεπώνυμο',email:'Email',phone:'Τηλέφωνο',category:'Κατηγορία',package:'Πακέτο',url:'Website / Social',notes:'Μήνυμα' };
      summary = `${purposes[raw.kind].title}\n\n` + Object.entries(labels).filter(([key]) => raw[key]).map(([key,label]) => {
        const plan = config.packages.find(plan => plan.id === raw[key]);
        const value = key === 'package' && plan ? `${plan.languages} γλώσσες · ${plan.price}€ / έτος + ΦΠΑ` : raw[key];
        return `${label}: ${value}`;
      }).join('\n');
      if (file instanceof File && file.name) summary += `\nΣυνημμένο: ${file.name} (προσθέστε το χειροκίνητα στο email)`;
      result.querySelector('[data-request-email]').href = `mailto:${config.email}?subject=${encodeURIComponent(`MENNOO — ${purposes[raw.kind].title}`)}&body=${encodeURIComponent(summary)}`;
      form.hidden = true; result.hidden = false;
      dialog.querySelector('.lead-main').scrollTop = 0;
      result.querySelector('h3').focus({ preventScroll: true });
    } catch {
      if (revision === requestRevision) showErrors({ form: 'Ο έλεγχος δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά. Δεν έγινε αποστολή.' });
    } finally {
      clearTimeout(timeout);
      if (revision === requestRevision) { busy(false); controller = null; }
    }
  });
  result.querySelector('[data-request-edit]').addEventListener('click', () => {
    result.hidden = true; form.hidden = false; form.querySelector('input:not([type=hidden]):not(:disabled)').focus();
  });
  result.querySelector('[data-request-download]').addEventListener('click', () => {
    const blob = new Blob(['\uFEFFΔΟΚΙΜΑΣΤΙΚΟ ΑΙΤΗΜΑ — ΔΕΝ ΕΧΕΙ ΑΠΟΣΤΑΛΕΙ\n\n', summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'MENNOO-request.txt'; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return { open };
}
