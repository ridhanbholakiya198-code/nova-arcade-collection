import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class QuantumLinkEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0;\n  running = false; lastTime = 0;
  score = 0; isGameOver = false;
  
  nodes: { id: number, x: number, y: number, vx: number, vy: number, color: string }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number, color: string }[] = [];
  
  colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']; // blue, red, green, yellow
  
  dragStart: { x: number, y: number, node: any } | null = null;
  dragCurrent: { x: number, y: number } | null = null;
  
  spawnTimer = 0;
  spawnRate = 2000;
  
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
    this.nodes = [];
    this.particles = [];
    this.dragStart = null;
    this.dragCurrent = null;
    this.spawnTimer = 0;
    this.spawnRate = 2000;
    this.lastTime = performance.now();
    
    for(let i=0; i<4; i++) this.spawnNodePair();
  }
  
  start = () => { if (this.running || this.isGameOver) return; this.running = true; this.lastTime = performance.now(); this.frame = requestAnimationFrame(this.loop); }
  
  stop = () => {
    this.running = false; cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
  }
  
  spawnNodePair = () => {
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    for(let i=0; i<2; i++) {
      this.nodes.push({
        id: Math.random(),
        x: 50 + Math.random() * (this.width - 100),
        y: 100 + Math.random() * (this.height - 200),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color
      });
    }
  }
  
  handlePointerDown = (e: PointerEvent) => {
    if (this.isGameOver) return;
    
    for (const n of this.nodes) {
      const dx = n.x - e.clientX;
      const dy = n.y - e.clientY;
      if (Math.sqrt(dx*dx + dy*dy) < 30) {
        this.dragStart = { x: n.x, y: n.y, node: n };
        this.dragCurrent = { x: e.clientX, y: e.clientY };
        this.callbacks.playTone(300, 'sine', 0.1, 0.1);
        break;
      }
    }
  }
  
  handlePointerMove = (e: PointerEvent) => {
    if (this.dragStart) {
      this.dragCurrent = { x: e.clientX, y: e.clientY };
    }
  }
  
  handlePointerUp = (e: PointerEvent) => {
    if (this.dragStart && this.dragCurrent) {
      // Find if released on a matching node
      let targetNode = null;
      for (const n of this.nodes) {
        if (n.id === this.dragStart.node.id) continue;
        const dx = n.x - e.clientX;
        const dy = n.y - e.clientY;
        if (Math.sqrt(dx*dx + dy*dy) < 30) {
          targetNode = n;
          break;
        }
      }
      
      if (targetNode && targetNode.color === this.dragStart.node.color) {
        // Success link!
        this.score += 10;
        this.callbacks.onScoreUpdate(this.score);
        this.callbacks.playTone(600, 'square', 0.1, 0.2);
        
        // Spawn particles
        for(let p=0; p<20; p++) {
          this.particles.push({ x: targetNode.x, y: targetNode.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1, color: targetNode.color });
          this.particles.push({ x: this.dragStart.node.x, y: this.dragStart.node.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1, color: targetNode.color });
        }
        
        // Remove nodes
        this.nodes = this.nodes.filter(n => n.id !== this.dragStart!.node.id && n.id !== targetNode!.id);
      } else if (targetNode) {
        // Wrong link
        this.callbacks.playTone(150, 'sawtooth', 0.2, 0.3);
      }
    }
    this.dragStart = null;
    this.dragCurrent = null;
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    // Move nodes
    for (const n of this.nodes) {
      n.x += n.vx * (dt / 16);
      n.y += n.vy * (dt / 16);
      
      if (n.x < 20 || n.x > this.width - 20) n.vx *= -1;
      if (n.y < 100 || n.y > this.height - 50) n.vy *= -1;
    }
    
    this.spawnTimer += dt;
    if (this.spawnTimer > this.spawnRate) {
      this.spawnTimer = 0;
      this.spawnRate = Math.max(800, this.spawnRate * 0.95);
      this.spawnNodePair();
    }
    
    // Death condition
    if (this.nodes.length > 20) {
      this.isGameOver = true;
      this.callbacks.playTone(100, 'sawtooth', 0.5, 0.5, 50);
      this.callbacks.onGameOver(this.score);
      for (const n of this.nodes) {
         for(let p=0; p<10; p++) this.particles.push({ x: n.x, y: n.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1, color: n.color });
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].x += this.particles[i].vx;
      this.particles[i].y += this.particles[i].vy;
      this.particles[i].life -= 0.03;
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }
  
  draw = () => {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw drag line
    if (this.dragStart && this.dragCurrent) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.dragStart.node.x, this.dragStart.node.y);
      this.ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
      this.ctx.strokeStyle = this.dragStart.node.color;
      this.ctx.lineWidth = 4;
      this.ctx.setLineDash([10, 10]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
    
    // Draw nodes
    for (const n of this.nodes) {
      this.ctx.fillStyle = n.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = n.color;
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, 15, 0, Math.PI*2);
      this.ctx.fill();
    }
    
    // Draw particles
    this.ctx.shadowBlur = 0;
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    this.ctx.globalAlpha = 1;
    
    // Danger overlay
    if (!this.isGameOver && this.nodes.length > 14) {
      this.ctx.fillStyle = `rgba(239, 68, 68, ${((this.nodes.length - 14) / 6) * 0.3})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
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
