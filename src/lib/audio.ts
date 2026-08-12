// Simple Web Audio API synthesizer for retro/premium arcade sounds
// Instantiated lazily on first interaction to comply with browser autoplay policies

class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Default master volume
    this.masterGain.connect(this.ctx.destination);
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol = 1, slideToFreq?: number) {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playTether() {
    this.playTone(600, 'sine', 0.1, 0.4, 800);
  }

  playLaunch() {
    this.playTone(400, 'triangle', 0.3, 0.5, 200);
  }

  playScore() {
    this.playTone(880, 'square', 0.1, 0.2);
  }

  playCrash() {
    this.playTone(150, 'sawtooth', 0.5, 0.6, 50);
  }
}

export const audio = new AudioSystem();
