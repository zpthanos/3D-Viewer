export const CHAPTERS = Object.freeze([
  { label: 'Η πρώτη εντύπωση', title: 'Μια θέση στο δικό σας τραπέζι.', copy: 'Ένα μικρό αντικείμενο. Μέρος της φιλοξενίας σας.', view: 'wide', duration: 6500 },
  { label: 'Η λεπτομέρεια', title: 'Ο χαρακτήρας κρύβεται στις λεπτομέρειες.', copy: 'Ματ μαύρο PLA. Πραγματικές φόρμες, από κάθε πλευρά.', view: 'close', duration: 7500 },
  { label: 'Το σκανάρισμα', title: 'Μία κίνηση. Όλο το μενού.', copy: 'Το QR μέσα στη διακριτική εσοχή των 3 mm.', view: 'top', duration: 6500 },
  { label: 'Η εμπειρία', title: 'Τώρα, δοκιμάστε το.', copy: 'Σκανάρετε από το κινητό σας ή ανοίξτε τον πραγματικό κατάλογο.', view: 'wide', duration: 0 }
]);

/** Elapsed time is advanced only while visible, ready and explicitly playing. */
export class PresentationClock {
  constructor() { this.active = false; this.index = 0; this.elapsed = 0; this.playing = false; }
  start(reduced = false) { this.active = true; this.index = 0; this.elapsed = 0; this.playing = !reduced; }
  stop() { this.active = false; this.playing = false; }
  go(index) {
    this.index = Math.max(0, Math.min(CHAPTERS.length - 1, index)); this.elapsed = 0;
    if (!CHAPTERS[this.index].duration) this.playing = false;
  }
  advance(delta, visible = true, ready = true) {
    if (!this.active || !this.playing || !visible || !ready || !Number.isFinite(delta)) return false;
    this.elapsed += Math.max(0, Math.min(delta, 250));
    if (this.elapsed >= CHAPTERS[this.index].duration) { this.go(this.index + 1); return true; }
    return false;
  }
  get progress() { return CHAPTERS[this.index].duration ? this.elapsed / CHAPTERS[this.index].duration : 1; }
}
