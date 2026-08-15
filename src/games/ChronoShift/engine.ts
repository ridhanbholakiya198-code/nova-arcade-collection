import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class ChronoShiftEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0; lastTime = 0;
  score = 0; isGameOver = false;
  
  player = { x: 0, y: 0, targetX: 0, targetY: 0, isDragging: false };
  bullets: { x: number, y: number, vx: number, vy: number, speed: number }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number }[] = [];
  
  spawnTimer = 0;
  survivalTime = 0;
  
  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    
    this.resize();
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
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
    this.player = { x: this.width/2, y: this.height/2, targetX: this.width/2, targetY: this.height/2, isDragging: false };
    this.bullets = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.survivalTime = 0;
    
    // Spawn initial bullets
    for(let i=0; i<5; i++) this.spawnBullet();
    
    this.lastTime = performance.now();
  }
  
  start = () => { this.frame = requestAnimationFrame(this.loop); }
  
  stop = () => {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
  }
  
  handlePointerDown = (e: PointerEvent) => {
    if (this.isGameOver) return;
    this.player.isDragging = true;
    this.player.targetX = e.clientX;
    this.player.targetY = e.clientY;
  }
  
  handlePointerMove = (e: PointerEvent) => {
    if (this.player.isDragging) {
      this.player.targetX = e.clientX;
      this.player.targetY = e.clientY;
    }
  }
  
  handlePointerUp = (e: PointerEvent) => {
    this.player.isDragging = false;
  }
  
  spawnBullet = () => {
    const isHorizontal = Math.random() > 0.5;
    const x = isHorizontal ? (Math.random() > 0.5 ? 0 : this.width) : Math.random() * this.width;
    const y = isHorizontal ? Math.random() * this.height : (Math.random() > 0.5 ? 0 : this.height);
    
    const angle = Math.atan2(this.player.y - y, this.player.x - x) + (Math.random() - 0.5) * 0.5;
    
    this.bullets.push({
      x, y,
      vx: Math.cos(angle),
      vy: Math.sin(angle),
      speed: 3 + Math.random() * 2 + (this.survivalTime / 10000)
    });
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    // Time scaling logic
    // Calculate player movement intent
    const dx = this.player.targetX - this.player.x;
    const dy = this.player.targetY - this.player.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    let timeScale = 0.05; // Base slow time
    let moveDist = 0;
    
    if (this.player.isDragging && dist > 2) {
      moveDist = Math.min(dist, 10);
      timeScale = 0.1 + (moveDist / 10) * 0.9; // scales up to 1.0 based on how fast they drag/follow
    }
    
    const gameDt = dt * timeScale;
    
    // Move player
    if (this.player.isDragging && dist > 0) {
      this.player.x += (dx / dist) * moveDist;
      this.player.y += (dy / dist) * moveDist;
      
      if (Math.random() > 0.7) {
         this.particles.push({ x: this.player.x, y: this.player.y, vx: (Math.random()-0.5), vy: (Math.random()-0.5), life: 1 });
      }
    }
    
    // Score based on real survived time
    this.survivalTime += gameDt;
    if (Math.floor(this.survivalTime / 100) > this.score) {
      this.score = Math.floor(this.survivalTime / 100);
      this.callbacks.onScoreUpdate(this.score);
    }
    
    this.spawnTimer += gameDt;
    if (this.spawnTimer > 1000) {
      this.spawnTimer = 0;
      this.spawnBullet();
    }
    
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let b = this.bullets[i];
      b.x += b.vx * b.speed * timeScale * (dt / 16);
      b.y += b.vy * b.speed * timeScale * (dt / 16);
      
      // Bounce
      if (b.x < 0 || b.x > this.width) b.vx *= -1;
      if (b.y < 0 || b.y > this.height) b.vy *= -1;
      
      // Collision
      const pdx = b.x - this.player.x;
      const pdy = b.y - this.player.y;
      if (Math.sqrt(pdx*pdx + pdy*pdy) < 15) {
        this.isGameOver = true;
        this.callbacks.playTone(150, 'sawtooth', 0.5, 0.5, 50);
        this.callbacks.onGameOver(this.score);
        for(let p=0; p<30; p++) this.particles.push({ x: this.player.x, y: this.player.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1 });
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
    this.ctx.fillStyle = '#000000'; // zinc-950
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw bullets
    this.ctx.fillStyle = '#ef4444';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#ef4444';
    for (const b of this.bullets) {
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, 6, 0, Math.PI*2);
      this.ctx.fill();
    }
    
    // Draw particles
    this.ctx.shadowBlur = 0;
    for (const p of this.particles) {
      this.ctx.fillStyle = `rgba(250, 204, 21, ${p.life})`;
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    
    // Draw player
    if (!this.isGameOver) {
      this.ctx.fillStyle = '#facc15'; // yellow-400
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#facc15';
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, 10, 0, Math.PI*2);
      this.ctx.fill();
    }
  }
  
  loop = (time: number) => {
    const dt = time - this.lastTime;
    this.lastTime = time;
    if (dt < 100) this.update(dt);
    if(!this.running)return;
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  }
}
