// Lightweight procedural Web Audio system.
// No sound files are required; tones are synthesized at runtime.
class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  enabled = true;

  init() {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;
      this.ctx = new AudioCtor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.28;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(enabled ? 0.28 : 0, this.ctx.currentTime, 0.02);
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol = 1, slideToFreq?: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideToFreq), now + duration);
    }

    gain.gain.setValueAtTime(Math.max(0.001, vol), now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  playClick() {
    this.playTone(520, 'sine', 0.045, 0.16, 700);
  }

  playScore(multiplier = 1) {
    this.playTone(760 + Math.min(500, multiplier * 30), 'square', 0.07, 0.13);
  }

  playCollect() {
    this.playTone(620, 'triangle', 0.07, 0.18, 980);
  }

  playLevelUp() {
    this.playTone(520, 'triangle', 0.09, 0.2, 780);
    window.setTimeout(() => this.playTone(780, 'triangle', 0.13, 0.2, 1180), 70);
  }

  playGameOver() {
    this.playTone(180, 'sawtooth', 0.28, 0.28, 65);
  }

  playStart() {
    this.playTone(330, 'triangle', 0.08, 0.16, 520);
    window.setTimeout(() => this.playTone(520, 'triangle', 0.1, 0.16, 780), 75);
  }

  playTether() { this.playTone(600, 'sine', 0.1, 0.4, 800); }
  playLaunch() { this.playTone(400, 'triangle', 0.3, 0.5, 200); }
  playCrash() { this.playTone(150, 'sawtooth', 0.5, 0.6, 50); }
}

export const audio = new AudioSystem();
