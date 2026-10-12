/** Original MENNOO lounge score + synthesizer. CC0-1.0. No samples or recordings. */
export const SCORE = Object.freeze([
  { bass: 41, keys: [57, 60, 64, 67], bell: 76 },
  { bass: 45, keys: [55, 59, 60, 64], bell: 72 },
  { bass: 43, keys: [53, 57, 58, 62], bell: 74 },
  { bass: 36, keys: [55, 58, 62, 65], bell: 69 },
  { bass: 34, keys: [53, 57, 60, 62], bell: 72 },
  { bass: 38, keys: [53, 57, 60, 64], bell: 69 },
  { bass: 43, keys: [53, 57, 58, 62], bell: 70 },
  { bass: 36, keys: [52, 58, 62, 69], bell: 67 }
]);
export const BEAT = 60 / 72;
export const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

export class CafeSound {
  constructor({ createContext, onState = () => {} } = {}) {
    this.createContext = createContext || (() => {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw new Error('Audio unavailable');
      return new Context({ latencyHint: 'playback' });
    });
    this.onState = onState;
    this.wanted = false;
    this.visible = true;
    this.audible = false;
    this.volume = .32;
    this.step = 0;
    this.operation = 0;
    this.timer = 0;
    this.suspendTimer = 0;
  }

  emit(error = '') { this.onState({ wanted: this.wanted, audible: this.audible, error }); }

  setup() {
    if (this.context) return;
    const ctx = this.context = this.createContext();
    this.bus = ctx.createGain();
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 3800; tone.Q.value = .45;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -16; limiter.knee.value = 18; limiter.ratio.value = 4;
    this.bus.connect(tone); tone.connect(limiter); limiter.connect(this.master);
    this.master.connect(ctx.destination);
    const delay = ctx.createDelay(2), feedback = ctx.createGain(), wet = ctx.createGain();
    delay.delayTime.value = BEAT * .75; feedback.gain.value = .22; wet.gain.value = .18;
    tone.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(wet); wet.connect(limiter);
    const length = Math.floor(ctx.sampleRate * .1);
    this.brush = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.brush.getChannelData(0);
    let seed = 167026;
    for (let i = 0; i < length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 2147483648 - 1) * (1 - i / length) ** 3;
    }
  }

  voice(note, time, duration, level, bass = false) {
    const ctx = this.context, gain = ctx.createGain();
    gain.gain.setValueAtTime(.00001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + (bass ? .045 : .012));
    gain.gain.exponentialRampToValueAtTime(.00001, time + duration);
    gain.connect(this.bus);
    const partials = bass ? [[1, 1], [2, .1]] : [[1, 1], [2, .24], [3, .065]];
    let remaining = partials.length;
    for (const [ratio, strength] of partials) {
      const oscillator = ctx.createOscillator(), partial = ctx.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency(note) * ratio;
      partial.gain.value = strength;
      oscillator.connect(partial); partial.connect(gain);
      oscillator.start(time); oscillator.stop(time + duration + .03);
      oscillator.onended = () => { oscillator.disconnect(); partial.disconnect(); if (!--remaining) gain.disconnect(); };
    }
  }

  scheduleStep(step, time) {
    const chord = SCORE[Math.floor(step / 8) % SCORE.length], beat = step % 8;
    if (beat === 0) {
      chord.keys.forEach((note, i) => this.voice(note, time + i * .025, BEAT * 4.7, .063));
      this.voice(chord.bass, time, BEAT * 2.8, .15, true);
    }
    if (beat === 4) this.voice(chord.bass + 12, time, BEAT * 1.8, .075, true);
    if (beat === 5) this.voice(chord.bell, time + .025, BEAT * 2.6, .025);
    if (beat === 2 || beat === 6) {
      const ctx = this.context, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      source.buffer = this.brush; filter.type = 'highpass'; filter.frequency.value = 3500;
      gain.gain.value = .038; source.connect(filter); filter.connect(gain); gain.connect(this.bus);
      source.start(time); source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
  }

  tick() {
    const now = this.context.currentTime;
    if (this.nextTime < now - .1) this.nextTime = now + .04;
    while (this.nextTime < now + .18) {
      this.scheduleStep(this.step, this.nextTime);
      this.step = (this.step + 1) % 64;
      this.nextTime += BEAT / 2;
    }
  }

  async reconcile() {
    const operation = ++this.operation;
    clearTimeout(this.suspendTimer);
    if (!this.wanted || !this.visible) {
      clearInterval(this.timer); this.timer = 0; this.audible = false;
      if (this.context && this.context.state !== 'closed') {
        this.master.gain.setTargetAtTime(0, this.context.currentTime, .025);
        this.suspendTimer = setTimeout(() => {
          if (operation === this.operation) this.context.suspend().catch(() => {});
        }, 120);
      }
      this.emit(); return;
    }
    try {
      this.setup();
      if (this.context.state !== 'running') await this.context.resume();
      if (operation !== this.operation) return;
      if (this.context.state !== 'running') throw new Error('Audio interrupted');
      this.master.gain.setTargetAtTime(this.volume * .45, this.context.currentTime, .3);
      if (!this.timer) {
        this.nextTime = this.context.currentTime + .06;
        this.tick(); this.timer = setInterval(() => this.tick(), 100);
      }
      this.audible = true; this.emit();
    } catch {
      if (operation !== this.operation) return;
      clearInterval(this.timer); this.timer = 0; this.wanted = false; this.audible = false;
      this.emit('Ο ήχος δεν ξεκίνησε. Πατήστε ξανά για μουσική.');
    }
  }

  setEnabled(value) { this.wanted = Boolean(value); return this.reconcile(); }
  setVisible(value) {
    if (this.visible === Boolean(value)) return;
    this.visible = Boolean(value); return this.reconcile();
  }
  setVolume(value) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    if (this.audible) this.master.gain.setTargetAtTime(this.volume * .45, this.context.currentTime, .08);
  }
  dispose() {
    this.operation++; clearInterval(this.timer); clearTimeout(this.suspendTimer);
    this.wanted = this.audible = false;
    return this.context?.close().catch(() => {});
  }
}
