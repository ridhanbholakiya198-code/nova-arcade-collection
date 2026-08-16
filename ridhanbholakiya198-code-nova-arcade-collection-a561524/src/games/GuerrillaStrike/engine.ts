import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

type Enemy = { x: number; alive: boolean; hitAt: number };
type Bullet = { x: number; y: number };
type Pit = { x: number; width: number };

export class GuerrillaStrikeEngine implements GameEngine {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; callbacks: GameEngineCallbacks;
  w = 0; h = 0; frame = 0; last = 0; running = false; gameOver = false; score = 0;
  groundY = 0; playerScreenX = 0;
  worldX = 0; scrollSpeed = 230;
  vy = 0; grounded = true; jumpHeld = false; playerAirY = 0;
  enemies: Enemy[] = []; bullets: Bullet[] = []; pits: Pit[] = [];
  nextEnemyX = 0; nextPitX = 0;
  muzzleFlash = 0; time = 0;

  constructor(c: HTMLCanvasElement, cb: GameEngineCallbacks) {
    this.canvas = c; this.ctx = c.getContext('2d')!; this.callbacks = cb;
    this.resize(); window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.tap);
    this.reset();
  }
  resize = () => {
    this.w = innerWidth; this.h = innerHeight;
    this.canvas.width = this.w; this.canvas.height = this.h;
    this.groundY = this.h * 0.78; this.playerScreenX = this.w * 0.26;
  };
  reset = () => {
    this.score = 0; this.gameOver = false; this.time = 0;
    this.worldX = 0; this.vy = 0; this.grounded = true;
    this.enemies = []; this.bullets = []; this.pits = [];
    this.nextEnemyX = this.w * 0.9;
    this.nextPitX = this.w * 1.6;
    this.last = performance.now();
  };
  tap = (e: PointerEvent) => {
    if (this.gameOver) return;
    if (e.clientX < this.w / 2) {
      if (this.grounded) { this.vy = -640; this.grounded = false; this.callbacks.playTone(340, 'square', 0.06, 0.15, 520); }
    } else {
      this.bullets.push({ x: this.worldX + this.playerScreenX + 18, y: this.groundY - 34 });
      this.muzzleFlash = 0.06;
      this.callbacks.playTone(1400, 'sawtooth', 0.045, 0.13, 700);
    }
  };
  update = (dt: number) => {
    if (this.gameOver) return;
    this.time += dt;
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
    const speed = this.scrollSpeed + Math.min(160, this.score * 2.2);
    this.worldX += speed * dt;

    if (!this.grounded) {
      this.vy += 1500 * dt;
      this.playerAirY += this.vy * dt;
      if (this.playerAirY >= 0) { this.playerAirY = 0; this.grounded = true; this.vy = 0; }
    }

    for (const b of this.bullets) b.x += 900 * dt;
    this.bullets = this.bullets.filter(b => b.x < this.worldX + this.w + 40);

    for (const en of this.enemies) {
      if (!en.alive) continue;
      for (const b of this.bullets) {
        if (Math.abs(b.x - en.x) < 24) {
          en.alive = false; en.hitAt = this.time;
          this.score++; this.callbacks.onScoreUpdate(this.score);
          this.callbacks.playTone(140, 'sawtooth', 0.14, 0.16, 45);
          b.x = -99999;
        }
      }
      const playerWorldX = this.worldX + this.playerScreenX;
      if (en.alive && Math.abs(en.x - playerWorldX) < 22 && this.grounded) { this.end(); return; }
    }

    for (const p of this.pits) {
      const playerWorldX = this.worldX + this.playerScreenX;
      if (this.grounded && playerWorldX > p.x - 14 && playerWorldX < p.x + p.width - 14) { this.end(); return; }
    }

    while (this.nextEnemyX < this.worldX + this.w + 300) {
      this.enemies.push({ x: this.nextEnemyX, alive: true, hitAt: 0 });
      this.nextEnemyX += 260 + Math.random() * 220 - Math.min(this.score * 1.5, 100);
    }
    while (this.nextPitX < this.worldX + this.w + 300) {
      this.pits.push({ x: this.nextPitX, width: 70 + Math.random() * 40 });
      this.nextPitX += 420 + Math.random() * 260;
    }
    this.enemies = this.enemies.filter(en => en.x > this.worldX - 100);
    this.pits = this.pits.filter(p => p.x > this.worldX - 200);
  };
  end = () => { if (this.gameOver) return; this.gameOver = true; this.callbacks.playTone(160, 'sawtooth', 0.22, 0.16, 50); this.callbacks.onGameOver(this.score); };
  draw = () => {
    const c = this.ctx;
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#2a1608'); g.addColorStop(1, '#150a03');
    c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);

    c.fillStyle = '#3f2412';
    c.fillRect(0, this.groundY, this.w, this.h - this.groundY);
    c.fillStyle = 'rgba(0,0,0,.35)';
    for (const p of this.pits) {
      const sx = p.x - this.worldX;
      if (sx < -100 || sx > this.w + 100) continue;
      c.fillRect(sx, this.groundY, p.width, this.h - this.groundY);
    }

    for (const en of this.enemies) {
      if (!en.alive) continue;
      const sx = en.x - this.worldX;
      if (sx < -30 || sx > this.w + 30) continue;
      c.fillStyle = '#b91c1c';
      c.fillRect(sx - 10, this.groundY - 30, 20, 30);
      c.fillStyle = '#7f1d1d';
      c.beginPath(); c.arc(sx, this.groundY - 34, 7, 0, Math.PI * 2); c.fill();
    }

    for (const b of this.bullets) {
      const sx = b.x - this.worldX;
      if (sx < -20 || sx > this.w + 20) continue;
      c.fillStyle = '#facc15';
      c.fillRect(sx, b.y, 10, 3);
    }

    const py = this.groundY - 34 + this.playerAirY;
    c.fillStyle = '#ea580c';
    c.fillRect(this.playerScreenX - 9, py, 18, 30);
    c.fillStyle = '#fbbf24';
    c.beginPath(); c.arc(this.playerScreenX, py - 6, 8, 0, Math.PI * 2); c.fill();
    if (this.muzzleFlash > 0) {
      c.fillStyle = '#fef08a';
      c.beginPath(); c.arc(this.playerScreenX + 22, py + 4, 6, 0, Math.PI * 2); c.fill();
    }

    c.fillStyle = 'rgba(255,255,255,.35)';
    c.font = '11px monospace';
    c.fillText('LEFT: JUMP', 14, this.h - 14);
    c.fillText('RIGHT: FIRE', this.w - 96, this.h - 14);
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
