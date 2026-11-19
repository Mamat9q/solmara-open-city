// SOLMARA sound: every effect is synthesised with WebAudio, so the game
// ships no audio files and makes no network request. All calls are safe
// before the first user gesture — the context simply stays suspended.

export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = 0;
    this.muted = false;
  }

  unlock() {
    try {
      if (!this.context) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        this.context = new Ctor();
        this.master = this.context.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') {
        const resumed = this.context.resume();
        if (resumed && resumed.catch) resumed.catch(() => {});
      }
    } catch {
      this.context = null;
    }
  }

  ready() {
    return !!this.context && this.context.state === 'running' && !this.muted;
  }

  blip(frequency, duration, type = 'sine', volume = 0.25) {
    if (!this.ready()) return;
    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      osc.stop(this.context.currentTime + duration);
    } catch {
      // Sound is garnish; a failed blip never stops the game.
    }
  }

  noiseBurst(duration, filterFrequency, volume = 0.4) {
    if (!this.ready()) return;
    try {
      const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFrequency;
      const gain = this.context.createGain();
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start();
    } catch {
      // Sound is garnish; a failed burst never stops the game.
    }
  }

  gunshot() {
    this.noiseBurst(0.14, 1800, 0.5);
    this.blip(160, 0.08, 'square', 0.15);
  }

  pickup() {
    this.blip(660, 0.09);
    setTimeout(() => this.blip(990, 0.12), 70);
  }

  cash() {
    this.blip(880, 0.08);
    setTimeout(() => this.blip(1174, 0.14), 80);
  }

  thunder() {
    this.noiseBurst(1.6, 220, 0.5);
  }

  setEngine(speedFraction) {
    if (!this.ready()) return;
    try {
      if (!this.engineOsc) {
        this.engineOsc = this.context.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineGain = this.context.createGain();
        this.engineGain.gain.value = 0;
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc.start();
      }
      this.engineOsc.frequency.value = 55 + speedFraction * 130;
      this.engineGain.gain.value = speedFraction > 0.02 ? 0.05 + speedFraction * 0.05 : 0;
    } catch {
      // Engine hum is optional.
    }
  }

  setSiren(on, time) {
    if (!this.ready()) {
      if (this.sirenGain) this.sirenGain.gain.value = 0;
      return;
    }
    try {
      if (!this.sirenOsc) {
        this.sirenOsc = this.context.createOscillator();
        this.sirenOsc.type = 'triangle';
        this.sirenGain = this.context.createGain();
        this.sirenGain.gain.value = 0;
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.master);
        this.sirenOsc.start();
      }
      this.sirenGain.gain.value = on ? 0.045 : 0;
      if (on) this.sirenOsc.frequency.value = Math.sin(time * 2.4) > 0 ? 780 : 580;
    } catch {
      // Sirens are optional.
    }
  }
}
