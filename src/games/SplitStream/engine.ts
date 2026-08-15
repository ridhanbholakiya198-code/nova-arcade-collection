import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class SplitStreamEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0; lastTime = 0;
  score = 0; isGameOver = false;
  
  // Two ships. lane 0 = left, lane 1 = right (for each side)
  leftShip = { lane: 0, y: 0 }; 
  rightShip = { lane: 1, y: 0 };
  
  obstacles: { side: 'left'|'right', lane: number, y: number, passed: boolean }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number, color: string }[] = [];
  
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
    this.leftShip.y = this.height - 150;
    this.rightShip.y = this.height - 150;
  }
  
  reset = () => {
    this.score = 0;
    this.distance = 0;
    this.isGameOver = false;
    this.leftShip.lane = 0;
    this.rightShip.lane = 1;
    this.obstacles = [];
    this.particles = [];
    this.speed = 6;
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
    
    if (e.clientX < this.width / 2) {
      this.leftShip.lane = this.leftShip.lane === 0 ? 1 : 0;
      this.callbacks.playTone(300, 'sine', 0.1, 0.2);
    } else {
      this.rightShip.lane = this.rightShip.lane === 0 ? 1 : 0;
      this.callbacks.playTone(400, 'sine', 0.1, 0.2);
    }
  }
  
  getLaneX(side: 'left'|'right', lane: number) {
    const sideCenter = side === 'left' ? this.width / 4 : (this.width / 4) * 3;
    const offset = lane === 0 ? -40 : 40;
    return sideCenter + offset;
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    this.speed += 0.0005 * dt;
    this.distance += this.speed;
    
    if (Math.floor(this.distance / 100) > this.score) {
      this.score = Math.floor(this.distance / 100);
      this.callbacks.onScoreUpdate(this.score);
    }
    
    this.spawnTimer += dt;
    if (this.spawnTimer > 1000 / (this.speed / 6)) {
      this.spawnTimer = 0;
      
      // Spawn obstacle on random side, random lane
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const lane = Math.random() > 0.5 ? 0 : 1;
      this.obstacles.push({ side, lane, y: -50, passed: false });
      
      // Occasionally spawn on both sides
      if (Math.random() > 0.7) {
        const otherSide = side === 'left' ? 'right' : 'left';
        const otherLane = Math.random() > 0.5 ? 0 : 1;
        this.obstacles.push({ side: otherSide, lane: otherLane, y: -50, passed: false });
      }
    }
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      let ob = this.obstacles[i];
      ob.y += this.speed;
      
      // Collision
      const ship = ob.side === 'left' ? this.leftShip : this.rightShip;
      if (ship.lane === ob.lane) {
        if (Math.abs(ob.y - ship.y) < 30) {
          this.isGameOver = true;
          this.callbacks.playTone(150, 'sawtooth', 0.5, 0.5, 50);
          this.callbacks.onGameOver(this.score);
          const px = this.getLaneX(ob.side, ship.lane);
          for(let p=0; p<30; p++) this.particles.push({ x: px, y: ship.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1, color: ob.side === 'left' ? '#f472b6' : '#c084fc' });
        }
      }
      
      if (ob.y > this.height + 50) this.obstacles.splice(i, 1);
    }
    
    // Trail particles
    if (Math.random() > 0.5) {
      this.particles.push({ x: this.getLaneX('left', this.leftShip.lane), y: this.leftShip.y + 15, vx: (Math.random()-0.5), vy: 2, life: 1, color: '#f472b6' });
      this.particles.push({ x: this.getLaneX('right', this.rightShip.lane), y: this.rightShip.y + 15, vx: (Math.random()-0.5), vy: 2, life: 1, color: '#c084fc' });
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
    
    // Draw divider
    this.ctx.strokeStyle = '#27272a';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2, 0);
    this.ctx.lineTo(this.width / 2, this.height);
    this.ctx.stroke();
    
    // Draw lanes
    this.ctx.strokeStyle = '#18181b';
    this.ctx.setLineDash([10, 10]);
    [this.getLaneX('left', 0), this.getLaneX('left', 1), this.getLaneX('right', 0), this.getLaneX('right', 1)].forEach(x => {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    });
    this.ctx.setLineDash([]);
    
    // Draw obstacles
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#ef4444';
    this.ctx.fillStyle = '#ef4444';
    for (const ob of this.obstacles) {
      const x = this.getLaneX(ob.side, ob.lane);
      this.ctx.fillRect(x - 20, ob.y - 10, 40, 20);
    }
    
    // Draw particles
    this.ctx.shadowBlur = 0;
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    this.ctx.globalAlpha = 1;
    
    // Draw ships
    if (!this.isGameOver) {
      this.ctx.shadowBlur = 15;
      
      const lx = this.getLaneX('left', this.leftShip.lane);
      this.ctx.shadowColor = '#f472b6'; // pink-400
      this.ctx.fillStyle = '#f472b6';
      this.ctx.beginPath();
      this.ctx.moveTo(lx, this.leftShip.y - 15);
      this.ctx.lineTo(lx - 15, this.leftShip.y + 15);
      this.ctx.lineTo(lx + 15, this.leftShip.y + 15);
      this.ctx.fill();
      
      const rx = this.getLaneX('right', this.rightShip.lane);
      this.ctx.shadowColor = '#c084fc'; // purple-400
      this.ctx.fillStyle = '#c084fc';
      this.ctx.beginPath();
      this.ctx.moveTo(rx, this.rightShip.y - 15);
      this.ctx.lineTo(rx - 15, this.rightShip.y + 15);
      this.ctx.lineTo(rx + 15, this.rightShip.y + 15);
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
