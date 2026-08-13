import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class PrismGuardEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0; lastTime = 0;
  score = 0; isGameOver = false;
  
  cx = 0; cy = 0;
  colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
  rotation = 0;
  targetRotation = 0;
  
  projectiles: { angle: number, dist: number, colorIndex: number, speed: number }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number, color: string }[] = [];
  
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
    this.rotation = 0;
    this.targetRotation = 0;
    this.projectiles = [];
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
    
    const isLeft = e.clientX < this.width / 2;
    if (isLeft) {
      this.targetRotation -= Math.PI / 3;
    } else {
      this.targetRotation += Math.PI / 3;
    }
    this.callbacks.playTone(300, 'sine', 0.1, 0.2);
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    // Smooth rotate
    this.rotation += (this.targetRotation - this.rotation) * 0.2;
    
    this.spawnTimer += dt;
    if (this.spawnTimer > this.spawnRate) {
      this.spawnTimer = 0;
      this.spawnRate = Math.max(500, this.spawnRate * 0.98);
      
      const side = Math.floor(Math.random() * 6);
      const angle = (side * Math.PI / 3) - Math.PI/2;
      
      this.projectiles.push({
        angle,
        dist: Math.max(this.width, this.height),
        colorIndex: side,
        speed: 2 + (this.score * 0.05)
      });
    }
    
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      let p = this.projectiles[i];
      p.dist -= p.speed * (dt / 16);
      
      if (p.dist < 30) {
        // Evaluate collision
        // Which side of the hexagon is facing this angle?
        // Shield rotation offsets the colors.
        
        let rotIndex = Math.round(this.rotation / (Math.PI/3)) % 6;
        if (rotIndex < 0) rotIndex += 6;
        
        const facingColorIndex = (p.colorIndex - rotIndex + 6) % 6;
        
        if (facingColorIndex === p.colorIndex) {
          // Success
          this.score += 10;
          this.callbacks.onScoreUpdate(this.score);
          this.callbacks.playTone(600, 'square', 0.1, 0.2);
          
          const px = this.cx + Math.cos(p.angle) * 30;
          const py = this.cy + Math.sin(p.angle) * 30;
          for(let p1=0; p1<15; p1++) this.particles.push({ x: px, y: py, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1, color: this.colors[p.colorIndex] });
          
          this.projectiles.splice(i, 1);
        } else {
          // Fail
          this.isGameOver = true;
          this.callbacks.playTone(150, 'sawtooth', 0.5, 0.5, 50);
          this.callbacks.onGameOver(this.score);
          for(let p1=0; p1<40; p1++) this.particles.push({ x: this.cx, y: this.cy, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1, color: '#fff' });
        }
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].x += this.particles[i].vx;
      this.particles[i].y += this.particles[i].vy;
      this.particles[i].life -= 0.05;
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }
  
  draw = () => {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw central shield
    this.ctx.save();
    this.ctx.translate(this.cx, this.cy);
    this.ctx.rotate(this.rotation);
    
    for (let i = 0; i < 6; i++) {
      this.ctx.fillStyle = this.colors[i];
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, 30, (i * Math.PI / 3) - Math.PI/2 - Math.PI/6, ((i+1) * Math.PI / 3) - Math.PI/2 - Math.PI/6);
      this.ctx.fill();
    }
    
    this.ctx.restore();
    
    // Draw projectiles
    for (const p of this.projectiles) {
      const px = this.cx + Math.cos(p.angle) * p.dist;
      const py = this.cy + Math.sin(p.angle) * p.dist;
      this.ctx.fillStyle = this.colors[p.colorIndex];
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.colors[p.colorIndex];
      this.ctx.beginPath();
      this.ctx.arc(px, py, 6, 0, Math.PI*2);
      this.ctx.fill();
    }
    this.ctx.shadowBlur = 0;
    
    // Draw particles
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    this.ctx.globalAlpha = 1;
  }
  
  loop = (time: number) => {
    const dt = time - this.lastTime;
    this.lastTime = time;
    if (dt < 100) this.update(dt);
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  }
}
