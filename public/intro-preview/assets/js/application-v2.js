import {createSubmissionClient} from './submission-client-v2.js';

const form = document.querySelector('#mennoo-application');
if (form) {
  const steps = [...form.querySelectorAll('.application-step')];
  const next = form.querySelector('[data-next]');
  const prev = form.querySelector('[data-previous]');
  const send = form.querySelector('.form-send');
  const alertBox = document.querySelector('#application-alert');
  let current = 0;
  let submitting = false;
  const packageId=new URLSearchParams(location.search).get('package');
  if (/^[1-6]$/.test(packageId||'')) {const selector=form.querySelector('[name=package_preference]');if(selector)selector.value=`Πακέτο #${packageId}`;}
  const removeError = name => {
    const container = form.querySelector(`[data-field="${CSS.escape(name)}"]`);
    container?.querySelectorAll('.application-error').forEach(el => { el.hidden = true; el.textContent = ''; });
    container?.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  };
  const showError = (name,message) => {
    const el=document.getElementById(`error-${name}`);
    if (el) { el.textContent=message; el.hidden=false; }
    const input=form.querySelector(`[name="${CSS.escape(name)}"], [name="${CSS.escape(name)}[]"]`);
    input?.setAttribute('aria-invalid','true');
  };
  function validateStep(i) {
    const step=steps[i]; let first=null;
    step.querySelectorAll('.application-error').forEach(el => { el.hidden=true; el.textContent=''; });
    step.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    const groups=new Set();
    step.querySelectorAll('input,select,textarea').forEach(input => {
      if (input.type==='file') { if (input.files.length>8 || [...input.files].some(f=>f.size>3*1024*1024) || [...input.files].reduce((s,f)=>s+f.size,0)>12*1024*1024) { showError('attachments','Έως 8 αρχεία, έως 3 MB το καθένα και 12 MB συνολικά.'); first ||= input; } return; }
      if (input.type==='checkbox' || input.type==='radio') {
        if (groups.has(input.name)) return; groups.add(input.name);
        if (input.name==='consent' && !input.checked) { showError('consent','Απαιτείται η επιβεβαίωσή σας.'); first ||= input; }
        if (input.name==='languages[]' && !step.querySelector('input[name="languages[]"]:checked')) { showError('languages','Επιλέξτε τουλάχιστον μία γλώσσα.'); first ||= input; }
        if (input.name==='messenger' && !step.querySelector('input[name="messenger"]:checked')) { showError('messenger','Επιλέξτε έναν τρόπο επικοινωνίας.'); first ||= input; }
      } else if (input.required && !input.value.trim() || input.value && !input.checkValidity()) {
        showError(input.name,input.validity.patternMismatch?'Ελέγξτε τη μορφή του πεδίου.':input.validity.typeMismatch?'Ελέγξτε το email ή τον σύνδεσμο.':'Συμπληρώστε σωστά το πεδίο.'); first ||=input;
      }
    });
    step.querySelectorAll('input[type=tel]').forEach(input=>{
      if(input.value && input.value.replace(/\D/g,'').length<10){showError(input.name,'Το τηλέφωνο πρέπει να έχει τουλάχιστον 10 ψηφία.');first ||=input;}
    });
    const langs=step.querySelector('input[name="other_language"]');
    if (langs && form.querySelector('input[name="languages[]"][value="Άλλη"]:checked') && !langs.value.trim()) { showError('other_language','Συμπληρώστε την άλλη γλώσσα.'); first ||=langs; }
    const period=step.querySelector('input[name="other_period"]');
    if (period && form.querySelector('[name="renewal_period"]').value==='Άλλη περίοδος' && !period.value.trim()) { showError('other_period','Συμπληρώστε την άλλη περίοδο.'); first ||=period; }
    if (first) { first.focus();return false; }
    return true;
  }
  function buildReview() {
    const container=document.querySelector('#application-review');container.replaceChildren();
    steps.slice(0,-1).forEach(step=>{
      const card=document.createElement('div');card.className='review-card';
      const header=document.createElement('h4');header.textContent=step.querySelector('h3').textContent;card.append(header);
      step.querySelectorAll('.application-field').forEach(field=>{
        const inputs=[...field.querySelectorAll('input,select,textarea')];
        if (!inputs.length) return;
        let value='';
        if (inputs[0].type==='file') value=[...inputs[0].files].map(f=>f.name).join(', ');
        else if (['checkbox','radio'].includes(inputs[0].type)) value=inputs.filter(i=>i.checked).map(i=>i.value).join(', ');
        else value=inputs[0].value;
        if (!value) return;
        const row=document.createElement('div');row.className='review-row';
        const title=document.createElement('span');title.textContent=field.querySelector('.application-label')?.textContent || '';
        const summary=document.createElement('strong');summary.textContent=value;
        row.append(title,summary);card.append(row);
      });container.append(card);
    });
  }
  function view(index) {
    current=index;
    steps.forEach((step,i)=>{step.hidden=i!==index;});
    prev.hidden=index===0;next.hidden=index===steps.length-1;send.hidden=index!==steps.length-1;
    const pct=Math.round(index/(steps.length-1)*100);
    document.querySelector('#form-progress-fill').style.width=pct+'%';
    document.querySelector('#form-progress-percent').textContent=pct+'%';
    document.querySelector('#form-progress-title').textContent=`Βήμα ${index+1} από ${steps.length}`;
    alertBox.hidden=true;
    if(index===steps.length-1) buildReview();
    const heading=steps[index].querySelector('h3');heading.tabIndex=-1;heading.focus({preventScroll:true});
    document.querySelector('.forms-heading').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }
  next.addEventListener('click',()=> { if(validateStep(current)) view(current+1); });
  prev.addEventListener('click',()=>view(current-1));
  form.addEventListener('input',e=>{ if (e.target.name) removeError(e.target.name.replace(/\[\]$/,''));alertBox.hidden=true; });
  const conditional=()=>{
    const otherLanguage=form.querySelector('[data-field="other_language"]');
    if(otherLanguage)otherLanguage.hidden=!Boolean(form.querySelector('input[name="languages[]"][value="Άλλη"]:checked'));
    const otherPeriod=form.querySelector('[data-field="other_period"]');
    if(otherPeriod)otherPeriod.hidden=form.querySelector('[name="renewal_period"]')?.value!=='Άλλη περίοδος';
  };
  form.addEventListener('change',conditional);conditional();
  const file=form.querySelector('input[type=file]');
  file?.addEventListener('change',()=>{
    const count=file.files.length;
    form.querySelector('.file-selected').textContent=count?`${count} ${count===1?'αρχείο επιλεγμένο':'αρχεία επιλεγμένα'} · ${[...file.files].map(f=>f.name).join(', ')}`:'Δεν έχουν επιλεγεί αρχεία.';
  });
  const statusPanel = document.querySelector('[data-submission-status]');
  const statusText = statusPanel.querySelector('[data-submission-message]');
  const statusReference = statusPanel.querySelector('[data-submission-reference]');
  const checkButton = statusPanel.querySelector('[data-check-submission]');
  const initiallyDisabled = [...form.elements].filter(input => input.disabled);
  let storage;
  try { storage = window.sessionStorage; } catch { /* Some browsers restrict storage. */ }
  const client = createSubmissionClient({
    submitUrl: form.action,
    statusUrl: form.dataset.statusUrl,
    kind: form.elements.kind.value,
    storage,
    onState({state, payload, message, reference}) {
      submitting = !['rejected', 'accepted'].includes(state);
      if (['sending', 'checking'].includes(state)) form.setAttribute('aria-busy', 'true');
      else form.removeAttribute('aria-busy');
      [...form.elements].forEach(input => { input.disabled = submitting || initiallyDisabled.includes(input); });
      statusPanel.hidden = state === 'rejected' || state === 'accepted';
      checkButton.hidden = state !== 'unconfirmed';
      statusReference.textContent = reference ? `Κωδικός αιτήματος: ${reference}` : '';
      statusText.textContent = state === 'sending'
        ? 'Στέλνουμε το αίτημά σας. Με συνημμένα αρχεία μπορεί να χρειαστεί λίγος περισσότερος χρόνος.'
        : state === 'checking'
          ? 'Ελέγχουμε αν το αίτημά σας καταχωρήθηκε. Δεν το στέλνουμε ξανά.'
          : 'Δεν μπορέσαμε να επιβεβαιώσουμε την αποστολή. Το αίτημα μπορεί να έχει ήδη καταχωρηθεί. Πατήστε «Έλεγχος κατάστασης» πριν το στείλετε ξανά.';
      send.textContent = submitting ? 'Υποβολή σε εξέλιξη…' : 'Αποστολή αιτήματος ↗';
      if (state === 'unconfirmed') { statusPanel.tabIndex = -1; statusPanel.focus(); }
      if (state === 'rejected') {
        for (const [name, error] of Object.entries(payload.errors || {})) showError(name, error);
        const invalid = form.querySelector('[aria-invalid=true]');
        const target = invalid?.closest('.application-step');
        if (target && target !== steps[current]) view(steps.indexOf(target));
        alertBox.textContent = payload.error || payload.errors?.form || 'Ελέγξτε τα πεδία σας και προσπαθήστε ξανά.';
        alertBox.hidden = false;
        invalid?.focus();
        if (payload.reset_captcha && window.turnstile) window.turnstile.reset();
      } else {
        alertBox.hidden = true;
      }
      if (state === 'accepted') {
        form.hidden = true;
        const success = document.querySelector('.application-success');
        success.hidden = false;
        success.querySelector('[data-success-message]').textContent = message || `Το αίτημά σας έγινε δεκτό για αποστολή. Κωδικός: ${reference}.`;
        success.focus();
      }
    },
  });
  checkButton.addEventListener('click', () => client.check());
  window.addEventListener('online', () => client.check());
  document.querySelector('[data-new-submission]').addEventListener('click', () => {
    client.clear();
    location.reload(); // A deliberate new request needs a fresh server-issued token.
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submitting || send.disabled) return;
    // Enter advances a step; it must not focus a required field in a hidden panel.
    if (current < steps.length - 1) { if (validateStep(current)) view(current + 1); return; }
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(i)) { view(i); steps[i].querySelector('[aria-invalid=true]')?.focus(); return; }
    }
    const body = new FormData(form); // Capture before disabling controls.
    await client.submit(body);
  });
  client.resume();
}
