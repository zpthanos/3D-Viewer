import { createSceneJourney } from './scene-journey.js';

const config = JSON.parse(document.getElementById('mennoo-config').textContent);
const scene = document.querySelector('#experience');
const demo = document.querySelector('#demo-dialog');
const navigation = document.querySelector('#navigation-dialog');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const openers = new WeakMap();
let demoTimer;

function openDialog(dialog, opener = document.activeElement) {
  journey.cancelScan();
  const parent = opener?.closest?.('dialog');
  if (parent && parent !== dialog) opener = openers.get(parent);
  if (typeof dialog.showModal !== 'function') {
    if (dialog === demo) window.open(config.demo, '_blank', 'noopener,noreferrer');
    else if (dialog === navigation) location.hash = '#business';
    else location.href = `mailto:${config.email}`;
    return;
  }
  document.querySelectorAll('dialog[open]').forEach(other => { if (other !== dialog) other.close(); });
  openers.set(dialog, opener);
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('has-dialog');
}
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) {
      document.body.classList.remove('has-dialog');
      const opener = openers.get(dialog);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
});

function loadDemo() {
  clearTimeout(demoTimer);
  const loading = demo.querySelector('.demo-loading');
  const help = demo.querySelector('.demo-loading-help');
  loading.hidden = false; help.hidden = true;
  const iframe = document.createElement('iframe');
  iframe.title = 'Πραγματικός ψηφιακός κατάλογος MENNOO';
  iframe.src = config.demo;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
  iframe.addEventListener('load', () => {
    if (!iframe.isConnected) return;
    loading.hidden = true; help.hidden = true; clearTimeout(demoTimer);
  }, { once: true });
  demo.querySelector('[data-frame-slot]').replaceChildren(iframe);
  // A cross-origin load event cannot confirm that the provider rendered its menu.
  // Keep the direct link available at all times, and show help after a short wait.
  demoTimer = setTimeout(() => { loading.hidden = true; help.hidden = false; }, 9000);
}
demo.addEventListener('close', () => {
  clearTimeout(demoTimer); demo.querySelector('[data-frame-slot]').replaceChildren();
});

const copy = {
  enter: { eyebrow:'ΕΝΑΣ ΚΩΔΙΚΟΣ QR. ΑΜΕΤΡΗΤΕΣ ΕΠΙΛΟΓΕΣ.', title:['Πάρτε','θέση.'], description:'Σκανάρετε το QR. Ανακαλύψτε τον ψηφιακό κατάλογο MENNOO στη γλώσσα σας.', action:'Πλησιάστε το τραπέζι' },
  table: { eyebrow:'ΕΝΑ QR. ΟΛΟΣ Ο ΚΑΤΑΛΟΓΟΣ.', title:['Μια κίνηση.','Όλες οι επιλογές.'], description:'Αγγίξτε το QR stand και ανακαλύψτε τον πραγματικό κατάλογο.', action:'Ανοίξτε τον κατάλογο' },
  scan: { eyebrow:'Η ΕΜΠΕΙΡΙΑ ΞΕΚΙΝΑ', title:['Σκανάρετε.','Ανακαλύψτε.'], description:'Το QR σάς οδηγεί στον κατάλογο. Χωρίς εφαρμογή, χωρίς αναμονή.', action:'Ο κατάλογος ανοίγει…' },
};
let perspective = 'guest';
function updatePerspective() {
  const text = scene.querySelector('[data-perspective-description]');
  if (!text) return;
  text.textContent = perspective === 'owner' ? 'Δείτε πώς ένας πολύγλωσσος QR κατάλογος μπορεί να αναβαθμίσει την εξυπηρέτησή σας.' : 'Μία σάρωση. Ένας ολόκληρος κόσμος επιλογών.';
}
const journey = createSceneJourney({
  delay: () => reducedMotion.matches ? 0 : 650,
  onStage(stage) {
    scene.dataset.stage = stage;
    const message = copy[stage];
    scene.querySelector('[data-scene-eyebrow]').textContent = message.eyebrow;
    const accent = document.createElement('em'); accent.textContent = message.title[1];
    scene.querySelector('[data-scene-title]').replaceChildren(message.title[0], document.createElement('br'), accent);
    scene.querySelector('[data-scene-description]').textContent = message.description;
    scene.querySelector('[data-scene-label]').textContent = message.action;
    const tip = {enter:['ΔΟΚΙΜΑΣΤΕ ΤΟ','Πατήστε «Πλησιάστε το τραπέζι» ή αγγίξτε το QR stand.'],table:['ΕΙΣΤΕ ΣΤΟ ΤΡΑΠΕΖΙ','Αγγίξτε τον κωδικό QR για να ξεκινήσει η προσομοίωση σάρωσης.'],scan:['ΣΑΡΩΣΗ QR','Ανοίγουμε τον πραγματικό κατάλογο MENNOO. Δεν χρησιμοποιείται κάμερα.']}[stage];
    scene.querySelector('[data-scene-tip-title]').textContent=tip[0];
    scene.querySelector('[data-scene-tip]').textContent=tip[1];
    updatePerspective();
    scene.querySelector('.replay-link').hidden = stage === 'enter';
    scene.querySelector('.scan-beam').hidden = stage !== 'scan';
    scene.querySelector('[data-scene-status]').textContent = stage === 'enter' ? 'Επιστροφή στην είσοδο.' : stage === 'scan' ? 'Προσομοίωση σάρωσης QR. Δεν χρησιμοποιείται κάμερα.' : 'Είστε στο τραπέζι. Ανοίξτε τον κατάλογο.';
    scene.querySelectorAll('[data-scene-action]').forEach(button => {
      button.setAttribute('aria-disabled', String(stage === 'scan'));
      button.setAttribute('aria-label', message.action);
    });
    scene.querySelectorAll('.experience-steps button').forEach((button, index) => {
      const active = index === (stage === 'enter' ? 0 : stage === 'table' ? 1 : 2);
      if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
  },
  onOpen() { openDialog(demo); if (demo.open) loadDemo(); },
});

document.addEventListener('click', event => {
  const target = event.target.closest('button, a');
  if (!target) return;
  if (target.hasAttribute('data-close-dialog')) target.closest('dialog')?.close();
  if (target.matches('a[href^="#"]')) journey.cancelScan();
  if (target.dataset.perspective) {
    perspective=target.dataset.perspective;
    scene.querySelectorAll('[data-perspective]').forEach(button=>button.setAttribute('aria-pressed',String(button===target)));
    updatePerspective();
  }
  if (target.hasAttribute('data-scene-action')) journey.activate();
  if (target.hasAttribute('data-scene-reset')) journey.reset();
  if (target.hasAttribute('data-scene-approach')) journey.approach();
  if (target.hasAttribute('data-open-demo')) journey.openMenu();
  if (target.hasAttribute('data-open-nav')) { openDialog(navigation, target); target.setAttribute('aria-expanded', 'true'); }
  if (target.hasAttribute('data-reload-demo')) loadDemo();
  if (target.hasAttribute('data-owner')) {
    demo.close();
    const business = document.querySelector('#business');
    business.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    const heading = business.querySelector('h2'); heading.tabIndex = -1; heading.focus({ preventScroll: true });
    openers.set(demo, heading);
  }
  if (target.dataset.lead) {
    const selected = document.querySelector('input[name=languages]:checked').value;
    const page = ({start:'registration',preview:'interest',package:'interest',contact:'interest'})[target.dataset.lead] || 'interest';
    const qs = new URLSearchParams();
    const packageId=target.dataset.package || (target.hasAttribute('data-selected-plan') ? selected : '');
    if(packageId) qs.set('package',packageId);
    location.href = `/forms/${page}/${qs.size ? `?${qs}` : ''}`;
  }
  if (target.dataset.example !== undefined) {
    document.querySelectorAll('[data-example]').forEach(button => button.setAttribute('aria-pressed', String(button === target)));
    document.querySelectorAll('.example-preview').forEach(panel => {
      const selected = panel.id === `example-${target.dataset.example}`;
      if (selected && panel.hidden) {
        panel.hidden = false;
        if (!reducedMotion.matches && !navigator.connection?.saveData && panel.animate) {
          panel.animate([
            {opacity: .08, transform: 'translate3d(0,32px,0) scale(.97)'},
            {opacity: 1, transform: 'translate3d(0,0,0) scale(1)'}
          ], {duration: 990, easing: 'cubic-bezier(.16,1,.3,1)'});
        }
      } else if (!selected) panel.hidden = true;
    });
  }
});
document.querySelector('[data-forms-toggle]')?.addEventListener('click',e=>{
  const menu=e.currentTarget.closest('.nav-dropdown');
  const open=menu.classList.toggle('is-open');
  e.currentTarget.setAttribute('aria-expanded',String(open));
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const panel=document.querySelector('.nav-dropdown.is-open');panel?.classList.remove('is-open');panel?.querySelector('button')?.setAttribute('aria-expanded','false');}});
navigation.addEventListener('close', () => document.querySelector('[data-open-nav]').setAttribute('aria-expanded', 'false'));
matchMedia('(min-width: 1321px)').addEventListener('change', event => { if (event.matches && navigation.open) navigation.close(); });
document.querySelectorAll('input[name=languages]').forEach(radio => radio.addEventListener('change', () => {
  const plan = config.packages.find(item => item.id === radio.value);
  document.querySelectorAll('[data-plan-name]').forEach(label => { label.textContent = plan.name; });
  document.querySelector('[data-plan-languages]').textContent = `${plan.languages} ${plan.languages === 1 ? 'γλώσσα' : 'γλώσσες'}`;
  document.querySelector('[data-plan-price]').textContent = plan.price;
}));
const header = document.querySelector('#site-header');
const updateHeader = () => header.classList.toggle('is-scrolled', scrollY > 40);
addEventListener('scroll', updateHeader, { passive: true }); updateHeader();
document.addEventListener('visibilitychange', () => { if (document.hidden) journey.cancelScan(); });
if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) journey.cancelScan(); }).observe(scene);
addEventListener('pagehide', () => { journey.dispose(); clearTimeout(demoTimer); });
