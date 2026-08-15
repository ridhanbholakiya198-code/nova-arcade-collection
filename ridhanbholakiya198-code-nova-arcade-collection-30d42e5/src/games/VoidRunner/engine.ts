import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class VoidRunnerEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0;
  running = false; lastTime = 0;
  score = 0; isGameOver = false;
  
  player = { x: 100, y: 0, vx: 0, vy: 0, size: 20, gravityScale: 1 };
  obstacles: { x: number, y: number, w: number, h: number }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number }[] = [];
  
  speed = 5;
  distance = 0;
  spawnTimer = 0;
  
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
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }
  
  reset = () => {
    this.score = 0;
    this.distance = 0;
    this.isGameOver = false;
    this.player = { x: 100, y: this.height/2, vx: 0, vy: 0, size: 20, gravityScale: 1 };
    this.obstacles = [];
    this.particles = [];
    this.speed = 5;
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
    if (this.isGameOver) return;
    this.player.gravityScale *= -1;
    this.callbacks.playTone(300, 'triangle', 0.1, 0.2, 500);
    for(let p=0; p<10; p++) {
      this.particles.push({ x: this.player.x, y: this.player.y + (this.player.size/2)*-this.player.gravityScale, vx: (Math.random()-0.5)*4, vy: -this.player.gravityScale * 2, life: 1 });
    }
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    this.speed += 0.0005 * dt;
    this.distance += this.speed;
    
    if (Math.floor(this.distance / 100) > this.score) {
      this.score = Math.floor(this.distance / 100);
      this.callbacks.onScoreUpdate(this.score);
    }
    
    // Physics
    this.player.vy += 0.02 * dt * this.player.gravityScale;
    this.player.y += this.player.vy;
    
    // Bounds (floor / ceiling)
    if (this.player.y > this.height - 50 - this.player.size/2) {
      this.player.y = this.height - 50 - this.player.size/2;
      this.player.vy = 0;
    }
    if (this.player.y < 50 + this.player.size/2) {
      this.player.y = 50 + this.player.size/2;
      this.player.vy = 0;
    }
    
    // Spawn
    this.spawnTimer += dt;
    if (this.spawnTimer > 1500 / (this.speed / 5)) {
      this.spawnTimer = 0;
      const isTop = Math.random() > 0.5;
      const h = 20 + Math.random() * 80;
      this.obstacles.push({
        x: this.width + 50,
        y: isTop ? 50 : this.height - 50 - h,
        w: 30 + Math.random() * 40,
        h
      });
    }
    
    // Obstacles & Collision
    const pRect = { left: this.player.x - this.player.size/2, right: this.player.x + this.player.size/2, top: this.player.y - this.player.size/2, bottom: this.player.y + this.player.size/2 };
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      let ob = this.obstacles[i];
      ob.x -= this.speed;
      
      const oRect = { left: ob.x, right: ob.x + ob.w, top: ob.y, bottom: ob.y + ob.h };
      
      if (pRect.right > oRect.left && pRect.left < oRect.right && pRect.bottom > oRect.top && pRect.top < oRect.bottom) {
        this.isGameOver = true;
        this.callbacks.playTone(150, 'sawtooth', 0.5, 0.5, 50);
        this.callbacks.onGameOver(this.score);
        for(let p=0; p<30; p++) this.particles.push({ x: this.player.x, y: this.player.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1 });
      }
      
      if (ob.x < -100) this.obstacles.splice(i, 1);
    }
    
    // Particles
    this.particles.push({ x: this.player.x - 10, y: this.player.y, vx: -2, vy: (Math.random()-0.5)*2, life: 1 });
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
    
    // Draw bounds
    this.ctx.fillStyle = '#0f766e'; // teal-700
    this.ctx.fillRect(0, 0, this.width, 50);
    this.ctx.fillRect(0, this.height - 50, this.width, 50);
    
    this.ctx.fillStyle = '#34d399'; // emerald-400
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = '#34d399';
    for (const ob of this.obstacles) {
      this.ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
    }
    
    this.ctx.shadowBlur = 0;
    for (const p of this.particles) {
      this.ctx.fillStyle = `rgba(52, 211, 153, ${p.life})`;
      this.ctx.fillRect(p.x, p.y, 4, 4);
    }
    
    if (!this.isGameOver) {
      this.ctx.fillStyle = '#fff';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#fff';
      this.ctx.fillRect(this.player.x - this.player.size/2, this.player.y - this.player.size/2, this.player.size, this.player.size);
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
