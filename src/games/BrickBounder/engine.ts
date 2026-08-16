import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

type Pit = { x: number; width: number };
type Crawler = { x: number; alive: boolean; dir: number; baseX: number };
type Coin = { x: number; taken: boolean };

export class BrickBounderEngine implements GameEngine {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; callbacks: GameEngineCallbacks;
  w = 0; h = 0; frame = 0; last = 0; running = false; gameOver = false; score = 0;
  groundY = 0; playerScreenX = 0;
  worldX = 0; scrollSpeed = 210;
  vy = 0; grounded = true; playerAirY = 0;
  pits: Pit[] = []; crawlers: Crawler[] = []; coins: Coin[] = [];
  nextPitX = 0; nextCrawlerX = 0; nextCoinX = 0;
  time = 0; bounceFlash = 0;

  constructor(c: HTMLCanvasElement, cb: GameEngineCallbacks) {
    this.canvas = c; this.ctx = c.getContext('2d')!; this.callbacks = cb;
    this.resize(); window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.tap);
    this.reset();
  }
  resize = () => {
    this.w = innerWidth; this.h = innerHeight;
    this.canvas.width = this.w; this.canvas.height = this.h;
    this.groundY = this.h * 0.8; this.playerScreenX = this.w * 0.24;
  };
  reset = () => {
    this.score = 0; this.gameOver = false; this.time = 0;
    this.worldX = 0; this.vy = 0; this.grounded = true; this.playerAirY = 0;
    this.pits = []; this.crawlers = []; this.coins = [];
    this.nextPitX = this.w * 0.85;
    this.nextCrawlerX = this.w * 1.3;
    this.nextCoinX = this.w * 0.6;
    this.last = performance.now();
  };
  tap = () => {
    if (this.gameOver) return;
    if (this.grounded) {
      this.vy = -700; this.grounded = false;
      this.callbacks.playTone(480, 'triangle', 0.09, 0.16, 900);
    }
  };
  update = (dt: number) => {
    if (this.gameOver) return;
    this.time += dt;
    this.bounceFlash = Math.max(0, this.bounceFlash - dt);
    const speed = this.scrollSpeed + Math.min(150, this.score * 3);
    this.worldX += speed * dt;
    const playerWorldX = this.worldX + this.playerScreenX;

    if (!this.grounded) {
      this.vy += 1650 * dt;
      this.playerAirY += this.vy * dt;
      if (this.playerAirY >= 0) { this.playerAirY = 0; this.grounded = true; this.vy = 0; }
    }

    for (const p of this.pits) {
      if (this.grounded && playerWorldX > p.x - 14 && playerWorldX < p.x + p.width - 14) { this.end(); return; }
    }

    for (const cw of this.crawlers) {
      if (!cw.alive) continue;
      cw.x = cw.baseX + Math.sin(this.time * 1.4 + cw.baseX) * 26;
      const dx = Math.abs(cw.x - playerWorldX);
      if (dx < 20) {
        const playerBottom = this.playerAirY;
        if (!this.grounded && this.vy > 60 && playerBottom < -6) {
          cw.alive = false;
          this.vy = -420;
          this.score += 2; this.callbacks.onScoreUpdate(this.score);
          this.bounceFlash = 0.12;
          this.callbacks.playTone(150, 'sawtooth', 0.09, 0.15, 60);
        } else {
          this.end(); return;
        }
      }
    }

    for (const co of this.coins) {
      if (co.taken) continue;
      if (Math.abs(co.x - playerWorldX) < 20) {
        co.taken = true;
        this.score += 1; this.callbacks.onScoreUpdate(this.score);
        this.callbacks.playTone(1180, 'square', 0.05, 0.16, 1660);
      }
    }

    while (this.nextPitX < this.worldX + this.w + 300) {
      this.pits.push({ x: this.nextPitX, width: 60 + Math.random() * 35 });
      this.nextPitX += 380 + Math.random() * 220;
    }
    while (this.nextCrawlerX < this.worldX + this.w + 300) {
      this.crawlers.push({ x: this.nextCrawlerX, baseX: this.nextCrawlerX, alive: true, dir: 1 });
      this.nextCrawlerX += 300 + Math.random() * 260 - Math.min(this.score * 1.2, 100);
    }
    while (this.nextCoinX < this.worldX + this.w + 300) {
      this.coins.push({ x: this.nextCoinX, taken: false });
      this.nextCoinX += 140 + Math.random() * 90;
    }
    this.pits = this.pits.filter(p => p.x > this.worldX - 200);
    this.crawlers = this.crawlers.filter(cw => cw.x > this.worldX - 200);
    this.coins = this.coins.filter(co => co.x > this.worldX - 200);
  };
  end = () => { if (this.gameOver) return; this.gameOver = true; this.callbacks.playTone(170, 'sawtooth', 0.2, 0.15, 55); this.callbacks.onGameOver(this.score); };
  draw = () => {
    const c = this.ctx;
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#1a2a4a'); g.addColorStop(1, '#0a1226');
    c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);

    c.fillStyle = '#7f3f1f';
    c.fillRect(0, this.groundY, this.w, this.h - this.groundY);
    c.fillStyle = '#ef4444';
    c.fillRect(0, this.groundY, this.w, 6);
    c.fillStyle = 'rgba(0,0,0,.4)';
    for (const p of this.pits) {
      const sx = p.x - this.worldX;
      if (sx < -100 || sx > this.w + 100) continue;
      c.fillRect(sx, this.groundY, p.width, this.h - this.groundY);
    }

    for (const co of this.coins) {
      if (co.taken) continue;
      const sx = co.x - this.worldX;
      if (sx < -20 || sx > this.w + 20) continue;
      const bob = Math.sin(this.time * 4 + co.x) * 5;
      c.fillStyle = '#facc15';
      c.beginPath(); c.arc(sx, this.groundY - 60 + bob, 8, 0, Math.PI * 2); c.fill();
    }

    for (const cw of this.crawlers) {
      if (!cw.alive) continue;
      const sx = cw.x - this.worldX;
      if (sx < -30 || sx > this.w + 30) continue;
      c.fillStyle = '#059669';
      c.fillRect(sx - 12, this.groundY - 18, 24, 18);
      c.fillStyle = '#065f46';
      c.fillRect(sx - 12, this.groundY - 18, 6, 6);
      c.fillRect(sx + 6, this.groundY - 18, 6, 6);
    }

    const py = this.groundY - 30 + this.playerAirY;
    c.fillStyle = this.bounceFlash > 0 ? '#fde047' : '#3b82f6';
    c.fillRect(this.playerScreenX - 9, py, 18, 30);
    c.fillStyle = '#ef4444';
    c.beginPath(); c.arc(this.playerScreenX, py - 6, 8, 0, Math.PI * 2); c.fill();
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
