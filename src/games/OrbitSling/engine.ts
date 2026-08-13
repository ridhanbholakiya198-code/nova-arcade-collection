export class OrbitEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number = 0;
  height: number = 0;
  
  // Game State
  frame: number = 0;
  lastTime: number = 0;
  score: number = 0;
  isGameOver: boolean = false;
  cameraY: number = 0;
  
  // Entities
  player = { x: 0, y: 0, vx: 0, vy: -5, radius: 8, tethered: false, tetherNode: null as any };
  nodes: { x: number, y: number, radius: number, active: boolean, id: number }[] = [];
  particles: { x: number, y: number, vx: number, vy: number, life: number, maxLife: number, color: string }[] = [];
  
  // Configuration
  GRAVITY = 0.15;
  TETHER_FORCE = 0.8;
  MAX_TETHER_DIST = 200;
  SCROLL_SPEED = 2; // the bottom hazard moves up
  hazardY = 0;

  // Callbacks
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onTetherPlay: () => void;
  onLaunchPlay: () => void;
  onCrashPlay: () => void;

  constructor(
    canvas: HTMLCanvasElement, 
    callbacks: { 
      onScoreUpdate: (s: number) => void, 
      onGameOver: (s: number) => void,
      onTetherPlay: () => void,
      onLaunchPlay: () => void,
      onCrashPlay: () => void,
    }
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onScoreUpdate = callbacks.onScoreUpdate;
    this.onGameOver = callbacks.onGameOver;
    this.onTetherPlay = callbacks.onTetherPlay;
    this.onLaunchPlay = callbacks.onLaunchPlay;
    this.onCrashPlay = callbacks.onCrashPlay;

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
    this.player = { x: this.width / 2, y: this.height - 200, vx: 0, vy: -8, radius: 10, tethered: false, tetherNode: null };
    this.nodes = [];
    this.particles = [];
    this.cameraY = this.player.y - this.height / 1.5;
    this.hazardY = this.height;
    this.score = 0;
    this.isGameOver = false;
    
    // Initial nodes
    for(let i=0; i<10; i++) {
      this.spawnNode(this.height - 400 - (i * 200));
    }

    this.lastTime = performance.now();
  }

  start = () => {
    this.frame = requestAnimationFrame(this.loop);
  }

  stop = () => {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
  }

  spawnNode = (baseY: number) => {
    this.nodes.push({
      id: Math.random(),
      x: 50 + Math.random() * (this.width - 100),
      y: baseY + (Math.random() * 100 - 50),
      radius: 12,
      active: true
    });
  }

  spawnParticles = (x: number, y: number, count: number, color: string) => {
    for(let i=0; i<count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 20 + Math.random() * 30,
        color
      });
    }
  }

  handlePointerDown = (e: PointerEvent) => {
    e.preventDefault();
    if (this.isGameOver) {
      this.reset();
      return;
    }
    
    // Find nearest node
    let nearest = null;
    let minDist = this.MAX_TETHER_DIST;
    
    for (const node of this.nodes) {
      const dx = node.x - this.player.x;
      const dy = node.y - this.player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }

    if (nearest) {
      this.player.tethered = true;
      this.player.tetherNode = nearest;
      this.onTetherPlay();
      this.spawnParticles(nearest.x, nearest.y, 10, '#f59e0b'); // amber-500
    }
  }

  handlePointerUp = (e: PointerEvent) => {
    e.preventDefault();
    if (this.player.tethered) {
      this.player.tethered = false;
      this.player.tetherNode = null;
      this.onLaunchPlay();
      this.spawnParticles(this.player.x, this.player.y, 15, '#fff');
    }
  }

  update = (dt: number) => {
    if (this.isGameOver) return;

    // Apply basic physics
    this.player.vy += this.GRAVITY;
    
    if (this.player.tethered && this.player.tetherNode) {
      // Spring/Tether physics (centripetal-ish)
      const node = this.player.tetherNode;
      const dx = node.x - this.player.x;
      const dy = node.y - this.player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 0) {
        // Accelerate towards node to create swinging motion
        this.player.vx += (dx / dist) * this.TETHER_FORCE;
        this.player.vy += (dy / dist) * this.TETHER_FORCE;
      }
      
      // Dampen velocity slightly to stabilize orbit
      this.player.vx *= 0.99;
      this.player.vy *= 0.99;
    }

    // Move player
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Wall bounce
    if (this.player.x < this.player.radius) {
      this.player.x = this.player.radius;
      this.player.vx *= -0.8;
    } else if (this.player.x > this.width - this.player.radius) {
      this.player.x = this.width - this.player.radius;
      this.player.vx *= -0.8;
    }

    // Camera follow (smooth)
    const targetCameraY = this.player.y - this.height * 0.6;
    if (targetCameraY < this.cameraY) {
      this.cameraY += (targetCameraY - this.cameraY) * 0.1;
    }

    // Advance Hazard
    const hazardSpeed = this.SCROLL_SPEED + (this.score * 0.005);
    this.hazardY = Math.min(this.hazardY, this.cameraY + this.height); 
    this.hazardY -= hazardSpeed;

    // Death check
    if (this.player.y > this.hazardY) {
      this.isGameOver = true;
      this.onCrashPlay();
      this.spawnParticles(this.player.x, this.player.y, 50, '#ef4444');
      this.onGameOver(Math.floor(this.score));
      return;
    }

    // Score update
    const currentScore = Math.max(0, -this.player.y + (this.height - 200));
    if (currentScore > this.score) {
      this.score = currentScore;
      if (Math.floor(this.score) % 100 === 0) {
         // Could play score beep here
      }
      this.onScoreUpdate(Math.floor(this.score));
    }

    // Generate new nodes
    const highestNode = this.nodes.reduce((min, n) => n.y < min ? n.y : min, this.hazardY);
    if (highestNode > this.cameraY - 200) {
      this.spawnNode(highestNode - 150 - Math.random()*150);
    }

    // Cleanup nodes
    this.nodes = this.nodes.filter(n => n.y < this.hazardY + 100);

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife) this.particles.splice(i, 1);
    }
    
    // Trail particles
    if (Math.random() > 0.5) {
      this.particles.push({
        x: this.player.x, y: this.player.y,
        vx: -this.player.vx * 0.2 + (Math.random()-0.5),
        vy: -this.player.vy * 0.2 + (Math.random()-0.5),
        life: 1, maxLife: 15,
        color: this.player.tethered ? '#f59e0b' : '#38bdf8'
      });
    }
  }

  draw = () => {
    // Clear
    this.ctx.fillStyle = '#000000'; // zinc-950
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(0, -this.cameraY);

    // Draw grid lines (subtle)
    this.ctx.strokeStyle = '#27272a'; // zinc-800
    this.ctx.lineWidth = 1;
    const gridOffsetY = this.cameraY % 100;
    for(let y = 0; y < this.height + 100; y += 100) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + this.cameraY - gridOffsetY);
      this.ctx.lineTo(this.width, y + this.cameraY - gridOffsetY);
      this.ctx.stroke();
    }

    // Draw Tether line
    if (this.player.tethered && this.player.tetherNode) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.player.x, this.player.y);
      this.ctx.lineTo(this.player.tetherNode.x, this.player.tetherNode.y);
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw Nodes
    for (const node of this.nodes) {
      // Find distance
      const dx = node.x - this.player.x;
      const dy = node.y - this.player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      const inRange = dist < this.MAX_TETHER_DIST;
      const isTarget = this.player.tetherNode === node;

      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      
      if (isTarget) {
        this.ctx.fillStyle = '#fef3c7';
        this.ctx.shadowColor = '#f59e0b';
        this.ctx.shadowBlur = 15;
      } else if (inRange) {
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.shadowColor = '#d97706';
        this.ctx.shadowBlur = 10;
      } else {
        this.ctx.fillStyle = '#3f3f46';
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
      }
      this.ctx.fill();
    }

    // Draw Particles
    this.ctx.shadowBlur = 0;
    for (const p of this.particles) {
      this.ctx.globalAlpha = 1 - (p.life / p.maxLife);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    // Draw Player
    if (!this.isGameOver) {
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = this.player.tethered ? '#f59e0b' : '#38bdf8';
      this.ctx.shadowBlur = 20;
      this.ctx.fill();
    }

    // Draw Hazard Line (Bottom)
    this.ctx.shadowBlur = 0;
    const gradient = this.ctx.createLinearGradient(0, this.hazardY, 0, this.hazardY + 200);
    gradient.addColorStop(0, '#ef4444');
    gradient.addColorStop(1, '#7f1d1d');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, this.hazardY, this.width, this.height);
    
    // Laser edge
    this.ctx.fillStyle = '#fca5a5';
    this.ctx.fillRect(0, this.hazardY - 2, this.width, 4);

    this.ctx.restore();
    
    // Draw Game Over Screen overlay (simple text, React handles the rest)
    if (this.isGameOver) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  loop = (time: number) => {
    const dt = time - this.lastTime;
    this.lastTime = time;
    
    // Cap dt to prevent physics explosions on lag spikes
    if (dt < 100) {
       this.update(dt);
    }
    this.draw();
    
    this.frame = requestAnimationFrame(this.loop);
  }
}
