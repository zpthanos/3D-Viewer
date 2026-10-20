/** A finite, pre-rendered intro. No WebGL, camera access or scroll interception. */
const root = document.querySelector('[data-intro]');
if (root) {
  const video = root.querySelector('[data-intro-video]');
  const poster = root.querySelector('.mn-intro-poster');
  const button = root.querySelector('[data-intro-playback]');
  const label = button.querySelector('[data-intro-button-label]');
  const symbol = button.querySelector('[data-intro-symbol]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let ready = false, visible = false, attempted = false, pausedByUser = false;
  let finished = false, pending = false, disposed = false, request = 0, timeout;

  function prefersStill() {
    let disabled = false;
    try { disabled = localStorage.getItem('mennoo-motion') === 'off'; } catch { /* optional preference */ }
    return reduced.matches || disabled || connection?.saveData ||
      ['slow-2g', '2g', '3g'].includes(connection?.effectiveType) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 1);
  }
  function available() {
    return visible && !document.hidden && !document.body.classList.contains('has-dialog');
  }
  function updateButton() {
    const playing = !video.paused && !video.ended;
    label.textContent = pending ? 'Ακύρωση' : playing ? 'Παύση' : finished ? 'Επανάληψη' : 'Προβολή intro';
    symbol.textContent = pending ? '×' : playing ? 'Ⅱ' : finished ? '↻' : '▶';
    button.setAttribute('aria-label', pending ? 'Ακύρωση φόρτωσης του intro' : playing ? 'Παύση της παρουσίασης του stand' : finished ? 'Επανάληψη της παρουσίασης του stand' : 'Αναπαραγωγή σύντομης παρουσίασης του stand');
  }
  function stop(user = false) {
    request++; clearTimeout(timeout); pending = false;
    if (user) pausedByUser = true;
    video.pause(); updateButton();
  }
  function fallback() {
    stop();
    root.removeAttribute('data-has-frame');
    finished = false; updateButton();
  }
  async function play(manual = false) {
    if (disposed || pending || (!manual && (!available() || prefersStill() || pausedByUser || finished))) return;
    attempted = true; pausedByUser = false;
    if (!video.hasAttribute('src')) {
      // Set only the selected source. preload=none and data-* prevent speculative downloads.
      video.src = matchMedia('(max-width: 760px)').matches ? video.dataset.mobileSrc : video.dataset.desktopSrc;
      video.muted = true;
    }
    if (finished || video.ended) { video.currentTime = 0; finished = false; }
    pending = true; updateButton();
    const token = ++request;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (token !== request) return;
      fallback();
      video.removeAttribute('src'); video.load();
    }, 8000);
    try {
      await video.play();
      if (token !== request) return;
      if (!available()) stop();
    } catch {
      // iOS Low Power Mode and browser autoplay policies are normal fallbacks.
      if (token === request) fallback();
    }
  }
  function sync() {
    if (disposed) return;
    if (!available() || prefersStill()) { if (pending || !video.paused) stop(); return; }
    if (ready && !pausedByUser && !finished && (!attempted || root.hasAttribute('data-has-frame'))) play();
  }
  button.hidden = false;
  button.addEventListener('click', () => {
    if (pending || (!video.paused && !video.ended)) stop(true);
    else play(true);
  });
  video.addEventListener('playing', () => {
    if (disposed || !available()) { stop(); return; }
    clearTimeout(timeout); pending = false;
    root.setAttribute('data-has-frame', 'true'); updateButton();
  });
  video.addEventListener('pause', updateButton);
  video.addEventListener('ended', () => { clearTimeout(timeout); pending = false; finished = true; updateButton(); });
  video.addEventListener('error', () => {
    fallback();
    // Reset a failed resource so an explicit retry can recover after reconnection.
    video.removeAttribute('src'); video.load();
  });

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; sync();
  }, { threshold: .15 }) : null;
  // Older browsers keep the poster and offer explicit playback; no scroll polling.
  if (observer) observer.observe(root.querySelector('.mn-intro-media'));
  else visible = true;
  const dialogs = new MutationObserver(sync);
  dialogs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  addEventListener('storage', sync);
  document.addEventListener('mennoo:motion-change', sync);
  addEventListener('pagehide', () => { disposed = true; stop(); observer?.disconnect(); dialogs.disconnect(); });
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    disposed = false; observer?.observe(root.querySelector('.mn-intro-media'));
    dialogs.observe(document.body, { attributes: true, attributeFilter: ['class'] }); sync();
  });
  Promise.resolve(poster.decode?.()).catch(() => {}).then(() => {
    ready = true;
    if (observer) requestAnimationFrame(sync);
  });
}
