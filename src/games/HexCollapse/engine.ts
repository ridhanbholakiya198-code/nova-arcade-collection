import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class HexCollapseEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0; lastTime = 0;
  score = 0; isGameOver = false;
  
  player = { col: 0, row: 0, x: 0, y: 0, targetX: 0, targetY: 0, jumping: false };
  hexes: { col: number, row: number, x: number, y: number, state: 'solid' | 'falling', life: number }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number, color: string }[] = [];
  
  hexRadius = 40;
  cameraY = 0;
  
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
    
    // smaller hexes on small screens
    this.hexRadius = Math.min(40, this.width / 8);
  }
  
  getHexPos(col: number, row: number) {
    const width = Math.sqrt(3) * this.hexRadius;
    const height = 2 * this.hexRadius;
    const x = this.width / 2 + col * width + (row % 2) * (width / 2);
    const y = this.height / 3 + row * height * 0.75;
    return { x, y };
  }
  
  reset = () => {
    this.score = 0;
    this.isGameOver = false;
    this.cameraY = 0;
    this.player = { col: 0, row: 0, x: 0, y: 0, targetX: 0, targetY: 0, jumping: false };
    
    const p = this.getHexPos(0, 0);
    this.player.x = p.x;
    this.player.y = p.y;
    this.player.targetX = p.x;
    this.player.targetY = p.y;
    
    this.hexes = [];
    this.particles = [];
    
    // Spawn initial grid
    for(let r=0; r<10; r++) {
      this.spawnRow(r);
    }
    
    this.lastTime = performance.now();
  }
  
  spawnRow = (r: number) => {
    // Generate valid paths
    for(let c=-3; c<=3; c++) {
      if (Math.random() > 0.3 || (c === 0 && r === 0)) {
        const p = this.getHexPos(c, r);
        this.hexes.push({ col: c, row: r, x: p.x, y: p.y, state: 'solid', life: 1 });
      }
    }
  }
  
  start = () => { this.frame = requestAnimationFrame(this.loop); }
  
  stop = () => {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.handleTap);
  }
  
  handleTap = (e: PointerEvent) => {
    if (this.isGameOver || this.player.jumping) return;
    
    const isLeft = e.clientX < this.width / 2;
    
    // Current hex falls
    const currentHex = this.hexes.find(h => h.col === this.player.col && h.row === this.player.row);
    if (currentHex) currentHex.state = 'falling';
    
    // Determine new pos
    // if row is even: left is (col-1, row+1), right is (col, row+1)
    // if row is odd: left is (col, row+1), right is (col+1, row+1)
    
    const isOdd = Math.abs(this.player.row) % 2 === 1;
    let nextCol = this.player.col;
    if (isLeft) {
      nextCol = isOdd ? this.player.col : this.player.col - 1;
    } else {
      nextCol = isOdd ? this.player.col + 1 : this.player.col;
    }
    const nextRow = this.player.row + 1;
    
    this.player.col = nextCol;
    this.player.row = nextRow;
    
    const p = this.getHexPos(this.player.col, this.player.row);
    this.player.targetX = p.x;
    this.player.targetY = p.y;
    this.player.jumping = true;
    
    this.callbacks.playTone(400, 'square', 0.1, 0.1);
    
    // Spawn more ahead
    if (this.hexes.filter(h => h.row === nextRow + 8).length === 0) {
      this.spawnRow(nextRow + 8);
    }
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    // Camera
    const targetCam = this.player.y - this.height / 3;
    if (targetCam > this.cameraY) {
      this.cameraY += (targetCam - this.cameraY) * 0.1;
    }
    
    // Player jump
    if (this.player.jumping) {
      const dx = this.player.targetX - this.player.x;
      const dy = this.player.targetY - this.player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 5) {
        this.player.x = this.player.targetX;
        this.player.y = this.player.targetY;
        this.player.jumping = false;
        
        this.score += 1;
        this.callbacks.onScoreUpdate(this.score);
        
        // Landed. Check if hex exists
        const landedHex = this.hexes.find(h => h.col === this.player.col && h.row === this.player.row && h.state === 'solid');
        if (!landedHex) {
          // Fell into void
          this.isGameOver = true;
          this.callbacks.playTone(150, 'sawtooth', 0.5, 0.5, 50);
          this.callbacks.onGameOver(this.score);
          for(let p=0; p<30; p++) this.particles.push({ x: this.player.x, y: this.player.y, vx: (Math.random()-0.5)*10, vy: -5 + (Math.random()-0.5)*10, life: 1, color: '#fff' });
        } else {
          // Particles on landing
          for(let p=0; p<5; p++) this.particles.push({ x: this.player.x, y: this.player.y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life: 1, color: '#818cf8' });
        }
      } else {
        this.player.x += dx * 0.2;
        this.player.y += dy * 0.2;
      }
    }
    
    // Update hexes
    for (let i = this.hexes.length - 1; i >= 0; i--) {
      let h = this.hexes[i];
      if (h.state === 'falling') {
        h.life -= 0.02 * dt;
        h.y += 0.5 * dt; // fall down visually
        if (h.life <= 0) this.hexes.splice(i, 1);
      }
      
      // Cleanup old hexes behind camera
      if (h.y < this.cameraY - 200) {
         this.hexes.splice(i, 1);
      }
    }
    
    // Floor falling automatically
    // The lowest solid hexes fall over time to force player to move
    const minRow = this.hexes.reduce((min, h) => (h.state === 'solid' && h.row < min) ? h.row : min, 99999);
    if (minRow < this.player.row - 2) {
      this.hexes.filter(h => h.row === minRow).forEach(h => h.state = 'falling');
    }
    
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].x += this.particles[i].vx;
      this.particles[i].y += this.particles[i].vy;
      this.particles[i].life -= 0.02 * dt;
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }
  
  drawHex(x: number, y: number, r: number, fill: string) {
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = 2 * Math.PI / 6 * (i + 0.5); // point up
      const hx = x + r * Math.cos(angle);
      const hy = y + r * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(hx, hy);
      else this.ctx.lineTo(hx, hy);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = fill;
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.stroke();
  }
  
  draw = () => {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.save();
    this.ctx.translate(0, -this.cameraY);
    
    for (const h of this.hexes) {
      const scale = h.state === 'falling' ? h.life : 1;
      const opacity = h.state === 'falling' ? h.life : 1;
      const color = h.state === 'falling' ? `rgba(99, 102, 241, ${opacity})` : '#4f46e5'; // indigo-600
      this.drawHex(h.x, h.y, (this.hexRadius - 2) * scale, color);
    }
    
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(p.x, p.y, 4, 4);
    }
    this.ctx.globalAlpha = 1;
    
    if (!this.isGameOver) {
      // Draw player (a diamond/cube)
      this.ctx.fillStyle = '#fff';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#818cf8';
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y - (this.player.jumping ? 15 : 0), 10, 0, Math.PI*2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }
  
  loop = (time: number) => {
    const dt = time - this.lastTime;
    this.lastTime = time;
    if (dt < 100) this.update(dt);
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  }
}
