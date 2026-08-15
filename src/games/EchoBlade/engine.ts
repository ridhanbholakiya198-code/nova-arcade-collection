import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class EchoBladeEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0;\n  running = false; lastTime = 0;
  score = 0; isGameOver = false;
  
  player = { x: 0, y: 0, targetX: 0, targetY: 0, state: 'idle' }; // idle, dashing, returning
  enemies: { x: number, y: number, vx: number, vy: number, speed: number }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number }[] = [];
  slashes: { x1: number, y1: number, x2: number, y2: number, life: number }[] = [];
  
  spawnRate = 2000;
  spawnTimer = 0;
  baseX = 0; baseY = 0;
  
  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    
    this.resize();
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.handleTap);
    
    this.reset();
  }
  
  resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.baseX = this.width / 2;
    this.baseY = this.height / 2;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }
  
  reset = () => {
    this.score = 0;
    this.isGameOver = false;
    this.player = { x: this.baseX, y: this.baseY, targetX: this.baseX, targetY: this.baseY, state: 'idle' };
    this.enemies = [];
    this.particles = [];
    this.slashes = [];
    this.spawnRate = 2000;
    this.spawnTimer = 0;
    this.lastTime = performance.now();
  }
  
  start = () => { if (this.running || this.isGameOver) return; this.running = true; this.lastTime = performance.now(); this.frame = requestAnimationFrame(this.loop); }
  
  stop = () => {
    this.running = false; cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.handleTap);
  }
  
  handleTap = (e: PointerEvent) => {
    if (this.isGameOver || this.player.state !== 'idle') return;
    this.player.targetX = e.clientX;
    this.player.targetY = e.clientY;
    this.player.state = 'dashing';
    this.callbacks.playTone(600, 'square', 0.1, 0.2);
    
    // Create slash
    this.slashes.push({ x1: this.player.x, y1: this.player.y, x2: e.clientX, y2: e.clientY, life: 1 });
  }
  
  lineCircleCollide(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const dot = (((cx - x1) * dx) + ((cy - y1) * dy)) / Math.pow(len, 2);
    const closestX = x1 + (dot * dx);
    const closestY = y1 + (dot * dy);
    
    if (dot < 0 || dot > 1) return false;
    
    const distX = closestX - cx;
    const distY = closestY - cy;
    return Math.sqrt(distX*distX + distY*distY) <= r;
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    // Spawning
    this.spawnTimer += dt;
    if (this.spawnTimer > this.spawnRate) {
      this.spawnTimer = 0;
      this.spawnRate = Math.max(400, this.spawnRate * 0.95);
      
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(this.width, this.height);
      const ex = this.baseX + Math.cos(angle) * dist;
      const ey = this.baseY + Math.sin(angle) * dist;
      
      const vx = (this.baseX - ex) / dist;
      const vy = (this.baseY - ey) / dist;
      
      this.enemies.push({ x: ex, y: ey, vx, vy, speed: 2 + Math.random() * 2 + (this.score * 0.05) });
    }
    
    // Player movement
    if (this.player.state === 'dashing') {
      const dx = this.player.targetX - this.player.x;
      const dy = this.player.targetY - this.player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 20) {
        this.player.x = this.player.targetX;
        this.player.y = this.player.targetY;
        this.player.state = 'returning';
      } else {
        this.player.x += (dx / dist) * 25;
        this.player.y += (dy / dist) * 25;
      }
    } else if (this.player.state === 'returning') {
      const dx = this.baseX - this.player.x;
      const dy = this.baseY - this.player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 10) {
        this.player.x = this.baseX;
        this.player.y = this.baseY;
        this.player.state = 'idle';
      } else {
        this.player.x += (dx / dist) * 15;
        this.player.y += (dy / dist) * 15;
      }
    }
    
    // Slashes and Hit detection
    for (let s = this.slashes.length - 1; s >= 0; s--) {
      let slash = this.slashes[s];
      slash.life -= 0.05;
      
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const en = this.enemies[i];
        if (this.lineCircleCollide(slash.x1, slash.y1, slash.x2, slash.y2, en.x, en.y, 20)) {
          this.enemies.splice(i, 1);
          this.score += 10;
          this.callbacks.onScoreUpdate(this.score);
          this.callbacks.playTone(800, 'triangle', 0.1, 0.1);
          for(let p=0; p<15; p++) {
            this.particles.push({ x: en.x, y: en.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1 });
          }
        }
      }
      if (slash.life <= 0) this.slashes.splice(s, 1);
    }
    
    // Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      en.x += en.vx * en.speed;
      en.y += en.vy * en.speed;
      
      const dx = this.baseX - en.x;
      const dy = this.baseY - en.y;
      if (Math.sqrt(dx*dx + dy*dy) < 30) { // core hit
        this.isGameOver = true;
        this.callbacks.playTone(100, 'sawtooth', 0.5, 0.5, 50);
        this.callbacks.onGameOver(this.score);
        for(let p=0; p<40; p++) this.particles.push({ x: this.baseX, y: this.baseY, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1 });
      }
    }
    
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].x += this.particles[i].vx;
      this.particles[i].y += this.particles[i].vy;
      this.particles[i].life -= 0.02 * dt;
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }
  
  draw = () => {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw Core
    if (!this.isGameOver) {
      this.ctx.beginPath();
      this.ctx.arc(this.baseX, this.baseY, 20, 0, Math.PI*2);
      this.ctx.fillStyle = '#27272a';
      this.ctx.fill();
      this.ctx.strokeStyle = '#52525b';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    
    // Draw Slashes
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#fff';
    for (const s of this.slashes) {
      this.ctx.beginPath();
      this.ctx.moveTo(s.x1, s.y1);
      this.ctx.lineTo(s.x2, s.y2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${s.life})`;
      this.ctx.lineWidth = 4 * s.life;
      this.ctx.stroke();
    }
    this.ctx.shadowBlur = 0;
    
    // Draw Enemies
    for (const en of this.enemies) {
      this.ctx.fillStyle = '#d4d4d8';
      this.ctx.beginPath();
      this.ctx.arc(en.x, en.y, 10, 0, Math.PI*2);
      this.ctx.fill();
    }
    
    // Draw Particles
    for (const p of this.particles) {
      this.ctx.fillStyle = `rgba(212, 212, 216, ${p.life})`;
      this.ctx.fillRect(p.x, p.y, 3, 3);
    }
    
    // Draw Player
    if (!this.isGameOver) {
      this.ctx.fillStyle = '#fff';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, 8, 0, Math.PI*2);
      this.ctx.fill();
    }
  }
  
  loop = (time: number) => {
    if (!this.running) return;
    const dt = time - this.lastTime;
    this.lastTime = time;
    if (dt < 100) this.update(dt);
    if(!this.running)return;
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  }
}
