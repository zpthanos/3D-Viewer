/* Progressive enhancement for non-home PHP pages; no invisible-content dependency. */
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const saved = navigator.connection?.saveData;
const off = (() => { try { return localStorage.getItem('mennoo-motion') === 'off'; } catch { return false; } })();
const isLightDevice = (navigator.deviceMemory && navigator.deviceMemory <= 2) || navigator.hardwareConcurrency <= 2;
if ('IntersectionObserver' in window && !motion.matches && !saved && !off && !isLightDevice) {
  const nodes = [...document.querySelectorAll('.stands-page .stand-intro-copy, .stands-page .stand-intro-aside, .stands-page .lab-heading, .stands-page .mennoo-cloudflare-host, .stands-page .stand-ending')];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (!entry.target.animate || document.hidden || motion.matches) continue;
      entry.target.animate([
        {opacity: .1, transform: 'translate3d(0,38px,0)'},
        {opacity: 1, transform: 'translate3d(0,0,0)'}
      ], {duration: 1150, easing: 'cubic-bezier(.16,1,.3,1)'});
    }
  }, {threshold: .08, rootMargin: '0px 0px -20px 0px'});
  nodes.forEach(node => observer.observe(node));
  addEventListener('pagehide', () => observer.disconnect(), {once: true});
}
