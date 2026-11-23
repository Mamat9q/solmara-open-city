// All sound is synthesized with WebAudio — no audio files. Three procedural
// radio stations (synthwave, chillwave, dark electro), an engine hum tied to
// speed, and one-shot effects: gunshots, sirens, pickups, crashes.
import { STATIONS } from './config.js';

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.station = 0;
    this.radioOn = true;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.nextNote = 0;
    this.step = 0;
    this.started = false;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    this.engineOsc.connect(lp);
    lp.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.value = 720;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    this.started = true;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setEngine(speedKmh, throttle) {
    if (!this.ctx) return;
    const rpm = 50 + Math.abs(speedKmh) * 2.4 + throttle * 22;
    this.engineOsc.frequency.setTargetAtTime(rpm, this.ctx.currentTime, 0.06);
    this.engineGain.gain.setTargetAtTime(0.015 + throttle * 0.03 + Math.abs(speedKmh) * 0.0004, this.ctx.currentTime, 0.1);
  }

  setSiren(on, wanted) {
    if (!this.ctx) return;
    this.sirenGain.gain.setTargetAtTime(on ? 0.02 + wanted * 0.004 : 0, this.ctx.currentTime, 0.2);
    if (on) this.sirenOsc.frequency.setTargetAtTime(680 + Math.sin(this.ctx.currentTime * 3) * 180, this.ctx.currentTime, 0.05);
  }

  cycleStation() {
    this.station = (this.station + 1) % STATIONS.length;
    this.step = 0;
    return STATIONS[this.station];
  }

  currentStation() {
    return STATIONS[this.station];
  }

  // Schedule one bar of the current station's loop (called each frame).
  update(dt) {
    if (!this.ctx || !this.radioOn || this.ctx.state !== 'running') return;
    const st = STATIONS[this.station];
    const spb = 60 / st.bpm / 2; // eighth notes
    while (this.nextNote < this.ctx.currentTime + 0.15) {
      if (this.nextNote < this.ctx.currentTime) this.nextNote = this.ctx.currentTime + 0.02;
      this.scheduleNote(st, this.step, this.nextNote, spb);
      this.nextNote += spb;
      this.step = (this.step + 1) % 32;
    }
  }

  scheduleNote(st, step, when, spb) {
    const bassNotes = [0, 0, 7, 0, 5, 0, 3, 7];
    const arpNotes = [0, 3, 7, 12, 7, 3, 10, 7];
    if (step % 4 === 0) {
      const semis = bassNotes[(step / 4) | 0];
      this.tone(st.root * Math.pow(2, semis / 12), when, spb * 3.6, 'triangle', 0.16);
    }
    if (step % 2 === 0) {
      const semis = arpNotes[(step / 2) % arpNotes.length] + 12;
      this.tone(st.root * 4 * Math.pow(2, semis / 12), when, spb * 0.9, 'square', 0.035);
    }
    if (step % 8 === 4) this.noise(when, 0.06, 0.05); // hat
  }

  tone(freq, when, dur, type, vol) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  noise(when, dur, vol) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    src.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    src.start(when);
  }

  shot() {
    if (!this.ctx) return;
    this.noise(this.ctx.currentTime, 0.14, 0.3);
  }

  pickup() {
    if (!this.ctx) return;
    this.tone(880, this.ctx.currentTime, 0.12, 'sine', 0.2);
    this.tone(1320, this.ctx.currentTime + 0.09, 0.16, 'sine', 0.2);
  }

  crash() {
    if (!this.ctx) return;
    this.noise(this.ctx.currentTime, 0.25, 0.35);
  }
}
