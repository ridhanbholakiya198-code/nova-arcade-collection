import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class NovaCoreEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0; lastTime = 0;
  score = 0; isGameOver = false;
  
  player = { x: 0, y: 0, targetX: 0, targetY: 0, isDragging: false, weaponTimer: 0 };
  bullets: { x: number, y: number, vy: number }[] = [];
  enemies: { x: number, y: number, vx: number, vy: number, hp: number, maxHp: number }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number, color: string }[] = [];
  
  spawnTimer = 0;
  spawnRate = 1500;
  
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
    this.player = { x: this.width/2, y: this.height - 150, targetX: this.width/2, targetY: this.height - 150, isDragging: false, weaponTimer: 0 };
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.spawnRate = 1500;
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
    this.player.targetY = e.clientY - 50; // offset so finger doesn't block ship
  }
  
  handlePointerMove = (e: PointerEvent) => {
    if (this.player.isDragging) {
      this.player.targetX = e.clientX;
      this.player.targetY = e.clientY - 50;
    }
  }
  
  handlePointerUp = (e: PointerEvent) => {
    this.player.isDragging = false;
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    // Player movement
    if (this.player.isDragging) {
      this.player.x += (this.player.targetX - this.player.x) * 0.3;
      this.player.y += (this.player.targetY - this.player.y) * 0.3;
    }
    
    // Shoot
    this.player.weaponTimer += dt;
    if (this.player.weaponTimer > 150) { // fire rate
      this.player.weaponTimer = 0;
      this.bullets.push({ x: this.player.x - 10, y: this.player.y, vy: -15 });
      this.bullets.push({ x: this.player.x + 10, y: this.player.y, vy: -15 });
      this.callbacks.playTone(800, 'square', 0.05, 0.05);
    }
    
    // Spawn enemies
    this.spawnTimer += dt;
    if (this.spawnTimer > this.spawnRate) {
      this.spawnTimer = 0;
      this.spawnRate = Math.max(400, this.spawnRate * 0.95);
      
      const hp = 1 + Math.floor(this.score / 50);
      this.enemies.push({
        x: 50 + Math.random() * (this.width - 100),
        y: -50,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 2 + (this.score * 0.01),
        hp, maxHp: hp
      });
    }
    
    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y += b.vy * (dt / 16);
      
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const en = this.enemies[j];
        if (Math.abs(b.x - en.x) < 20 && Math.abs(b.y - en.y) < 20) {
          en.hp--;
          hit = true;
          for(let p=0; p<3; p++) this.particles.push({ x: b.x, y: b.y, vx: (Math.random()-0.5)*5, vy: Math.random()*5, life: 1, color: '#fcd34d' });
          
          if (en.hp <= 0) {
            this.enemies.splice(j, 1);
            this.score += 5;
            this.callbacks.onScoreUpdate(this.score);
            this.callbacks.playTone(300, 'sawtooth', 0.1, 0.1);
            for(let p=0; p<15; p++) this.particles.push({ x: en.x, y: en.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1, color: '#c084fc' });
          }
          break;
        }
      }
      
      if (hit || b.y < -50) this.bullets.splice(i, 1);
    }
    
    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      en.x += en.vx * (dt / 16);
      en.y += en.vy * (dt / 16);
      
      if (en.x < 20 || en.x > this.width - 20) en.vx *= -1;
      
      // Hit player
      if (Math.abs(en.x - this.player.x) < 20 && Math.abs(en.y - this.player.y) < 20) {
        this.isGameOver = true;
        this.callbacks.playTone(150, 'sawtooth', 0.5, 0.5, 50);
        this.callbacks.onGameOver(this.score);
        for(let p=0; p<40; p++) this.particles.push({ x: this.player.x, y: this.player.y, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1, color: '#fff' });
      }
      
      if (en.y > this.height + 50) this.enemies.splice(i, 1);
    }
    
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].x += this.particles[i].vx;
      this.particles[i].y += this.particles[i].vy;
      this.particles[i].life -= 0.05;
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }
  
  draw = () => {
    this.ctx.fillStyle = '#09090b';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw bullets
    this.ctx.fillStyle = '#fcd34d'; // amber-300
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#fcd34d';
    for (const b of this.bullets) {
      this.ctx.fillRect(b.x - 2, b.y - 8, 4, 16);
    }
    
    // Draw enemies
    this.ctx.shadowColor = '#c084fc';
    for (const en of this.enemies) {
      this.ctx.fillStyle = `rgba(192, 132, 252, ${en.hp / en.maxHp})`;
      this.ctx.beginPath();
      this.ctx.moveTo(en.x, en.y + 15);
      this.ctx.lineTo(en.x - 15, en.y - 10);
      this.ctx.lineTo(en.x + 15, en.y - 10);
      this.ctx.fill();
    }
    
    // Draw particles
    this.ctx.shadowBlur = 0;
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    this.ctx.globalAlpha = 1;
    
    // Draw player
    if (!this.isGameOver) {
      this.ctx.fillStyle = '#f8fafc'; // slate-50
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#fff';
      this.ctx.beginPath();
      this.ctx.moveTo(this.player.x, this.player.y - 15);
      this.ctx.lineTo(this.player.x - 15, this.player.y + 15);
      this.ctx.lineTo(this.player.x + 15, this.player.y + 15);
      this.ctx.fill();
      
      // Core glow
      this.ctx.fillStyle = '#fcd34d';
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y + 5, 5, 0, Math.PI*2);
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
