// Procedural WebAudio: engine hum, sirens, gunshots and cash. Everything is
// guarded so the game plays fine with no audio device (headless included).
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
    this.enabled = true;
  }

  ensure() {
    if (this.ctx || !this.enabled) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 750;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setEngine(rpm) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(45 + rpm * 130, t, 0.08);
    this.engineGain.gain.setTargetAtTime(rpm > 0.02 ? 0.05 + rpm * 0.05 : 0, t, 0.1);
  }

  setSiren(on, time) {
    if (!this.ctx || !this.sirenOsc) return;
    this.sirenOn = on;
    const t = this.ctx.currentTime;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, t, 0.2);
    if (on) this.sirenOsc.frequency.setTargetAtTime(650 + 250 * Math.sin(time * 2.4), t, 0.05);
  }

  blip(freq, dur, type = 'square', vol = 0.12) {
    if (!this.ctx || !this.master) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g);
      g.connect(this.master);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.stop(this.ctx.currentTime + dur + 0.02);
    } catch {
      // A failed blip never stops the game.
    }
  }

  shot() {
    this.blip(180, 0.09, 'square', 0.16);
    this.blip(70, 0.14, 'sawtooth', 0.12);
  }

  cash() {
    this.blip(880, 0.09, 'sine', 0.1);
    setTimeout(() => this.blip(1320, 0.12, 'sine', 0.1), 70);
  }

  click() {
    this.blip(520, 0.05, 'sine', 0.08);
  }
}
