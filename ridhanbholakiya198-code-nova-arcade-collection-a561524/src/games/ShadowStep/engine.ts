import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class ShadowStepEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0;
  running = false; lastTime = 0;
  score = 0; isGameOver = false;
  
  cols = 4; rows = 5;
  tileSize = 0;
  offsetX = 0; offsetY = 0;
  
  path: { c: number, r: number }[] = [];
  currentIndex = 0;
  state: 'showing' | 'playing' | 'success' | 'failed' = 'showing';
  timer = 0;
  
  particles: { x: number, y: number, vx: number, vy: number, life: number, color: string }[] = [];
  
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
    
    this.tileSize = Math.min((this.width - 40) / this.cols, (this.height - 200) / this.rows);
    this.offsetX = (this.width - this.cols * this.tileSize) / 2;
    this.offsetY = (this.height - this.rows * this.tileSize) / 2;
  }
  
  generatePath = () => {
    this.path = [];
    const length = 3 + Math.floor(this.score / 2);
    let c = Math.floor(Math.random() * this.cols);
    let r = this.rows - 1; // start at bottom
    
    this.path.push({ c, r });
    for(let i=1; i<length; i++) {
      const dirs = [];
      if (c > 0) dirs.push({ dc: -1, dr: 0 });
      if (c < this.cols - 1) dirs.push({ dc: 1, dr: 0 });
      if (r > 0) dirs.push({ dc: 0, dr: -1 }); // move up
      
      const nextDir = dirs[Math.floor(Math.random() * dirs.length)];
      c += nextDir.dc;
      r += nextDir.dr;
      // prevent back-tracking trivially
      if (this.path.findIndex(p => p.c === c && p.r === r) !== -1) {
        i--; continue; // retry
      }
      this.path.push({ c, r });
    }
  }
  
  reset = () => {
    this.score = 0;
    this.isGameOver = false;
    this.currentIndex = 0;
    this.state = 'showing';
    this.timer = 2000;
    this.particles = [];
    this.lastTime = performance.now();
    this.generatePath();
  }
  
  start = () => { if (this.running || this.isGameOver) return; this.running = true; this.lastTime = performance.now(); this.frame = requestAnimationFrame(this.loop); }
  
  stop = () => {
    this.running = false; cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.handleTap);
  }
  
  handleTap = (e: PointerEvent) => {
    if (this.isGameOver || this.state !== 'playing') return;
    
    const c = Math.floor((e.clientX - this.offsetX) / this.tileSize);
    const r = Math.floor((e.clientY - this.offsetY) / this.tileSize);
    
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      const expected = this.path[this.currentIndex];
      if (c === expected.c && r === expected.r) {
        // Correct step
        this.currentIndex++;
        this.callbacks.playTone(400 + this.currentIndex * 100, 'sine', 0.1, 0.2);
        
        const px = this.offsetX + c * this.tileSize + this.tileSize/2;
        const py = this.offsetY + r * this.tileSize + this.tileSize/2;
        for(let p=0; p<10; p++) this.particles.push({ x: px, y: py, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life: 1, color: '#94a3b8' });
        
        if (this.currentIndex === this.path.length) {
          // Level complete
          this.state = 'success';
          this.timer = 1000;
          this.score += 1;
          this.callbacks.onScoreUpdate(this.score);
          this.callbacks.playTone(800, 'triangle', 0.2, 0.3);
        }
      } else {
        // Wrong step
        this.state = 'failed';
        this.isGameOver = true;
        this.callbacks.playTone(150, 'sawtooth', 0.5, 0.5, 50);
        this.callbacks.onGameOver(this.score);
        
        const px = this.offsetX + c * this.tileSize + this.tileSize/2;
        const py = this.offsetY + r * this.tileSize + this.tileSize/2;
        for(let p=0; p<30; p++) this.particles.push({ x: px, y: py, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1, color: '#ef4444' });
      }
    }
  }
  
  update = (dt: number) => {
    if (this.state === 'showing') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'playing';
      }
    } else if (this.state === 'success') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.currentIndex = 0;
        this.state = 'showing';
        this.timer = Math.max(500, 2000 - this.score * 100); // gets faster
        this.generatePath();
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
    
    // Draw Grid
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.offsetX + c * this.tileSize;
        const y = this.offsetY + r * this.tileSize;
        
        this.ctx.strokeStyle = '#27272a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
        
        // Is it part of the path?
        const pathIndex = this.path.findIndex(p => p.c === c && p.r === r);
        if (pathIndex !== -1) {
          if (this.state === 'showing' || this.state === 'success' || pathIndex < this.currentIndex || this.state === 'failed') {
            this.ctx.fillStyle = this.state === 'failed' && pathIndex >= this.currentIndex ? '#ef4444' : '#94a3b8'; // slate-400
            this.ctx.fillRect(x + 6, y + 6, this.tileSize - 12, this.tileSize - 12);
          }
        }
      }
    }
    
    // Draw particles
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    this.ctx.globalAlpha = 1;
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
