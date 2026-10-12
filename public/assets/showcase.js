import { CafeSound } from './cafe-sound.js?v=showcase-20261012';
import { CHAPTERS, PresentationClock } from './presentation-core.js?v=showcase-20261012';

export function createShowcase({ activate, camera, reset, getState, notifyHeight }) {
  const $ = selector => document.querySelector(selector);
  const studio = $('#studio'), scene = $('#scene'), hud = $('#presentation-hud');
  const start = $('#present-btn'), music = $('#music-btn'), pause = $('#presentation-pause');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clock = new PresentationClock();
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const surroundings = ['#top-header', '#intro', '#footnote'].map($);
  let raf = 0, last = 0, visible = true, musicChoice = null, soundBefore = false, returnFocus;
  const sound = new CafeSound({ onState: ({ wanted, audible, error }) => {
    music.setAttribute('aria-pressed', String(wanted));
    music.setAttribute('aria-label', wanted ? 'Κλείσιμο μουσικής' : 'Ενεργοποίηση μουσικής');
    music.dataset.playing = String(audible);
    $('#music-label').textContent = wanted ? 'Σίγαση' : 'Μουσική';
    $('#volume-control').hidden = !wanted;
    if (error) $('#sound-status').textContent = error;
  }});
  music.addEventListener('click', () => {
    musicChoice = !sound.wanted;
    $('#sound-status').textContent = '';
    sound.setEnabled(musicChoice);
  });
  $('#music-volume').addEventListener('input', event => sound.setVolume(Number(event.target.value) / 100));

  function updateProgress() {
    chapters.forEach((node, index) => node.style.setProperty('--chapter-progress',
      index < clock.index ? '1' : index === clock.index ? String(clock.progress) : '0'));
  }
  function render(cameraMove = true) {
    if (!clock.active) return;
    const chapter = CHAPTERS[clock.index], state = getState();
    scene.dataset.chapter = String(clock.index);
    scene.dataset.tourPlaying = String(clock.playing);
    scene.dataset.preview = String(!state.ready);
    $('#chapter-label').textContent = `0${clock.index + 1} / 04 — ${chapter.label}`;
    $('#chapter-title').textContent = chapter.title;
    $('#chapter-copy').textContent = chapter.copy;
    $('#presentation-preview').hidden = !state.failed;
    $('#presentation-finale').hidden = clock.index !== 3;
    chapters.forEach((node, index) => {
      if (index === clock.index) node.setAttribute('aria-current', 'step');
      else node.removeAttribute('aria-current');
    });
    pause.textContent = clock.index === 3 ? 'Από την αρχή' : clock.playing ? 'Παύση' : 'Συνέχεια';
    pause.setAttribute('aria-label', clock.index === 3 ? 'Επανάληψη παρουσίασης' : clock.playing ? 'Παύση παρουσίασης' : 'Συνέχεια παρουσίασης');
    $('#chapter-prev').disabled = clock.index === 0;
    $('#chapter-next').disabled = clock.index === 3;
    if (cameraMove && state.ready) camera(chapter.view, clock.playing && !reduced.matches, clock.index);
    updateProgress();
  }
  function frame(now) {
    raf = 0;
    if (!clock.active) return;
    const state = getState();
    if (clock.advance(last ? now - last : 0, visible && !document.hidden, state.ready || state.failed)) render();
    last = now; updateProgress();
    if (clock.playing && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function schedule() {
    cancelAnimationFrame(raf); raf = 0; last = 0;
    if (clock.active && clock.playing && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function go(index) { clock.go(index); render(); schedule(); }
  function stop() {
    if (!clock.active) return;
    clock.stop(); cancelAnimationFrame(raf); raf = 0;
    hud.hidden = true;
    document.documentElement.classList.remove('is-presenting');
    studio.removeAttribute('role'); studio.removeAttribute('aria-modal');
    surroundings.forEach(node => { if (node) node.inert = false; });
    start.innerHTML = '<span aria-hidden="true">▷</span> Παρουσίαση';
    start.setAttribute('aria-label', 'Έναρξη παρουσίασης με μουσική');
    scene.removeAttribute('data-chapter'); scene.removeAttribute('data-tour-playing');
    if (!soundBefore && musicChoice !== true) sound.setEnabled(false);
    reset(); notifyHeight(); returnFocus?.focus({ preventScroll: true });
  }
  function begin() {
    if (clock.active) { stop(); return; }
    returnFocus = document.activeElement; soundBefore = sound.wanted;
    visible = true; sound.setVisible(true);
    // Called directly by a click: iOS and Android require this gesture for audio.
    if (musicChoice !== false) sound.setEnabled(true);
    clock.start(reduced.matches);
    document.documentElement.classList.add('is-presenting');
    studio.setAttribute('role', 'dialog'); studio.setAttribute('aria-modal', 'true');
    surroundings.forEach(node => { if (node) node.inert = true; });
    hud.hidden = false;
    start.innerHTML = '<span aria-hidden="true">×</span> Κλείσιμο';
    start.setAttribute('aria-label', 'Κλείσιμο παρουσίασης');
    activate(false); render(); schedule(); notifyHeight(); start.focus({ preventScroll: true });
  }
  start.setAttribute('aria-label', 'Έναρξη παρουσίασης με μουσική');
  start.addEventListener('click', begin);
  $('#chapter-prev').addEventListener('click', () => go(clock.index - 1));
  $('#chapter-next').addEventListener('click', () => go(clock.index + 1));
  chapters.forEach(node => node.addEventListener('click', () => go(Number(node.dataset.chapter))));
  pause.addEventListener('click', () => {
    if (clock.index === 3) clock.go(0);
    clock.playing = !clock.playing; render(); schedule();
  });
  function manual() {
    if (!clock.active || !clock.playing) return;
    clock.playing = false; render(false); schedule();
  }
  studio.addEventListener('keydown', event => {
    if (!clock.active) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); stop(); }
    if (event.key === 'Tab') {
      const nodes = [...studio.querySelectorAll('button:not(:disabled),a[href],input,[tabindex="0"]')]
        .filter(node => node.getClientRects().length && !node.closest('[hidden]'));
      const first = nodes[0], lastNode = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); lastNode?.focus(); }
      else if (!event.shiftKey && document.activeElement === lastNode) { event.preventDefault(); first?.focus(); }
    }
  }, true);
  function visibility(value) {
    visible = value;
    sound.setVisible(visible && !document.hidden);
    scene.dataset.ambientPaused = String(!visible || document.hidden || reduced.matches || Boolean(navigator.connection?.saveData));
    schedule();
  }
  document.addEventListener('visibilitychange', () => visibility(visible));
  addEventListener('pagehide', () => { visibility(false); sound.setEnabled(false); });
  addEventListener('pageshow', () => visibility(true));
  reduced.addEventListener('change', () => { if (reduced.matches) manual(); visibility(visible); });
  visibility(true);
  return { get active() { return clock.active; }, manual, refresh: render, visibility, stop };
}
