// Sound: 3 synth radio stations (WebAudio oscillators, no audio files), engine
// hum, sirens, gunshots and UI blips. Everything is guarded: audio starts only
// after a user gesture, and silence is fine when the context is unavailable.

import { RADIO } from './config.js';

export function createAudio(G) {
  let ctx = null;
  let master = null;
  let radioGain = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let stationIndex = 0;
  let radioTimer = null;
  let step = 0;
  let started = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      radioGain = ctx.createGain();
      radioGain.gain.value = 0.16;
      radioGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function note(freq, dur, type, gain, when = 0) {
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, ctx.currentTime + when);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
      o.connect(g);
      g.connect(radioGain);
      o.start(ctx.currentTime + when);
      o.stop(ctx.currentTime + when + dur + 0.05);
    } catch { /* sound is decoration */ }
  }

  function noiseBurst(dur, gain, filterFreq = 1200) {
    if (!ctx) return;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start();
    } catch { /* sound is decoration */ }
  }

  /** One sequencer tick for the current station: bass + lead + hat. */
  function radioTick() {
    if (!ctx) return;
    const st = RADIO[stationIndex];
    const beat = 60 / st.bpm / 2;
    const scale = st.scale;
    const root = st.root;
    const seq = [0, 2, 1, 3, 0, 2, 4, 1];
    const deg = scale[seq[step % 8] % scale.length];
    const bass = root * Math.pow(2, deg / 12);
    const lead = root * 4 * Math.pow(2, scale[(step * 3 + 1) % scale.length] / 12);
    note(bass, beat * 1.8, st.wave, 0.5);
    if (step % 2 === 0) note(lead, beat * 0.9, 'sine', 0.16);
    if (step % 2 === 1) noiseBurst(0.03, 0.1, 6000);
    step += 1;
  }

  function startRadio() {
    if (!ctx || radioTimer) return;
    const st = RADIO[stationIndex];
    radioTimer = setInterval(radioTick, (60 / st.bpm / 2) * 1000);
  }

  return {
    stationName() { return RADIO[stationIndex].name; },
    /** Call on the first user gesture; safe to call repeatedly. */
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!started) {
        started = true;
        startRadio();
      }
    },
    cycleStation() {
      stationIndex = (stationIndex + 1) % RADIO.length;
      step = 0;
      if (radioTimer) { clearInterval(radioTimer); radioTimer = null; }
      startRadio();
      G.hud.toast(`Radio: ${RADIO[stationIndex].name} — ${RADIO[stationIndex].tag}`);
    },
    setStation(i) { stationIndex = i % RADIO.length; },
    engine(speed01, on) {
      if (!ctx) return;
      try {
        engineGain.gain.value = on ? 0.02 + speed01 * 0.05 : 0;
        engineOsc.frequency.value = 50 + speed01 * 130;
      } catch { /* ignore */ }
    },
    siren(on) {
      if (!ctx) return;
      try {
        sirenGain.gain.value = on ? 0.045 : 0;
        if (on) {
          const t = ctx.currentTime;
          sirenOsc.frequency.cancelScheduledValues(t);
          sirenOsc.frequency.setValueAtTime(700, t);
          sirenOsc.frequency.linearRampToValueAtTime(950, t + 0.5);
          sirenOsc.frequency.linearRampToValueAtTime(700, t + 1.0);
        }
      } catch { /* ignore */ }
    },
    gunshot(kind) {
      noiseBurst(kind === 'Shotgun' ? 0.28 : 0.12, kind === 'Shotgun' ? 0.5 : 0.3, kind === 'Shotgun' ? 900 : 1800);
    },
    thud() { noiseBurst(0.2, 0.4, 300); },
    click() { note(880, 0.06, 'square', 0.12); },
    pickup() { note(660, 0.12, 'sine', 0.2); note(990, 0.18, 'sine', 0.2, 0.08); },
    thunder() { noiseBurst(1.2, 0.25, 220); },
    fanfare() {
      note(523, 0.15, 'triangle', 0.25);
      note(659, 0.15, 'triangle', 0.25, 0.12);
      note(784, 0.3, 'triangle', 0.3, 0.24);
    },
  };
}
