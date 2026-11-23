// Sound, all synthesised live with WebAudio — no audio files. Three radio
// stations (scheduled note patterns), an engine hum that follows speed, a
// two-tone siren that follows the wanted level, and one-shot effects for shots,
// hits, pickups, crashes and mission completions. Everything is guarded: no
// AudioContext exists until the first user gesture, and a missing one is silent.
import { RADIO } from './config.js';

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    station: 0,
    radioGain: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    nextNote: 0,
    noteIndex: 0,
    started: false,
  };

  function ensure() {
    if (audio.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
      audio.radioGain = audio.ctx.createGain();
      audio.radioGain.gain.value = 0.16;
      audio.radioGain.connect(audio.master);
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      audio.engineOsc.connect(audio.engineGain);
      audio.engineGain.connect(audio.master);
      audio.engineOsc.start();
      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenOsc.type = 'sine';
      audio.sirenOsc.frequency.value = 700;
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenGain.gain.value = 0;
      audio.sirenOsc.connect(audio.sirenGain);
      audio.sirenGain.connect(audio.master);
      audio.sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  audio.stationName = () => `${RADIO[audio.station].name} · ${RADIO[audio.station].desc}`;

  audio.start = () => {
    if (!ensure()) return;
    if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
    audio.started = true;
  };

  audio.cycleRadio = () => {
    audio.station = (audio.station + 1) % RADIO.length;
    audio.noteIndex = 0;
    return audio.stationName();
  };

  function note(freq, when, dur, type, gain) {
    if (!audio.ctx) return;
    const o = audio.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = audio.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(audio.radioGain);
    o.start(when); o.stop(when + dur + 0.05);
  }

  /** Schedule the current station's pattern ahead of the playhead. */
  audio.updateRadio = (dt) => {
    if (!audio.ctx || !audio.started) return;
    const st = RADIO[audio.station];
    const beat = 60 / st.bpm / 2;
    while (audio.nextNote < audio.ctx.currentTime + 0.25) {
      if (audio.nextNote < audio.ctx.currentTime) audio.nextNote = audio.ctx.currentTime + 0.05;
      const step = audio.noteIndex % 16;
      const scale = st.minor ? [0, 3, 5, 7, 10, 12] : [0, 2, 4, 7, 9, 12];
      const degree = [0, 2, 1, 3, 0, 4, 2, 5, 0, 3, 1, 4, 2, 5, 3, 0][step];
      const freq = st.root * Math.pow(2, scale[degree % scale.length] / 12) * (step % 8 === 0 ? 1 : 2);
      if (audio.station === 0) {
        note(freq, audio.nextNote, beat * 1.8, 'square', 0.5);
        if (step % 4 === 0) note(st.root / 2, audio.nextNote, beat * 3, 'sawtooth', 0.7);
      } else if (audio.station === 1) {
        if (step % 2 === 0) note(st.root * (step % 8 === 0 ? 1 : 0.5), audio.nextNote, beat * 2, 'sawtooth', 0.9);
        if (step % 4 === 2) note(freq * 2, audio.nextNote, beat, 'square', 0.25);
      } else {
        if (step % 4 === 0) note(freq, audio.nextNote, beat * 6, 'sine', 0.6);
        if (step % 8 === 4) note(freq * 1.5, audio.nextNote, beat * 4, 'sine', 0.3);
      }
      audio.nextNote += beat;
      audio.noteIndex += 1;
    }
  };

  audio.updateEngine = (speedKmh, inCar) => {
    if (!audio.ctx || !audio.started) return;
    const t = audio.ctx.currentTime;
    audio.engineGain.gain.setTargetAtTime(inCar ? 0.05 + Math.min(0.09, speedKmh / 1800) : 0, t, 0.1);
    audio.engineOsc.frequency.setTargetAtTime(48 + speedKmh * 1.1, t, 0.1);
  };

  audio.updateSiren = (wanted) => {
    if (!audio.ctx || !audio.started) return;
    const t = audio.ctx.currentTime;
    audio.sirenGain.gain.setTargetAtTime(wanted > 0 ? 0.05 : 0, t, 0.2);
    if (wanted > 0) {
      audio.sirenOsc.frequency.setTargetAtTime(Math.sin(t * 2.4) > 0 ? 720 : 540, t, 0.05);
    }
  };

  function blip(freq, dur, type, gain) {
    if (!audio.ctx || !audio.started) return;
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    const g = audio.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audio.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, gain, freq) {
    if (!audio.ctx || !audio.started) return;
    const t = audio.ctx.currentTime;
    const len = Math.floor(audio.ctx.sampleRate * dur);
    const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buf;
    const f = audio.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq;
    const g = audio.ctx.createGain();
    g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(audio.master);
    src.start(t);
  }

  audio.sfx = (name) => {
    if (!audio.ctx || !audio.started) return;
    if (name === 'shot') noise(0.12, 0.5, 1800);
    else if (name === 'empty') blip(180, 0.08, 'square', 0.25);
    else if (name === 'hit') blip(120, 0.15, 'sawtooth', 0.4);
    else if (name === 'pickup') { blip(660, 0.1, 'sine', 0.35); setTimeout(() => blip(990, 0.12, 'sine', 0.35), 70); }
    else if (name === 'mission') { blip(523, 0.15, 'sine', 0.4); setTimeout(() => blip(659, 0.15, 'sine', 0.4), 120); setTimeout(() => blip(784, 0.3, 'sine', 0.4), 240); }
    else if (name === 'crash') noise(0.3, 0.6, 500);
    else if (name === 'horn') blip(370, 0.25, 'square', 0.3);
  };

  return audio;
}
