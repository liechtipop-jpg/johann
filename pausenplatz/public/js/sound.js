// Eigene Töne, synthetisch erzeugt (Web Audio). Standardmässig aus.
import { store } from './store.js';

let ctx = null;
const SOUNDS = {
  click: [[660, 0.05, 'triangle', 0.12]],
  move: [[420, 0.07, 'sine', 0.2], [620, 0.06, 'sine', 0.12, 0.05]],
  capture: [[220, 0.12, 'square', 0.12], [160, 0.12, 'square', 0.1, 0.06]],
  turn: [[523, 0.09, 'sine', 0.18], [784, 0.12, 'sine', 0.16, 0.09]],
  win: [[523, 0.12, 'triangle', 0.2], [659, 0.12, 'triangle', 0.2, 0.12], [784, 0.25, 'triangle', 0.22, 0.24]],
  lose: [[392, 0.18, 'sine', 0.18], [330, 0.3, 'sine', 0.18, 0.16]],
  chip: [[1500, 0.03, 'square', 0.06], [1900, 0.03, 'square', 0.05, 0.04]],
  card: [[900, 0.04, 'triangle', 0.08]],
  splash: [[300, 0.15, 'sine', 0.14]],
  boom: [[90, 0.3, 'sawtooth', 0.2], [60, 0.3, 'sine', 0.2, 0.05]],
};

export function play(name) {
  if (!store.settings.sound) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    for (const [freq, dur, type, vol, delay = 0] of SOUNDS[name] ?? SOUNDS.click) {
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  } catch {
    /* kein Ton möglich */
  }
}

export function buzz() {
  if (store.settings.vibrate) navigator.vibrate?.(60);
}
