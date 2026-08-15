import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class NeonDriftEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0;
  running = false; lastTime = 0;
  score = 0; isGameOver = false;
  
  player = { x: 0, y: 0, radius: 10, vx: 0 };
  walls: { y: number, leftX: number, rightX: number, passed: boolean }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number }[] = [];
  
  targetX = 0;
  speed = 4;
  wallGap = 150;
  pathCenter = 0;
  
  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    
    this.resize();
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerdown', this.handlePointerMove);
    
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
    this.player = { x: this.width / 2, y: this.height - 150, radius: 10, vx: 0 };
    this.targetX = this.player.x;
    this.walls = [];
    this.particles = [];
    this.speed = 4;
    this.wallGap = 200;
    this.pathCenter = this.width / 2;
    
    for (let i = 0; i < 10; i++) {
      this.spawnWall(-i * 150);
    }
    
    this.lastTime = performance.now();
  }
  
  start = () => { if (this.running || this.isGameOver) return; this.running = true; this.lastTime = performance.now(); this.frame = requestAnimationFrame(this.loop); }
  
  stop = () => {
    this.running = false; cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerdown', this.handlePointerMove);
  }
  
  handlePointerMove = (e: PointerEvent) => {
    this.targetX = e.clientX;
  }
  
  spawnWall = (y: number) => {
    this.pathCenter += (Math.random() - 0.5) * 200;
    this.pathCenter = Math.max(this.wallGap, Math.min(this.width - this.wallGap, this.pathCenter));
    
    this.walls.push({
      y,
      leftX: this.pathCenter - this.wallGap / 2,
      rightX: this.pathCenter + this.wallGap / 2,
      passed: false
    });
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    // Move player
    this.player.x += (this.targetX - this.player.x) * 0.1;
    
    this.speed += 0.001 * dt;
    this.wallGap = Math.max(80, this.wallGap - 0.005 * dt);
    
    let highestY = this.height;
    
    for (let i = this.walls.length - 1; i >= 0; i--) {
      let w = this.walls[i];
      w.y += this.speed;
      
      if (w.y < highestY) highestY = w.y;
      
      // Collision
      if (Math.abs(w.y - this.player.y) < 10) {
        if (this.player.x - this.player.radius < w.leftX || this.player.x + this.player.radius > w.rightX) {
          this.isGameOver = true;
          this.callbacks.playTone(100, 'sawtooth', 0.5, 0.5, 50);
          for(let p=0; p<30; p++) this.particles.push({ x: this.player.x, y: this.player.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1 });
          this.callbacks.onGameOver(this.score);
          return;
        } else if (!w.passed) {
          w.passed = true;
          this.score += 10;
          this.callbacks.onScoreUpdate(this.score);
          if (this.score % 100 === 0) this.callbacks.playTone(800, 'sine', 0.1, 0.2);
        }
      }
      
      if (w.y > this.height + 100) {
        this.walls.splice(i, 1);
      }
    }
    
    if (highestY > -100) {
      this.spawnWall(highestY - 150);
    }
    
    // Particles
    this.particles.push({
      x: this.player.x, y: this.player.y,
      vx: (Math.random()-0.5)*2, vy: (Math.random())*2 + this.speed,
      life: 1
    });
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].x += this.particles[i].vx;
      this.particles[i].y += this.particles[i].vy;
      this.particles[i].life += 0.05;
      if (this.particles[i].life > 1) this.particles.splice(i, 1);
    }
  }
  
  draw = () => {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw walls
    this.ctx.fillStyle = '#22d3ee'; // cyan-400
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#0891b2';
    
    for (const w of this.walls) {
      this.ctx.fillRect(0, w.y, w.leftX, 5);
      this.ctx.fillRect(w.rightX, w.y, this.width - w.rightX, 5);
    }
    
    // Draw particles
    this.ctx.shadowBlur = 0;
    for (const p of this.particles) {
      this.ctx.fillStyle = `rgba(34, 211, 238, ${1 - p.life})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      this.ctx.fill();
    }
    
    // Draw player
    if (!this.isGameOver) {
      this.ctx.fillStyle = '#fff';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = '#22d3ee';
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI*2);
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
