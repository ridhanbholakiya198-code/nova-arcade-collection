import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class TetherBallEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0;\n  running = false; lastTime = 0;
  score = 0; isGameOver = false;
  
  player = { x: 100, y: 300, vx: 5, vy: 0 };
  tetherNode: { x: number, y: number } | null = null;
  
  obstacles: { x: number, y: number, w: number, h: number }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number }[] = [];
  
  cameraX = 0;
  spawnX = 0;
  
  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    
    this.resize();
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    
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
    this.isGameOver = false;
    this.player = { x: 100, y: this.height / 2, vx: 5, vy: 0 };
    this.tetherNode = null;
    this.obstacles = [];
    this.particles = [];
    this.cameraX = 0;
    this.spawnX = this.width;
    this.lastTime = performance.now();
  }
  
  start = () => { if (this.running || this.isGameOver) return; this.running = true; this.lastTime = performance.now(); this.frame = requestAnimationFrame(this.loop); }
  
  stop = () => {
    this.running = false; cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
  }
  
  handlePointerDown = (e: PointerEvent) => {
    if (this.isGameOver) return;
    this.tetherNode = { x: this.player.x + 100, y: 50 }; // Always attach somewhat ahead and top
    this.callbacks.playTone(600, 'sine', 0.1, 0.2);
  }
  
  handlePointerUp = (e: PointerEvent) => {
    this.tetherNode = null;
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    // Physics
    this.player.vy += 0.2 * (dt / 16); // Gravity
    
    if (this.tetherNode) {
      const dx = this.tetherNode.x - this.player.x;
      const dy = this.tetherNode.y - this.player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 0) {
        this.player.vx += (dx / dist) * 0.5 * (dt / 16);
        this.player.vy += (dy / dist) * 0.5 * (dt / 16);
      }
    }
    
    // Dampen
    this.player.vx *= 0.99;
    this.player.vy *= 0.99;
    
    // Min forward speed
    if (this.player.vx < 3) this.player.vx = 3;
    
    this.player.x += this.player.vx * (dt / 16);
    this.player.y += this.player.vy * (dt / 16);
    
    // Camera follow
    this.cameraX = this.player.x - 100;
    
    // Score
    if (Math.floor(this.player.x / 100) > this.score) {
      this.score = Math.floor(this.player.x / 100);
      this.callbacks.onScoreUpdate(this.score);
    }
    
    // Bounds / Death
    if (this.player.y > this.height - 50 || this.player.y < 50) {
      this.die();
    }
    
    // Obstacles
    while (this.spawnX < this.cameraX + this.width + 200) {
      const isTop = Math.random() > 0.5;
      const h = 50 + Math.random() * 150;
      this.obstacles.push({
        x: this.spawnX,
        y: isTop ? 50 : this.height - 50 - h,
        w: 40 + Math.random() * 60,
        h
      });
      this.spawnX += 200 + Math.random() * 300;
    }
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i];
      if (this.player.x + 10 > ob.x && this.player.x - 10 < ob.x + ob.w &&
          this.player.y + 10 > ob.y && this.player.y - 10 < ob.y + ob.h) {
        this.die();
      }
      if (ob.x < this.cameraX - 200) {
        this.obstacles.splice(i, 1);
      }
    }
    
    // Particles
    this.particles.push({ x: this.player.x, y: this.player.y, vx: -2 + Math.random(), vy: Math.random()-0.5, life: 1 });
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].x += this.particles[i].vx;
      this.particles[i].y += this.particles[i].vy;
      this.particles[i].life -= 0.05;
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }
  
  die = () => {
    this.isGameOver = true;
    this.callbacks.playTone(150, 'sawtooth', 0.5, 0.5, 50);
    this.callbacks.onGameOver(this.score);
    for(let p=0; p<40; p++) this.particles.push({ x: this.player.x, y: this.player.y, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1 });
  }
  
  draw = () => {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.save();
    this.ctx.translate(-this.cameraX, 0);
    
    // Draw bounds
    this.ctx.fillStyle = '#1e3a8a'; // blue-900
    this.ctx.fillRect(this.cameraX, 0, this.width, 50);
    this.ctx.fillRect(this.cameraX, this.height - 50, this.width, 50);
    
    // Draw obstacles
    this.ctx.fillStyle = '#3b82f6'; // blue-500
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#3b82f6';
    for (const ob of this.obstacles) {
      this.ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
    }
    this.ctx.shadowBlur = 0;
    
    // Draw tether
    if (this.tetherNode) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.player.x, this.player.y);
      this.ctx.lineTo(this.tetherNode.x, this.tetherNode.y);
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    
    // Draw particles
    for (const p of this.particles) {
      this.ctx.fillStyle = `rgba(147, 197, 253, ${p.life})`;
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    
    // Draw player
    if (!this.isGameOver) {
      this.ctx.fillStyle = '#93c5fd'; // blue-300
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#93c5fd';
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, 10, 0, Math.PI*2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
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
