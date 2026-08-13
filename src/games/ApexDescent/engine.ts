import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

export class ApexDescentEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  
  width = 0; height = 0;
  frame = 0; lastTime = 0;
  score = 0; isGameOver = false;
  
  player = { angle: Math.PI / 2, targetAngle: Math.PI / 2, radius: 0, isDragging: false }; // radius will be set to screen size
  beams: { angle: number, width: number, z: number, passed: boolean }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number }[] = [];
  
  speed = 0.02; // z-speed
  spawnTimer = 0;
  
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
    this.player.radius = Math.min(this.width, this.height) * 0.4;
  }
  
  reset = () => {
    this.score = 0;
    this.isGameOver = false;
    this.player.angle = Math.PI / 2;
    this.player.targetAngle = Math.PI / 2;
    this.beams = [];
    this.particles = [];
    this.speed = 0.005;
    this.spawnTimer = 0;
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
  
  updateAngleFromEvent = (e: PointerEvent) => {
    const cx = this.width / 2;
    const cy = this.height / 2;
    this.player.targetAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
  }
  
  handlePointerDown = (e: PointerEvent) => {
    if (this.isGameOver) return;
    this.player.isDragging = true;
    this.updateAngleFromEvent(e);
  }
  
  handlePointerMove = (e: PointerEvent) => {
    if (this.player.isDragging) {
      this.updateAngleFromEvent(e);
    }
  }
  
  handlePointerUp = (e: PointerEvent) => {
    this.player.isDragging = false;
  }
  
  update = (dt: number) => {
    if (this.isGameOver) return;
    
    this.speed += 0.00001 * dt;
    
    // Smooth angle rotation (shortest path)
    let diff = this.player.targetAngle - this.player.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.player.angle += diff * 0.2;
    
    this.spawnTimer += dt;
    if (this.spawnTimer > 1000 / (this.speed * 200)) {
      this.spawnTimer = 0;
      this.beams.push({
        angle: Math.random() * Math.PI * 2,
        width: 0.3 + Math.random() * 0.4, // angular width in radians
        z: 0.01,
        passed: false
      });
      
      // Sometimes double beams
      if (Math.random() > 0.7) {
        this.beams.push({
          angle: Math.random() * Math.PI * 2,
          width: 0.2 + Math.random() * 0.3,
          z: 0.01,
          passed: false
        });
      }
    }
    
    for (let i = this.beams.length - 1; i >= 0; i--) {
      let b = this.beams[i];
      b.z += this.speed * dt;
      
      // Collision when z is around 1 (where player is)
      if (b.z > 0.9 && b.z < 1.1) {
        let pAngle = this.player.angle;
        while (pAngle < 0) pAngle += Math.PI * 2;
        let bAngle = b.angle;
        while (bAngle < 0) bAngle += Math.PI * 2;
        
        let aDiff = Math.abs(pAngle - bAngle);
        if (aDiff > Math.PI) aDiff = Math.PI * 2 - aDiff;
        
        if (aDiff < b.width / 2 + 0.05) { // 0.05 player radius in radians approx
          this.isGameOver = true;
          this.callbacks.playTone(150, 'sawtooth', 0.5, 0.5, 50);
          this.callbacks.onGameOver(this.score);
          
          const px = this.width/2 + Math.cos(this.player.angle) * this.player.radius;
          const py = this.height/2 + Math.sin(this.player.angle) * this.player.radius;
          for(let p=0; p<40; p++) this.particles.push({ x: px, y: py, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1 });
        } else if (!b.passed && b.z > 1.0) {
          b.passed = true;
          this.score += 10;
          this.callbacks.onScoreUpdate(this.score);
        }
      }
      
      if (b.z > 2.0) {
        this.beams.splice(i, 1);
      }
    }
    
    // Particles
    const px = this.width/2 + Math.cos(this.player.angle) * this.player.radius;
    const py = this.height/2 + Math.sin(this.player.angle) * this.player.radius;
    this.particles.push({ x: px, y: py, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, life: 1 });
    
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
    
    const cx = this.width / 2;
    const cy = this.height / 2;
    
    // Draw tunnel rings
    this.ctx.strokeStyle = '#27272a';
    this.ctx.lineWidth = 1;
    for(let r = 0.1; r < 2.0; r += 0.2) {
      // simulate speed by offsetting
      const zOffset = (this.score * this.speed * 0.1) % 0.2;
      const actualR = r + zOffset;
      if (actualR > 2.0) continue;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, actualR * this.player.radius, 0, Math.PI*2);
      this.ctx.stroke();
    }
    
    // Draw beams
    this.ctx.fillStyle = '#f43f5e'; // rose-500
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#f43f5e';
    for (const b of this.beams) {
      this.ctx.beginPath();
      // Draw as a wedge. Thicker at edge, thinner at center.
      // We'll draw an arc at z, connected to an arc at z+0.1
      const innerR = b.z * this.player.radius;
      const outerR = (b.z + 0.1) * this.player.radius;
      
      this.ctx.arc(cx, cy, innerR, b.angle - b.width/2, b.angle + b.width/2);
      this.ctx.arc(cx, cy, outerR, b.angle + b.width/2, b.angle - b.width/2, true);
      this.ctx.fill();
    }
    
    // Draw particles
    this.ctx.shadowBlur = 0;
    for (const p of this.particles) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    
    // Draw player
    if (!this.isGameOver) {
      this.ctx.fillStyle = '#fff';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#fff';
      this.ctx.beginPath();
      const px = cx + Math.cos(this.player.angle) * this.player.radius;
      const py = cy + Math.sin(this.player.angle) * this.player.radius;
      this.ctx.arc(px, py, 12, 0, Math.PI*2);
      this.ctx.fill();
      
      // Tether to center
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(px, py);
      this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
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
