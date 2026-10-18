const form = document.querySelector('#mennoo-application');
if (form) {
  const steps = [...form.querySelectorAll('.application-step')];
  const next = form.querySelector('[data-next]');
  const prev = form.querySelector('[data-previous]');
  const send = form.querySelector('.form-send');
  const alertBox = document.querySelector('#application-alert');
  let current = 0;
  const packageId=new URLSearchParams(location.search).get('package');
  if (/^[1-6]$/.test(packageId||'')) {const selector=form.querySelector('[name=package_preference]');if(selector)selector.value=`Πακέτο #${packageId}`;}
  const label = input => input.closest('.application-field')?.querySelector('.application-label')?.textContent.trim() || input.name;
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
  form.addEventListener('submit', async e=>{
    e.preventDefault();if(!validateStep(current))return;
    send.disabled=true;send.textContent='Αποστολή αιτήματος…';alertBox.hidden=true;
    try {
      const res=await fetch(form.action,{method:'POST',body:new FormData(form),credentials:'same-origin',headers:{Accept:'application/json'}});
      const payload=await res.json();
      if(!res.ok || payload.delivered!==true) {
        for(const [name,message] of Object.entries(payload.errors||{})) showError(name,message);
        alertBox.textContent=payload.error||'Ελέγξτε τα πεδία σας και προσπαθήστε ξανά.';alertBox.hidden=false;
        // Jump to the step with a field error so it can be corrected.
        const invalid=form.querySelector('[aria-invalid=true]');
        const targetStep=invalid?.closest('.application-step');
        if(targetStep && targetStep!==steps[current]) { view(steps.indexOf(targetStep)); } 
        return;
      }
      form.hidden=true;document.querySelector('.form-progress').hidden=true;
      const success=document.querySelector('.application-success');success.hidden=false;
      success.querySelector('[data-success-message]').textContent=payload.message;
      success.focus();
    } catch {
      alertBox.textContent='Δεν ήταν δυνατή η επικοινωνία με τον server. Η αίτηση δεν επιβεβαιώθηκε. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.';
      alertBox.hidden=false;
    } finally {send.disabled=false;send.innerHTML='Οριστική υποβολή <span>↗</span>';}
  });
}
