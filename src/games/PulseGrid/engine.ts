import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class PulseGridEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0; lastTime = 0;
  score = 0; isGameOver = false;
  
  nodes: { x: number, y: number, radius: number, maxRadius: number, active: boolean }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number }[] = [];
  
  spawnTimer = 0;
  spawnRate = 1000;
  shrinkSpeed = 0.05;
  
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
    this.isGameOver = false;
    this.nodes = [];
    this.particles = [];
    this.spawnRate = 1000;
    this.shrinkSpeed = 0.03;
    this.spawnTimer = 0;
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
    
    let hit = false;
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = n.x - e.clientX;
      const dy = n.y - e.clientY;
      if (Math.sqrt(dx*dx + dy*dy) < n.radius + 20) {
        this.nodes.splice(i, 1);
        this.score += 10;
        this.callbacks.onScoreUpdate(this.score);
        this.callbacks.playTone(400 + Math.random() * 400, 'sine', 0.1, 0.3);
        
        // Particles
        for(let p=0; p<15; p++) {
          this.particles.push({ x: n.x, y: n.y, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 1 });
        }
        hit = true;
        break; // Only hit one
      }
    }
    if (!hit) {
      // Penalty for missing? Nah, just don't score.
    }
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    this.spawnTimer += dt;
    if (this.spawnTimer > this.spawnRate) {
      this.spawnTimer = 0;
      this.spawnRate = Math.max(300, this.spawnRate * 0.98);
      this.shrinkSpeed += 0.001;
      
      this.nodes.push({
        x: 50 + Math.random() * (this.width - 100),
        y: 100 + Math.random() * (this.height - 200),
        maxRadius: 40,
        radius: 40,
        active: true
      });
    }
    
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      this.nodes[i].radius -= this.shrinkSpeed * dt;
      if (this.nodes[i].radius <= 0) {
        this.isGameOver = true;
        this.callbacks.playTone(150, 'sawtooth', 0.5, 0.5, 50);
        this.callbacks.onGameOver(this.score);
      }
    }
    
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
    
    for (const n of this.nodes) {
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.maxRadius, 0, Math.PI*2);
      this.ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)'; // rose-500
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, Math.max(0, n.radius), 0, Math.PI*2);
      this.ctx.fillStyle = '#f43f5e';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#f43f5e';
      this.ctx.fill();
    }
    
    this.ctx.shadowBlur = 0;
    for (const p of this.particles) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
      this.ctx.fill();
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
