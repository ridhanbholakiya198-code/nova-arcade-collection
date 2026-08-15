// Nova Arcade retro audio system — built to sound like an actual 8-bit
// console sound chip (2 pulse channels + a noise channel) instead of a
// single thin sine/square beep. No background music, no external audio
// files — everything below is synthesized in real time with Web Audio.
class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  enabled = true;
  private lastToneAt = 0;
  private lastScoreAt = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private dutyWaves = new Map<number, PeriodicWave>();

  init() {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;
      this.ctx = new AudioCtor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.enabled ? 0.28 : 0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(enabled ? 0.28 : 0, this.ctx.currentTime, 0.02);
    }
  }

  // Builds a band-limited pulse wave with a given duty cycle (0-1), the way
  // the NES 2A03's pulse channels work (12.5% / 25% / 50% duty options).
  // This is what gives chiptune leads their characteristic "hollow" crunch
  // instead of the soft, flat sound of a default Web Audio square wave.
  private getDutyWave(duty: number): PeriodicWave {
    const key = Math.round(duty * 100);
    const cached = this.dutyWaves.get(key);
    if (cached) return cached;
    const ctx = this.ctx!;
    const harmonics = 24;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    for (let n = 1; n < harmonics; n++) {
      real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    }
    const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    this.dutyWaves.set(key, wave);
    return wave;
  }

  private getNoiseBuffer(): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const ctx = this.ctx!;
    const length = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Simple LFSR-style stepped noise reads closer to an NES noise channel
    // than pure white noise — it has a grittier, more "8-bit" texture.
    let reg = 1;
    for (let i = 0; i < length; i++) {
      const bit = ((reg >> 0) ^ (reg >> 1)) & 1;
      reg = (reg >> 1) | (bit << 14);
      data[i] = (reg & 1) ? 0.9 : -0.9;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  // Core pulse-channel voice. `duty` picks the timbre: 0.5 = round/full,
  // 0.25 = classic lead, 0.125 = thin/bright (menu blips, coins).
  private pulse(freq: number, duration: number, vol: number, opts: {
    duty?: number;
    slideToFreq?: number;
    delaySec?: number;
    attack?: number;
  } = {}) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + (opts.delaySec ?? 0);
    const attack = opts.attack ?? Math.min(0.006, duration * 0.15);

    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.getDutyWave(opts.duty ?? 0.25));
    osc.frequency.setValueAtTime(Math.max(30, freq), start);
    if (opts.slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.slideToFreq), start + duration);
    }

    const gain = ctx.createGain();
    const peak = Math.max(0.001, Math.min(0.5, vol));
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  // Filtered noise burst — used for hits/crashes/impact, exactly like the
  // NES noise channel driving drum/explosion sounds.
  private noiseHit(duration: number, vol: number, opts: { startFreq?: number; endFreq?: number; delaySec?: number } = {}) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + (opts.delaySec ?? 0);

    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer();
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(opts.startFreq ?? 1400, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, opts.endFreq ?? 120), start + duration);

    const gain = ctx.createGain();
    const peak = Math.max(0.001, Math.min(0.5, vol));
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  // ---- Public engine callback (used by all 19 game canvases) ----
  // Kept API-compatible with every game engine's playTone() calls, but the
  // underlying tone is now a proper duty-cycle pulse (or filtered noise for
  // 'sawtooth', which engines already use for "impact" moments).
  playTone(freq: number, type: OscillatorType, duration: number, vol = 1, slideToFreq?: number) {
    const nowMs = performance.now();
    if (nowMs - this.lastToneAt < 45) return;
    this.lastToneAt = nowMs;

    const clampedDur = Math.min(0.16, duration);
    const clampedVol = Math.min(vol, 0.22);

    if (type === 'sawtooth') {
      this.noiseHit(clampedDur, clampedVol, { startFreq: freq * 4, endFreq: freq });
      return;
    }
    const duty = type === 'square' ? 0.25 : 0.5;
    this.pulse(freq, clampedDur, clampedVol, { duty, slideToFreq });
  }

  // Classic short arcade navigation blip — bright, thin, instantly
  // recognizable, tuned to feel like scrolling through a cartridge menu.
  playClick() {
    const now = performance.now();
    if (now - this.lastToneAt < 40) return;
    this.lastToneAt = now;
    this.pulse(1180, 0.045, 0.16, { duty: 0.125, slideToFreq: 1560 });
  }

  // Softer tick used while swiping through the game carousel — quieter and
  // shorter than the menu click so it doesn't get fatiguing on fast swipes.
  playScroll() {
    const now = performance.now();
    if (now - this.lastToneAt < 55) return;
    this.lastToneAt = now;
    this.pulse(920, 0.03, 0.1, { duty: 0.125, slideToFreq: 1080 });
  }

  playScore(multiplier = 1) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastScoreAt < 90) return;
    this.lastScoreAt = now;
    const f = 760 + Math.min(500, multiplier * 26);
    this.pulse(f, 0.05, 0.16, { duty: 0.25, slideToFreq: f * 1.3 });
  }

  playCollect() {
    this.pulse(920, 0.05, 0.18, { duty: 0.125, slideToFreq: 1460 });
    this.pulse(1460, 0.05, 0.1, { duty: 0.25, delaySec: 0.045 });
  }

  playLevelUp() {
    if (!this.enabled) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.pulse(f, 0.09, 0.16, { duty: 0.25, delaySec: i * 0.06 }));
  }

  playGameOver() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this.pulse(f, 0.14, 0.16, { duty: 0.5, delaySec: i * 0.09 }));
    this.noiseHit(0.3, 0.14, { startFreq: 900, endFreq: 90, delaySec: 0.32 });
  }

  playStart() {
    this.pulse(392, 0.06, 0.16, { duty: 0.25, slideToFreq: 523 });
    this.pulse(523, 0.06, 0.16, { duty: 0.25, slideToFreq: 784, delaySec: 0.075 });
    this.pulse(784, 0.09, 0.17, { duty: 0.25, delaySec: 0.15 });
  }

  playTether() { this.pulse(560, 0.07, 0.17, { duty: 0.25, slideToFreq: 780 }); }
  playLaunch() { this.pulse(480, 0.11, 0.18, { duty: 0.25, slideToFreq: 900 }); }

  playCrash() {
    this.noiseHit(0.22, 0.22, { startFreq: 1600, endFreq: 100 });
    this.pulse(160, 0.14, 0.16, { duty: 0.5, slideToFreq: 55 });
  }
}

export const audio = new AudioSystem();
