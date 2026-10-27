// Web Audio API Synthesizer for Geometry Dash Extreme Demon RNG

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      } catch (e) {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        this.ctx.resume().catch(() => {});
      } catch (e) {}
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  // Quick tick for ticker spin cards
  public playTickerTick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  }

  // Quick crisp click for button press
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  // Spin Whoosh sound
  public playRollWhoosh() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  // Common pull chime
  public playCommonChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(554.37, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  // Rare / Extended pull
  public playRareChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
    });
  }

  // Top 150 Warning Siren & Heavy Slam
  public playTop150Slam() {
    const ctx = this.getContext();
    if (!ctx) return;

    const siren = ctx.createOscillator();
    const sGain = ctx.createGain();
    siren.type = 'sawtooth';
    siren.frequency.setValueAtTime(400, ctx.currentTime);
    siren.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.25);
    siren.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.5);

    sGain.gain.setValueAtTime(0.2, ctx.currentTime);
    sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    siren.connect(sGain);
    sGain.connect(ctx.destination);
    siren.start();
    siren.stop(ctx.currentTime + 0.6);

    setTimeout(() => {
      const c = this.getContext();
      if (!c) return;
      const sub = c.createOscillator();
      const subGain = c.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(150, c.currentTime);
      sub.frequency.exponentialRampToValueAtTime(35, c.currentTime + 0.6);

      subGain.gain.setValueAtTime(0.5, c.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
      sub.connect(subGain);
      subGain.connect(c.destination);
      sub.start();
      sub.stop(c.currentTime + 0.7);
    }, 250);
  }

  // Top 10 Expanded Cinematic Audio Experience (~4.8 seconds)
  public playTop10Cinematic() {
    const ctx = this.getContext();
    if (!ctx) return;

    // 1. Accelerating Heartbeat Pulses (0s to 4.5s)
    const pulseTimes = [0, 0.7, 1.4, 2.0, 2.5, 2.9, 3.3, 3.65, 3.95, 4.2, 4.4, 4.55];
    pulseTimes.forEach((timeOffset, idx) => {
      setTimeout(() => {
        const c = this.getContext();
        if (!c) return;
        const sub = c.createOscillator();
        const subGain = c.createGain();
        sub.type = 'sine';
        const startFreq = 75 + (idx * 3.5);
        sub.frequency.setValueAtTime(startFreq, c.currentTime);
        sub.frequency.exponentialRampToValueAtTime(24, c.currentTime + 0.3);

        const intensity = 0.35 + (idx * 0.025);
        subGain.gain.setValueAtTime(Math.min(intensity, 0.65), c.currentTime);
        subGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
        sub.connect(subGain);
        subGain.connect(c.destination);
        sub.start();
        sub.stop(c.currentTime + 0.3);
      }, timeOffset * 1000);
    });

    // 2. Cosmic Tension Riser (Starts at 1.8s up to 4.7s)
    setTimeout(() => {
      const c = this.getContext();
      if (!c) return;
      const riser = c.createOscillator();
      const rGain = c.createGain();
      riser.type = 'sawtooth';
      riser.frequency.setValueAtTime(110, c.currentTime);
      riser.frequency.exponentialRampToValueAtTime(740, c.currentTime + 2.8);

      rGain.gain.setValueAtTime(0.02, c.currentTime);
      rGain.gain.linearRampToValueAtTime(0.25, c.currentTime + 2.7);
      rGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.9);

      riser.connect(rGain);
      rGain.connect(c.destination);
      riser.start();
      riser.stop(c.currentTime + 2.9);
    }, 1800);

    // 3. Dimensional Alarm Beeps at 1.0s, 2.2s, 3.4s
    [1000, 2200, 3400].forEach((ms, i) => {
      setTimeout(() => {
        const c = this.getContext();
        if (!c) return;
        const ping = c.createOscillator();
        const pGain = c.createGain();
        ping.type = 'sine';
        ping.frequency.setValueAtTime(880 + (i * 220), c.currentTime);
        pGain.gain.setValueAtTime(0.08, c.currentTime);
        pGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
        ping.connect(pGain);
        pGain.connect(c.destination);
        ping.start();
        ping.stop(c.currentTime + 0.2);
      }, ms);
    });

    // 4. Climax Drop at 4.75s: Massive Sub & Majestic Power Chord
    setTimeout(() => {
      const c = this.getContext();
      if (!c) return;

      // Heavy Sub Drop
      const sub = c.createOscillator();
      const sGain = c.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(180, c.currentTime);
      sub.frequency.exponentialRampToValueAtTime(26, c.currentTime + 1.2);
      sGain.gain.setValueAtTime(0.65, c.currentTime);
      sGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.4);
      sub.connect(sGain);
      sGain.connect(c.destination);
      sub.start();
      sub.stop(c.currentTime + 1.4);

      // Majestic Chord
      [146.83, 174.61, 220.0, 261.63, 349.23, 523.25].forEach((freq) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, c.currentTime);
        gain.gain.setValueAtTime(0.14, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.8);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + 1.8);
      });
    }, 4750);
  }

  // Top 1 GRIEF - Apocalyptic Bass Drop
  public playGriefCinematic() {
    const ctx = this.getContext();
    if (!ctx) return;

    const rumble = ctx.createOscillator();
    const rGain = ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(45, ctx.currentTime);
    rumble.frequency.linearRampToValueAtTime(90, ctx.currentTime + 2.0);

    rGain.gain.setValueAtTime(0.1, ctx.currentTime);
    rGain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 2.0);
    rumble.connect(rGain);
    rGain.connect(ctx.destination);
    rumble.start();
    rumble.stop(ctx.currentTime + 2.0);

    setTimeout(() => {
      const c = this.getContext();
      if (!c) return;
      const sub = c.createOscillator();
      const subGain = c.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(200, c.currentTime);
      sub.frequency.exponentialRampToValueAtTime(20, c.currentTime + 1.8);

      subGain.gain.setValueAtTime(0.8, c.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.0);
      sub.connect(subGain);
      subGain.connect(c.destination);
      sub.start();
      sub.stop(c.currentTime + 2.0);

      [220, 277.18, 329.63, 440, 554.37].forEach((f) => {
        const tOsc = c.createOscillator();
        const tGain = c.createGain();
        tOsc.type = 'triangle';
        tOsc.frequency.setValueAtTime(f, c.currentTime);
        tGain.gain.setValueAtTime(0.2, c.currentTime);
        tGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.5);
        tOsc.connect(tGain);
        tGain.connect(c.destination);
        tOsc.start();
        tOsc.stop(c.currentTime + 2.5);
      });
    }, 2100);
  }
}

export const sound = new SoundEngine();
