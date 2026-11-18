// Synthesized WebAudio sounds only: no audio files, no network. Engine hum,
// siren, gunshot, pickup chime, UI clicks and a simple synth music loop.
export function createAudio() {
  let ctx = null, master = null, musicTimer = null, musicOn = false;
  let engineOsc = null, engineGain = null;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      return true;
    } catch { return false; }
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, filterFreq) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }
  return {
    unlock() { ensure(); },
    click() { tone(660, 0.06, 'square', 0.12); },
    gunshot() { noise(0.14, 0.5, 2600); tone(150, 0.1, 'square', 0.25, 50); },
    enemyShot() { noise(0.1, 0.22, 1800); },
    pickup() { tone(880, 0.09, 'sine', 0.2); setTimeout(() => tone(1320, 0.14, 'sine', 0.2), 90); },
    cash() { tone(988, 0.1, 'triangle', 0.22); setTimeout(() => tone(1319, 0.18, 'triangle', 0.22), 110); },
    crash() { noise(0.3, 0.45, 500); tone(90, 0.25, 'sawtooth', 0.2, 40); },
    sirenBlip() { tone(700, 0.35, 'sine', 0.12, 1100); },
    hurt() { tone(220, 0.18, 'sawtooth', 0.25, 110); },
    busted() { tone(440, 0.3, 'square', 0.2, 330); tone(330, 0.4, 'square', 0.2, 220); },
    missionDone() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.22), i * 110)); },
    startEngine(speed01) {
      if (!ensure()) return;
      if (!engineOsc) {
        engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain(); engineGain.gain.value = 0.0;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
        engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master); engineOsc.start();
      }
      engineOsc.frequency.value = 55 + speed01 * 140;
      engineGain.gain.value = 0.05 + speed01 * 0.06;
    },
    stopEngine() { if (engineGain) engineGain.gain.value = 0; },
    // Looping bass + hats pattern: a laid-back coastal groove in A minor.
    startMusic() {
      if (musicOn || !ensure()) return; musicOn = true;
      // Keep the groove quiet under the engine and gunfire.
      if (master) master.gain.value = 0.3;
      const bass = [55, 0, 55, 0, 65.4, 0, 49, 0, 55, 0, 55, 0, 82.4, 0, 73.4, 0];
      let step = 0;
      musicTimer = setInterval(() => {
        if (!ctx) return;
        const b = bass[step % bass.length];
        if (b) tone(b, 0.22, 'triangle', 0.14);
        if (step % 4 === 2) tone(1200 + Math.random() * 400, 0.03, 'square', 0.03);
        if (step % 8 === 0) tone(220, 0.3, 'sine', 0.07, 110);
        step++;
      }, 190);
    },
    stopMusic() { musicOn = false; if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
  };
}
