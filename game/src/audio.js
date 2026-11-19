// Procedural audio: engine hum, sirens, gunshots and UI blips, all synthesized
// with WebAudio — no audio files, no network. The context is created lazily on
// the first user gesture; every method is a no-op until then, so headless runs
// (and browsers that block autoplay) never throw.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  function tone(freq, dur, type, vol, when = 0) {
    if (!ensure() || muted) return;
    try {
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {}
  }

  const audio = {
    unlock,
    get ready() {
      return ctx !== null;
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.35;
    },
    blip() {
      tone(880, 0.08, 'sine', 0.15);
    },
    error() {
      tone(180, 0.15, 'square', 0.12);
    },
    cash() {
      tone(1320, 0.1, 'sine', 0.18);
      tone(1760, 0.16, 'sine', 0.18, 0.09);
    },
    shot() {
      tone(220, 0.09, 'sawtooth', 0.3);
      tone(90, 0.12, 'square', 0.25);
    },
    setEngine(speed01, on) {
      if (!ensure() || muted) return;
      try {
        if (on && !engineOsc) {
          engineOsc = ctx.createOscillator();
          engineGain = ctx.createGain();
          engineOsc.type = 'sawtooth';
          engineOsc.frequency.value = 55;
          engineGain.gain.value = 0.0;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 420;
          engineOsc.connect(filter);
          filter.connect(engineGain);
          engineGain.connect(master);
          engineOsc.start();
        }
        if (!engineOsc) return;
        if (!on) {
          engineGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.1);
          return;
        }
        engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.08);
        engineGain.gain.setTargetAtTime(0.05 + speed01 * 0.06, ctx.currentTime, 0.08);
      } catch {}
    },
    setSiren(on) {
      if (!ensure() || muted) return;
      try {
        if (on && !sirenOsc) {
          sirenOsc = ctx.createOscillator();
          sirenGain = ctx.createGain();
          sirenOsc.type = 'triangle';
          sirenOsc.frequency.value = 700;
          sirenGain.gain.value = 0.0;
          sirenOsc.connect(sirenGain);
          sirenGain.connect(master);
          sirenOsc.start();
          let high = false;
          sirenTimer = window.setInterval(() => {
            if (!sirenOsc) return;
            high = !high;
            sirenOsc.frequency.setTargetAtTime(high ? 950 : 650, ctx.currentTime, 0.05);
          }, 450);
          sirenGain.gain.setTargetAtTime(0.045, ctx.currentTime, 0.2);
        } else if (!on && sirenOsc) {
          window.clearInterval(sirenTimer);
          sirenTimer = null;
          const osc = sirenOsc;
          const g = sirenGain;
          sirenOsc = null;
          sirenGain = null;
          g.gain.setTargetAtTime(0.0, ctx.currentTime, 0.15);
          window.setTimeout(() => {
            try { osc.stop(); } catch {}
          }, 600);
        }
      } catch {}
    },
  };
  return audio;
}
