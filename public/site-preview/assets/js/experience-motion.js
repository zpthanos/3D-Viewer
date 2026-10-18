/** Decorative only. Content stays visible if JS/observers/animation APIs fail. */
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(pointer: coarse)');
const connection = navigator.connection;
const lightDevice = (navigator.deviceMemory && navigator.deviceMemory <= 1) || navigator.hardwareConcurrency <= 1;
const modestDevice = (navigator.deviceMemory && navigator.deviceMemory <= 2) || navigator.hardwareConcurrency <= 4;
const supported = 'IntersectionObserver' in window;
const toggles = [...document.querySelectorAll('[data-motion-toggle]')];
let optedOut = false;
try { optedOut = localStorage.getItem('mennoo-motion') === 'off'; } catch { /* private browsing */ }
let enabled = false, paused = false, raf = 0, last = 0, elapsed = 0, dirty = true, particleTick = 0;
const animations = new Set();
const layers = [...document.querySelectorAll('[data-parallax]')].map(node => ({
  node, host: node.closest('.restaurant-scene,.how-visual') || node.parentElement,
  distance: Math.min(24, Number(node.dataset.parallax) || 16), visible: false,
}));
const environments = [...document.querySelectorAll('[data-ambient]')].map(host => ({host, visible: false, canvas: null, context: null, width: 0, height: 0}));

// A small set of cached multi-hued glow sprites: drawing pre-rendered sprites is
// much cheaper than making per-particle gradients in every animation frame.
const spriteColors = [
  [255, 183, 218], // MENNOO blush
  [255, 228, 173], // warm hospitality gold
  [216, 188, 255], // violet ambient
  [255, 244, 250], // crisp starlight
];
const sprites = spriteColors.map(([r, g, b]) => {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 40;
  const ctx = sprite.getContext('2d');
  if (!ctx) return null;
  const glow = ctx.createRadialGradient(20, 20, 0, 20, 20, 20);
  glow.addColorStop(0, `rgba(${r},${g},${b},1)`);
  glow.addColorStop(.09, `rgba(${r},${g},${b},.88)`);
  glow.addColorStop(.28, `rgba(${r},${g},${b},.38)`);
  glow.addColorStop(.7, `rgba(${r},${g},${b},.08)`);
  glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 40, 40);
  return sprite;
});
// Fixed seeds make particle positions stable between redraws; no huge libraries.
const fract = n => n - Math.floor(n);
const particles = Array.from({length: 96}, (_, i) => ({
  x: fract(i * .61803398875 + .17),
  y: fract(i * .75487766625 + .11),
  size: 10 + fract((i + 3) * .43349) * 15,
  speed: .0018 + fract(i * .3771) * .0035,
  sway: 7 + fract(i * .2271) * 21,
  phase: i * 2.399963,
  opacity: .38 + fract(i * .7237) * .38,
  tint: i % sprites.length,
}));
function canRun() { return enabled && !paused && !document.hidden; }
function schedule() { if (!raf && canRun()) raf = requestAnimationFrame(draw); }
function wake() { dirty = true; schedule(); }
function ensureCanvas(env) {
  if (env.canvas || !sprites.some(Boolean)) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'ambient-particles'; canvas.setAttribute('aria-hidden','true');
  const context = canvas.getContext('2d'); if (!context) return;
  env.host.append(canvas); env.canvas = canvas; env.context = context;
}
function draw(now) {
  raf = 0;
  if (!canRun()) { last = 0; return; }
  elapsed += last ? Math.min(now - last, 50) / 1000 : 0; last = now;
  const paintParticles = now - particleTick >= (coarse.matches || modestDevice ? 48 : 32);
  if (paintParticles) particleTick = now;
  // Read layout first; scroll never writes until these measurements are complete.
  const viewport = innerHeight;
  const measurements = dirty ? layers.filter(layer => layer.visible).map(layer => ({layer, rect: layer.host.getBoundingClientRect()})) : [];
  const sizes = dirty ? environments.filter(env => env.visible).map(env => ({env, rect: env.host.getBoundingClientRect()})) : [];
  for (const {layer,rect} of measurements) {
    const progress = Math.max(-1, Math.min(1, (viewport / 2 - rect.top - rect.height / 2) / (viewport / 2 + rect.height / 2)));
    layer.node.style.setProperty('--parallax-y', `${(progress * layer.distance * (coarse.matches ? .45 : 1)).toFixed(2)}px`);
  }
  for (const {env,rect} of sizes) {
    ensureCanvas(env); if (!env.canvas) continue;
    const scale = Math.min(devicePixelRatio || 1, 1.25, 1100 / Math.max(rect.width,1));
    env.width = Math.max(1, Math.round(rect.width * scale)); env.height = Math.max(1, Math.round(rect.height * scale));
    if (env.canvas.width !== env.width || env.canvas.height !== env.height) { env.canvas.width = env.width; env.canvas.height = env.height; }
  }
  dirty = false;
  let active = false;
  for (const env of environments) {
    if (!env.visible || !env.context) continue;
    active = true; if (!paintParticles) continue;
    const {context: ctx, width: w, height: h} = env;
    ctx.clearRect(0,0,w,h);
    const count = coarse.matches ? 42 : modestDevice ? 62 : particles.length;
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const sprite = sprites[p.tint];
      if (!sprite) continue;
      const x = (fract(p.x + Math.sin(elapsed * .18 + p.phase) * .008) * w)
              + Math.sin(elapsed * .41 + p.phase) * p.sway;
      const y = fract(p.y - elapsed * p.speed) * h;
      const size = p.size * (coarse.matches ? .9 : 1);
      // Gentle luminosity pulse and softened edges. No sudden pop at wrap.
      const edge = Math.max(0, Math.min(1, y / 40, (h - y) / 40));
      const shimmer = .82 + .18 * Math.sin(elapsed * .65 + p.phase);
      ctx.globalAlpha = p.opacity * edge * shimmer;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }
  if (active) schedule(); else last = 0;
}
function sync() {
  enabled = supported && !optedOut && !reduce.matches && !connection?.saveData && !lightDevice;
  paused = document.body.classList.contains('has-dialog');
  for (const button of toggles) {
    button.hidden = !supported || reduce.matches || connection?.saveData || !!lightDevice;
    button.setAttribute('aria-pressed',String(optedOut));
    button.textContent = optedOut ? 'Ενεργοποίηση εφέ' : 'Παύση εφέ';
    button.setAttribute('aria-label',optedOut ? 'Ενεργοποίηση διακοσμητικής κίνησης' : 'Παύση διακοσμητικής κίνησης');
  }
  for (const env of environments) if (env.canvas) env.canvas.hidden = !enabled;
  for (const animation of animations) {
    if (!enabled) animation.cancel();
    else if (paused || document.hidden) animation.pause();
    else animation.play();
  }
  if (!enabled) for (const layer of layers) layer.node.style.removeProperty('--parallax-y');
  if (!canRun()) { cancelAnimationFrame(raf); raf = 0; last = 0; }
  else wake();
}
toggles.forEach(button => button.addEventListener('click', () => {
  optedOut = !optedOut;
  try { localStorage.setItem('mennoo-motion', optedOut ? 'off' : 'on'); } catch { /* optional preference */ }
  sync();
}));
if ('IntersectionObserver' in window) {
  const visible = new IntersectionObserver(entries => {
    for (const entry of entries) {
      for (const layer of layers) if (entry.target === layer.host) layer.visible = entry.isIntersecting;
      for (const env of environments) if (entry.target === env.host) env.visible = entry.isIntersecting;
    }
    wake();
  });
  new Set([...layers.map(layer => layer.host), ...environments.map(env => env.host)]).forEach(host => visible.observe(host));
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal.unobserve(entry.target);
      if (!canRun() || !entry.target.animate) continue;
      const staggered = entry.target.matches('.home-stand-card,.benefit-strip > div,.example-list button');
      const siblings = staggered ? [...entry.target.parentElement.children].filter(el => el.matches('.home-stand-card,.benefit-strip > div,.example-list button')) : [];
      const delay = staggered ? Math.min(siblings.indexOf(entry.target) * 110, 440) : 0;
      const animation = entry.target.animate([
        {opacity:.1, transform:'translate3d(0,38px,0) scale(.975)'},
        {opacity:1, transform:'translate3d(0,0,0) scale(1)'},
      ], {duration:1120, delay, easing:'cubic-bezier(.16,1,.3,1)'});
      animations.add(animation);
      const clean = () => animations.delete(animation);
      animation.addEventListener('finish',clean,{once:true}); animation.addEventListener('cancel',clean,{once:true});
    }
  }, {rootMargin:'0px 0px -24px 0px', threshold:.08});
  document.querySelectorAll('.owner-heading,.benefit-strip > div,.how-copy > .display,.process-list > div,.ai-layout > div,.home-stand-header,.home-stand-card,.section-heading,.example-list button,.pricing-copy > .display,.price-receipt,.faq-intro,.people-section > div,.contact-heading,.stand-intro-copy,.lab-heading,.stand-ending > h2').forEach(node => reveal.observe(node));
} // No observer: keep the fully styled static experience, with no polling fallback.
if ('ResizeObserver' in window) {
  const resize = new ResizeObserver(wake);
  new Set([...layers.map(layer => layer.host), ...environments.map(env => env.host)]).forEach(host => resize.observe(host));
}
addEventListener('scroll',wake,{passive:true}); addEventListener('resize',wake,{passive:true});
document.addEventListener('visibilitychange',sync);
reduce.addEventListener('change',sync); coarse.addEventListener('change',wake); connection?.addEventListener?.('change',sync);
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
addEventListener('pagehide', () => { cancelAnimationFrame(raf); raf = 0; last = 0; for (const animation of animations) animation.cancel(); });
addEventListener('pageshow',sync);
sync();
