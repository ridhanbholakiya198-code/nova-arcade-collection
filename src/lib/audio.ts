// Nova Arcade retro audio system.
// No background music. Gameplay SFX are short, punchy and rate-limited.
class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  enabled = true;
  private lastToneAt = 0;
  private lastScoreAt = 0;

  init() {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;
      this.ctx = new AudioCtor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.20;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(enabled ? 0.20 : 0, this.ctx.currentTime, 0.02);
    }
  }

  private tone(freq: number, type: OscillatorType, duration: number, vol = 1, slideToFreq?: number, force = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const nowMs = performance.now();
    if (!force && nowMs - this.lastToneAt < 58) return;
    this.lastToneAt = nowMs;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freq), now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideToFreq), now + duration);
    }

    const peak = Math.max(0.001, Math.min(0.18, vol));
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + Math.min(0.008, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // Public engine callback. This is deliberately rate-limited so games cannot
  // become an annoying wall of repeated tones.
  playTone(freq: number, type: OscillatorType, duration: number, vol = 1, slideToFreq?: number) {
    this.tone(freq, type, Math.min(0.11, duration), Math.min(vol, 0.14), slideToFreq);
  }

  // Classic short arcade navigation blip.
  playClick() {
    this.tone(740, 'square', 0.045, 0.10, 980, true);
  }

  playScore(multiplier = 1) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastScoreAt < 95) return;
    this.lastScoreAt = now;
    const f = 680 + Math.min(420, multiplier * 24);
    this.tone(f, 'square', 0.055, 0.095, f * 1.25, true);
  }

  playCollect() {
    this.tone(880, 'square', 0.065, 0.11, 1180, true);
  }

  playLevelUp() {
    if (!this.enabled) return;
    this.tone(523, 'square', 0.07, 0.11, 784, true);
    window.setTimeout(() => this.tone(784, 'square', 0.09, 0.11, 1047, true), 75);
  }

  playGameOver() {
    this.tone(220, 'square', 0.12, 0.12, 110, true);
    window.setTimeout(() => this.tone(110, 'square', 0.14, 0.10, 70, true), 95);
  }

  playStart() {
    this.tone(392, 'square', 0.055, 0.10, 523, true);
    window.setTimeout(() => this.tone(523, 'square', 0.055, 0.10, 784, true), 70);
  }

  playTether() { this.tone(560, 'square', 0.075, 0.11, 760); }
  playLaunch() { this.tone(480, 'square', 0.10, 0.11, 760); }
  playCrash() { this.tone(180, 'square', 0.13, 0.12, 70, true); }
}

export const audio = new AudioSystem();
