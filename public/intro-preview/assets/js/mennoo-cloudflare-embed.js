/* Small, origin-checked bridge. The parent never downloads models or starts WebGL. */
(() => {
  'use strict';
  const frame = document.getElementById('mennoo-3d-studio');
  if (!frame) return;
  const origin = 'https://stands.mennoo.cfd';
  const designs = new Set((frame.dataset.designs || '').split(','));
  const fullLinks = document.querySelectorAll('.stands-open-full');
  let intersecting = false, leaving = false, lastHeight = 0;
  function notify() {
    frame.contentWindow?.postMessage({
      type: 'mennoo-stand-studio:host',
      visible: intersecting && !document.hidden && !leaving
    }, origin);
  }
  function measureVisibility() {
    const rect = frame.getBoundingClientRect();
    intersecting = rect.bottom > 0 && rect.top < window.innerHeight;
    notify();
  }
  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== frame.contentWindow) return;
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'mennoo-stand-studio:ready') {
      notify(); // Works even when the iframe does not send a Referrer header.
    } else if (message.type === 'mennoo-stand-studio:height') {
      const height = message.height;
      if (typeof height !== 'number' || !Number.isFinite(height) || height < 450 || height > 2500) return;
      const next = Math.ceil(height) + 4;
      if (Math.abs(next - lastHeight) > 1) {
        frame.style.height = next + 'px'; lastHeight = next;
      }
    } else if (message.type === 'mennoo-stand-studio:design' && designs.has(message.design)) {
      for (const link of fullLinks) link.href = origin + '/' + message.design;
    }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting; notify();
    }).observe(frame);
  } else {
    let scheduled = false;
    const queue = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; measureVisibility(); });
    };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
  }
  frame.addEventListener('load', measureVisibility);
  document.addEventListener('visibilitychange', notify);
  addEventListener('pagehide', () => { leaving = true; notify(); });
  addEventListener('pageshow', () => { leaving = false; measureVisibility(); });
  measureVisibility();
})();
