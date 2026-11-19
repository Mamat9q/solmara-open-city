// Procedural WebAudio: engine hum, sirens, gunshots and cash blips, all
// synthesized — no audio files. Everything is guarded: no AudioContext is
// created until the first user gesture, and every call is a safe no-op when
// audio is unavailable (headless playtests included).
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      const g = this.ctx.createGain();
      g.gain.value = 0.0;
      g.connect(this.ctx.destination);
      this.engineGain = g;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 55;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 320;
      osc.connect(filt);
      filt.connect(g);
      osc.start();
      this.engineOsc = osc;
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  setEngine(speed01, on) {
    if (!this.ctx || !this.engineGain || !this.engineOsc) return;
    try {
      this.engineGain.gain.setTargetAtTime(on ? 0.05 + 0.05 * speed01 : 0.0, this.ctx.currentTime, 0.1);
      this.engineOsc.frequency.setTargetAtTime(50 + 90 * speed01, this.ctx.currentTime, 0.1);
    } catch { /* audio is best-effort */ }
  }

  setSiren(on) {
    if (!this.ctx) return;
    try {
      if (on && !this.sirenOsc) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 700;
        const g = this.ctx.createGain();
        g.gain.value = 0.03;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.7;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 280;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start();
        lfo.start();
        this.sirenOsc = osc;
        this.sirenGain = g;
      } else if (!on && this.sirenOsc) {
        const osc = this.sirenOsc;
        const g = this.sirenGain;
        this.sirenOsc = null;
        this.sirenGain = null;
        g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        setTimeout(() => { try { osc.stop(); } catch { /* already stopped */ } }, 400);
      }
    } catch { /* audio is best-effort */ }
  }

  blip(freq, seconds, type, volume) {
    if (!this.ctx || this.muted) return;
    try {
      const osc = this.ctx.createOscillator();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(volume || 0.08, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (seconds || 0.12));
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + (seconds || 0.12));
    } catch { /* audio is best-effort */ }
  }

  shot() {
    if (!this.ctx || this.muted) return;
    try {
      const dur = 0.14;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.25;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'highpass';
      filt.frequency.value = 900;
      src.connect(filt);
      filt.connect(g);
      g.connect(this.ctx.destination);
      src.start();
    } catch { /* audio is best-effort */ }
  }

  cash() {
    this.blip(880, 0.09, 'sine', 0.1);
    setTimeout(() => this.blip(1320, 0.14, 'sine', 0.1), 90);
  }

  sting() {
    this.blip(523, 0.16, 'triangle', 0.12);
    setTimeout(() => this.blip(659, 0.16, 'triangle', 0.12), 140);
    setTimeout(() => this.blip(784, 0.28, 'triangle', 0.12), 280);
  }
}
