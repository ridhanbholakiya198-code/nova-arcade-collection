import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

type Vine = { x: number; length: number };

export class JungleSwingEngine implements GameEngine {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; callbacks: GameEngineCallbacks;
  w = 0; h = 0; frame = 0; last = 0; running = false; gameOver = false; score = 0;
  anchorY = 90; riverY = 0;
  vines: Vine[] = [];
  vineIndex = 0;
  state: 'swing' | 'air' = 'swing';
  amplitude = 0.9; phase = 0; omega = 1; tStart = 0; time = 0;
  px = 0; py = 0; vx = 0; vy = 0;
  camera = 0; nextSpawnX = 0;

  constructor(c: HTMLCanvasElement, cb: GameEngineCallbacks) {
    this.canvas = c; this.ctx = c.getContext('2d')!; this.callbacks = cb;
    this.resize(); window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.tap);
    this.reset();
  }
  resize = () => {
    this.w = innerWidth; this.h = innerHeight;
    this.canvas.width = this.w; this.canvas.height = this.h;
    this.anchorY = this.h * 0.14; this.riverY = this.h * 0.84;
  };
  reset = () => {
    this.score = 0; this.gameOver = false; this.time = 0;
    this.vines = [];
    let x = 130;
    for (let i = 0; i < 6; i++) {
      this.vines.push({ x, length: 150 + Math.random() * 60 });
      x += 195 + Math.random() * 55;
    }
    this.nextSpawnX = x;
    this.vineIndex = 0;
    this.beginSwing(this.vines[0], -0.8);
    this.camera = 0;
    this.last = performance.now();
  };
  beginSwing = (v: Vine, theta0: number) => {
    this.state = 'swing';
    this.amplitude = Math.max(0.35, Math.min(1.15, Math.abs(theta0)));
    this.phase = theta0 >= 0 ? 0 : Math.PI;
    this.omega = Math.sqrt(1000 / v.length);
    this.tStart = this.time;
  };
  tap = () => {
    if (this.gameOver || this.state !== 'swing') return;
    const v = this.vines[this.vineIndex];
    const t = this.time - this.tStart;
    const theta = this.amplitude * Math.cos(this.omega * t + this.phase);
    const dtheta = -this.amplitude * this.omega * Math.sin(this.omega * t + this.phase);
    this.px = v.x + v.length * Math.sin(theta);
    this.py = this.anchorY + v.length * Math.cos(theta);
    this.vx = dtheta * v.length * Math.cos(theta);
    this.vy = -dtheta * v.length * Math.sin(theta);
    this.state = 'air';
    this.callbacks.playTone(360, 'sawtooth', 0.08, 0.12, 900);
  };
  update = (dt: number) => {
    if (this.gameOver) return;
    this.time += dt;
    const v = this.vines[this.vineIndex];
    if (this.state === 'swing') {
      const t = this.time - this.tStart;
      const theta = this.amplitude * Math.cos(this.omega * t + this.phase);
      this.px = v.x + v.length * Math.sin(theta);
      this.py = this.anchorY + v.length * Math.cos(theta);
    } else {
      this.vy += 1500 * dt;
      this.px += this.vx * dt;
      this.py += this.vy * dt;
      const nextV = this.vines[this.vineIndex + 1];
      if (nextV) {
        const dx = this.px - nextV.x, dy = this.py - this.anchorY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dist - nextV.length) < 30 && dy > 0 && this.px > nextV.x - nextV.length * 0.9) {
          this.vineIndex++;
          const theta0 = Math.atan2(dx, dy);
          this.beginSwing(nextV, theta0);
          this.score++;
          this.callbacks.onScoreUpdate(this.score);
          this.callbacks.playTone(620, 'triangle', 0.07, 0.17, 880);
        }
      }
      if (this.py > this.riverY) { this.end(); return; }
    }
    this.camera = this.px - this.w * 0.32;
    while (this.nextSpawnX < this.camera + this.w + 400) {
      const gap = Math.max(150, 210 - this.score * 1.4);
      this.vines.push({ x: this.nextSpawnX, length: 140 + Math.random() * 70 });
      this.nextSpawnX += gap + Math.random() * 55;
    }
  };
  end = () => { if (this.gameOver) return; this.gameOver = true; this.callbacks.playTone(180, 'sawtooth', 0.2, 0.14, 60); this.callbacks.onGameOver(this.score); };
  draw = () => {
    const c = this.ctx;
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#0c2e1a'); g.addColorStop(0.75, '#0a2213'); g.addColorStop(1, '#04140b');
    c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);

    c.fillStyle = '#0e3a52';
    c.fillRect(0, this.riverY, this.w, this.h - this.riverY);
    c.fillStyle = 'rgba(255,255,255,.06)';
    for (let i = 0; i < this.w; i += 40) {
      const wave = Math.sin((i + this.time * 60) * 0.05) * 3;
      c.fillRect(i, this.riverY + 10 + wave, 22, 3);
    }

    for (const v of this.vines) {
      const sx = v.x - this.camera;
      if (sx < -60 || sx > this.w + 60) continue;
      const isCurrent = v === this.vines[this.vineIndex] && this.state === 'swing';
      let tipX = sx, tipY = this.anchorY + v.length;
      if (isCurrent) { tipX = this.px - this.camera; tipY = this.py; }
      c.strokeStyle = '#3f6212';
      c.lineWidth = 4;
      c.beginPath(); c.moveTo(sx, this.anchorY); c.lineTo(tipX, tipY); c.stroke();
      c.fillStyle = '#65a30d';
      c.beginPath(); c.arc(sx, this.anchorY, 6, 0, Math.PI * 2); c.fill();
      if (!isCurrent) {
        c.fillStyle = '#84cc16';
        c.beginPath(); c.arc(tipX, tipY, 5, 0, Math.PI * 2); c.fill();
      }
    }

    const psx = this.px - this.camera, psy = this.py;
    c.fillStyle = '#fbbf24';
    c.beginPath(); c.arc(psx, psy, 13, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#84cc16';
    c.fillRect(psx - 8, psy + 6, 16, 12);
  };
  loop = (t: number) => {
    if (!this.running) return;
    const dt = Math.min(0.032, (t - this.last) / 1000);
    this.last = t;
    this.update(dt);
    if (!this.running) return;
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  };
  start = () => { if (this.running || this.gameOver) return; this.running = true; this.last = performance.now(); this.frame = requestAnimationFrame(this.loop); };
  stop = () => { this.running = false; cancelAnimationFrame(this.frame); window.removeEventListener('resize', this.resize); this.canvas.removeEventListener('pointerdown', this.tap); };
}
