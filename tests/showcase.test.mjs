import test from 'node:test';
import assert from 'node:assert/strict';
import { PresentationClock, CHAPTERS } from '../public/assets/presentation-core.js';
import { CafeSound, SCORE, frequency } from '../public/assets/cafe-sound.js';

test('presentation waits for assets and pauses while hidden', () => {
  const clock = new PresentationClock(); clock.start();
  for (let i = 0; i < 100; i++) clock.advance(100, true, false);
  assert.equal(clock.index, 0); assert.equal(clock.elapsed, 0);
  for (let i = 0; i < 100; i++) clock.advance(100, false, true);
  assert.equal(clock.elapsed, 0);
  for (let i = 0; i < CHAPTERS[0].duration / 100; i++) clock.advance(100);
  assert.equal(clock.index, 1);
  clock.playing = false; clock.advance(200); assert.equal(clock.elapsed, 0);
});
test('presentation holds at the real QR until dismissed or replayed', () => {
  const clock = new PresentationClock(); clock.start(); clock.go(3);
  for (let i = 0; i < 100; i++) clock.advance(200);
  assert.equal(clock.index, 3); assert.equal(clock.playing, false); assert.equal(clock.progress, 1);
  clock.go(0); clock.playing = true; clock.advance(100); assert.equal(clock.elapsed, 100);
  clock.stop(); clock.advance(100); assert.equal(clock.elapsed, 100);
});
test('reduced motion starts with manual chapter navigation', () => {
  const clock = new PresentationClock(); clock.start(true); clock.advance(200);
  assert.equal(clock.elapsed, 0); assert.equal(clock.playing, false);
  clock.go(2); assert.equal(clock.index, 2);
  clock.go(-10); assert.equal(clock.index, 0); clock.go(99); assert.equal(clock.index, 3);
});
test('background timing gaps cannot skip through the tour', () => {
  const clock = new PresentationClock(); clock.start(); clock.advance(120000);
  assert.equal(clock.index, 0); assert.equal(clock.elapsed, 250);
});

function audioFixture(hold = false) {
  const events = [], states = [];
  const param = () => ({ value: 0, setTargetAtTime() {}, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), delayTime: param(),
    connect() {}, disconnect() {}, start() { events.push('note'); }, stop() {} });
  let resolve;
  const context = { state: 'suspended', currentTime: 0, sampleRate: 100, destination: {},
    createGain: node, createBiquadFilter: node, createDelay: node, createDynamicsCompressor: node, createOscillator: node, createBufferSource: node,
    createBuffer: () => ({ getChannelData: () => new Float32Array(10) }),
    resume: () => { events.push('resume'); if (hold) return new Promise(r => { resolve = () => { context.state = 'running'; r(); }; }); context.state = 'running'; return Promise.resolve(); },
    suspend: () => { context.state = 'suspended'; events.push('suspend'); return Promise.resolve(); },
    close: () => { context.state = 'closed'; events.push('close'); return Promise.resolve(); }
  };
  const sound = new CafeSound({ createContext: () => { events.push('create'); return context; }, onState: state => states.push(state) });
  return { sound, events, states, context, resolve: () => resolve() };
}
test('audio stays uninitialized until explicitly enabled; repeated starts use one scheduler', async () => {
  const f = audioFixture(); assert.deepEqual(f.events, []);
  await f.sound.setVisible(false); assert.deepEqual(f.events, []);
  await f.sound.setVisible(true); await f.sound.setEnabled(true);
  const timer = f.sound.timer; await f.sound.setEnabled(true);
  assert.equal(f.sound.timer, timer); assert.equal(f.events.filter(v => v === 'create').length, 1);
  assert.ok(f.events.includes('note')); await f.sound.dispose();
});
test('a late audio resume cannot undo the mute button', async () => {
  const f = audioFixture(true); const starting = f.sound.setEnabled(true);
  await f.sound.setEnabled(false); f.resolve(); await starting;
  assert.equal(f.sound.wanted, false); assert.equal(f.sound.audible, false); assert.equal(f.sound.timer, 0);
  assert.ok(!f.events.includes('note')); await f.sound.dispose();
});
test('leaving the scene stops scheduling and returning respects explicit mute', async () => {
  const f = audioFixture(); await f.sound.setEnabled(true); await f.sound.setVisible(false);
  assert.equal(f.sound.audible, false); assert.equal(f.sound.timer, 0); assert.equal(f.sound.wanted, true);
  await f.sound.setEnabled(false); await f.sound.setVisible(true);
  assert.equal(f.sound.audible, false); assert.equal(f.sound.timer, 0); await f.sound.dispose();
});
test('audio rejection is recoverable without claiming playback', async () => {
  const states = []; let calls = 0;
  const sound = new CafeSound({ createContext: () => { calls++; throw Error('unsupported'); }, onState: s => states.push(s) });
  await sound.setEnabled(true); assert.equal(sound.audible, false); assert.equal(sound.wanted, false); assert.ok(states.at(-1).error);
  await sound.setEnabled(true); assert.equal(calls, 2); await sound.dispose();
});
test('score uses finite audible notes and volume is bounded', async () => {
  assert.equal(frequency(69), 440);
  for (const c of SCORE) for (const n of [c.bass, c.bell, ...c.keys]) assert.ok(frequency(n) > 20 && frequency(n) < 4000);
  const f = audioFixture(); f.sound.setVolume(5); assert.equal(f.sound.volume, 1); f.sound.setVolume(-1); assert.equal(f.sound.volume, 0);
  f.sound.setVolume(NaN); assert.equal(f.sound.volume, 0); await f.sound.dispose();
});
