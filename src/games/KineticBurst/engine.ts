import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class KineticBurstEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0; lastTime = 0;
  score = 0; isGameOver = false;
  
  cx = 0; cy = 0;
  energy = 100;
  enemies: { x: number, y: number, vx: number, vy: number, speed: number }[] = [];
  bursts: { x: number, y: number, radius: number, maxRadius: number, power: number }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number }[] = [];
  
  spawnTimer = 0;
  spawnRate = 2000;
  
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
    this.cx = this.width / 2;
    this.cy = this.height / 2;
  }
  
  reset = () => {
    this.score = 0;
    this.isGameOver = false;
    this.energy = 100;
    this.enemies = [];
    this.bursts = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.spawnRate = 2000;
    this.lastTime = performance.now();
  }
  
  start = () => { this.frame = requestAnimationFrame(this.loop); }
  
  stop = () => {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.handleTap);
  }
  
  handleTap = (e: PointerEvent) => {
    if (this.isGameOver) return;
    if (this.energy >= 30) {
      this.energy -= 30;
      this.bursts.push({ x: e.clientX, y: e.clientY, radius: 10, maxRadius: 150, power: 15 });
      this.callbacks.playTone(200, 'square', 0.2, 0.4, 50);
      
      // Push enemies
      for (const en of this.enemies) {
        const dx = en.x - e.clientX;
        const dy = en.y - e.clientY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 150) {
          const force = (150 - dist) / 10;
          en.vx += (dx / dist) * force;
          en.vy += (dy / dist) * force;
        }
      }
    }
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    this.energy = Math.min(100, this.energy + 0.05 * dt);
    
    this.spawnTimer += dt;
    if (this.spawnTimer > this.spawnRate) {
      this.spawnTimer = 0;
      this.spawnRate = Math.max(500, this.spawnRate * 0.98);
      
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(this.width, this.height);
      const ex = this.cx + Math.cos(angle) * dist;
      const ey = this.cy + Math.sin(angle) * dist;
      
      this.enemies.push({ x: ex, y: ey, vx: 0, vy: 0, speed: 1 + (this.score * 0.05) });
    }
    
    // Score based on survival time
    if (Math.random() < 0.05) {
      this.score += 1;
      this.callbacks.onScoreUpdate(this.score);
    }
    
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      this.bursts[i].radius += 10;
      if (this.bursts[i].radius > this.bursts[i].maxRadius) {
        this.bursts.splice(i, 1);
      }
    }
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let en = this.enemies[i];
      
      // Move to center
      const dx = this.cx - en.x;
      const dy = this.cy - en.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      en.vx += (dx / dist) * 0.1;
      en.vy += (dy / dist) * 0.1;
      
      // Dampen
      en.vx *= 0.95;
      en.vy *= 0.95;
      
      en.x += en.vx * en.speed;
      en.y += en.vy * en.speed;
      
      if (dist < 30) {
        this.isGameOver = true;
        this.callbacks.playTone(100, 'sawtooth', 0.5, 0.5, 50);
        this.callbacks.onGameOver(this.score);
        for(let p=0; p<50; p++) this.particles.push({ x: this.cx, y: this.cy, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1 });
      }
      
      // Wall kill
      if (en.x < -200 || en.x > this.width + 200 || en.y < -200 || en.y > this.height + 200) {
         this.enemies.splice(i, 1);
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].x += this.particles[i].vx;
      this.particles[i].y += this.particles[i].vy;
      this.particles[i].life -= 0.02;
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }
  
  draw = () => {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw grid lines radiating from center
    this.ctx.strokeStyle = '#27272a';
    this.ctx.lineWidth = 1;
    for(let i=0; i<8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.cx, this.cy);
      this.ctx.lineTo(this.cx + Math.cos(a)*this.width, this.cy + Math.sin(a)*this.width);
      this.ctx.stroke();
    }
    
    // Draw bursts
    this.ctx.lineWidth = 4;
    for (const b of this.bursts) {
      this.ctx.strokeStyle = `rgba(249, 115, 22, ${1 - b.radius / b.maxRadius})`; // orange-500
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
      this.ctx.stroke();
    }
    
    // Draw enemies
    this.ctx.fillStyle = '#dc2626'; // red-600
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#dc2626';
    for (const en of this.enemies) {
      this.ctx.beginPath();
      this.ctx.arc(en.x, en.y, 8, 0, Math.PI*2);
      this.ctx.fill();
    }
    
    // Draw particles
    this.ctx.shadowBlur = 0;
    for (const p of this.particles) {
      this.ctx.fillStyle = `rgba(249, 115, 22, ${p.life})`;
      this.ctx.fillRect(p.x, p.y, 4, 4);
    }
    
    // Draw core
    if (!this.isGameOver) {
      this.ctx.fillStyle = '#f97316';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = '#f97316';
      this.ctx.beginPath();
      this.ctx.arc(this.cx, this.cy, 20 + Math.sin(this.frame * 0.1) * 2, 0, Math.PI*2);
      this.ctx.fill();
      
      // Energy ring
      this.ctx.strokeStyle = '#fdba74';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(this.cx, this.cy, 30, -Math.PI/2, -Math.PI/2 + (this.energy / 100) * Math.PI * 2);
      this.ctx.stroke();
    }
  }
  
  loop = (time: number) => {
    const dt = time - this.lastTime;
    this.lastTime = time;
    if (dt < 100) this.update(dt);
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  }
}
