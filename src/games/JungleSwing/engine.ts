import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

// ---------------------------------------------------------------------------
// Jungle Swing — a small original 2D landscape platformer adventure.
// Free left/right movement, jump + throw buttons, patrol enemies, climbable
// vines, elevated platforms, pits, and 5 hand-built stages with unlockable
// skills. Everything here — world, character, enemies — is original: no
// assets, level data, or code from any existing game.
// ---------------------------------------------------------------------------

type Pit = { x: number; width: number };
type Platform = { x: number; width: number; y: number };
type VineClimb = { x: number; topY: number; bottomY: number };
type Enemy = { x: number; baseX: number; range: number; dir: number; alive: boolean; type: 'crawler' | 'croc'; groundY: number };
type Gem = { x: number; y: number; taken: boolean };
type Projectile = { x: number; y: number; dir: number };
type Coconut = { x: number; y: number; alive: boolean };
type SwingLog = { anchorX: number; y: number; swingLen: number; t0: number };
type ButtonId = 'left' | 'right' | 'jump' | 'action';

interface StageConfig {
  name: string;
  sky: [string, string];
  length: number;
  groundYFrac: number;
  hazardType: 'none' | 'coconut' | 'croc' | 'log' | 'chase';
  gemCount: number;
  enemyCount: number;
  unlocksSkill?: 'doubleJump' | 'quickThrow' | 'sprint';
}

const STAGES: StageConfig[] = [
  { name: 'Canopy Vines', sky: ['#0c2e1a', '#04140b'], length: 2400, groundYFrac: 0.78, hazardType: 'none', gemCount: 8, enemyCount: 3 },
  { name: 'Rope Canyon', sky: ['#1b2a12', '#060f05'], length: 2800, groundYFrac: 0.78, hazardType: 'coconut', gemCount: 9, enemyCount: 4, unlocksSkill: 'doubleJump' },
  { name: 'River Rapids', sky: ['#0a2e35', '#031014'], length: 3000, groundYFrac: 0.76, hazardType: 'croc', gemCount: 10, enemyCount: 5, unlocksSkill: 'quickThrow' },
  { name: 'Cliffside Climb', sky: ['#2a1e12', '#0c0704'], length: 3200, groundYFrac: 0.78, hazardType: 'log', gemCount: 10, enemyCount: 5, unlocksSkill: 'sprint' },
  { name: 'Temple Ruins', sky: ['#241030', '#08040c'], length: 3600, groundYFrac: 0.78, hazardType: 'chase', gemCount: 12, enemyCount: 6 },
];

interface Progress {
  unlockedStage: number;
  bestGems: number[];
  skills: { doubleJump: boolean; quickThrow: boolean; sprint: boolean };
}
const PROGRESS_KEY = 'nova_jungle_progress_v2';
function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.unlockedStage === 'number') return p;
    }
  } catch { /* ignore corrupt storage */ }
  return { unlockedStage: 1, bestGems: [0, 0, 0, 0, 0], skills: { doubleJump: false, quickThrow: false, sprint: false } };
}
function saveProgress(p: Progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* storage may be unavailable */ }
}

// Tiny pixel-art sprites (no image assets — drawn as colored pixel grids).
const PLAYER_ROWS = [
  '..hhhhhh..',
  '.hhhhhhhh.',
  '.hssssssh.',
  '.sssesess.',
  '..ssssss..',
  '..gdggdg..',
  '.ggdggdgg.',
  '.ggdggdgg.',
  '..pp..pp..',
  '..pp..pp..',
  '..kk..kk..',
];
const PLAYER_COLORS: Record<string, string> = {
  h: '#78350f', s: '#f4b184', e: '#1c1917', g: '#16a34a', d: '#15803d', p: '#3f6212', k: '#1c1917',
};
const CRAWLER_ROWS = [
  '..oooo..',
  '.oooooo.',
  'oo.mm.oo',
  'oooooooo',
  'o.o..o.o',
];

function drawSprite(c: CanvasRenderingContext2D, rows: string[], colors: Record<string, string>, x: number, y: number, px: number, flip: boolean) {
  const h = rows.length, w = rows[0].length;
  for (let r = 0; r < h; r++) {
    const row = rows[r];
    for (let col = 0; col < w; col++) {
      const ch = row[col];
      if (ch === '.') continue;
      const color = colors[ch];
      if (!color) continue;
      const cx = flip ? (w - 1 - col) : col;
      c.fillStyle = color;
      c.fillRect(x + cx * px, y + r * px, px, px);
    }
  }
}

type SceneState = 'select' | 'playing' | 'cleared' | 'failed';
type Btn = { x: number; y: number; r: number };

export class JungleSwingEngine implements GameEngine {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; callbacks: GameEngineCallbacks;
  w = 0; h = 0; frame = 0; last = 0; running = false; gameOver = false;
  totalScore = 0;
  progress: Progress = loadProgress();
  scene: SceneState = 'select';
  sceneTimer = 0;
  time = 0; landscape = true;

  stageIdx = 0;
  groundY = 0;
  pits: Pit[] = []; platforms: Platform[] = []; vines: VineClimb[] = [];
  enemies: Enemy[] = []; gems: Gem[] = []; projectiles: Projectile[] = [];
  coconuts: Coconut[] = []; logs: SwingLog[] = [];
  gemsCollected = 0; camera = 0; chaseWorldX = -600; nextCoconutT = 0;
  clearedThisRun = false;

  playerWorldX = 80; playerY = 0; vx = 0; vy = 0;
  grounded = true; climbing = false; facing = 1; doubleJumpUsed = false; throwCooldown = 0;
  heldLeft = false; heldRight = false; jumpHeld = false;
  activePointers = new Map<number, ButtonId>();
  btnLeft: Btn = { x: 0, y: 0, r: 0 }; btnRight: Btn = { x: 0, y: 0, r: 0 };
  btnJump: Btn = { x: 0, y: 0, r: 0 }; btnAction: Btn = { x: 0, y: 0, r: 0 };

  constructor(c: HTMLCanvasElement, cb: GameEngineCallbacks) {
    this.canvas = c; this.ctx = c.getContext('2d')!; this.callbacks = cb;
    this.resize(); window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.pointerDown);
    this.canvas.addEventListener('pointerup', this.pointerUp);
    this.canvas.addEventListener('pointercancel', this.pointerUp);
    this.reset();
    try { (screen.orientation as any)?.lock?.('landscape').catch(() => {}); } catch { /* best-effort only */ }
  }
  resize = () => {
    this.w = innerWidth; this.h = innerHeight;
    this.canvas.width = this.w; this.canvas.height = this.h;
    this.landscape = this.w > this.h;
    const r = Math.max(32, Math.min(48, this.h * 0.15));
    this.btnLeft = { x: r + 26, y: this.h - r - 22, r };
    this.btnRight = { x: r * 3 + 42, y: this.h - r - 22, r };
    this.btnJump = { x: this.w - r - 26, y: this.h - r - 22, r };
    this.btnAction = { x: this.w - r * 3 - 46, y: this.h - r - 46, r: r * 0.82 };
  };
  reset = () => {
    this.progress = loadProgress();
    this.totalScore = 0;
    this.gameOver = false;
    this.scene = 'select';
    this.sceneTimer = 0;
    this.callbacks.onScoreUpdate(0);
    this.last = performance.now();
  };

  stageNodeRect = (i: number) => {
    const cols = Math.min(5, STAGES.length);
    const pad = 22;
    const cardW = Math.min(140, (this.w - pad * (cols + 1)) / cols);
    const totalW = cardW * cols + pad * (cols - 1);
    const startX = (this.w - totalW) / 2;
    const y = this.h * 0.34;
    return { x: startX + i * (cardW + pad), y, w: cardW, h: Math.min(150, this.h * 0.42) };
  };

  beginStage = (idx: number) => {
    if (idx + 1 > this.progress.unlockedStage) { this.callbacks.playTone(140, 'sawtooth', 0.08, 0.1, 90); return; }
    const cfg = STAGES[idx];
    this.stageIdx = idx;
    this.time = 0;
    this.groundY = this.h * cfg.groundYFrac;
    this.pits = []; this.platforms = []; this.vines = [];
    this.enemies = []; this.gems = []; this.projectiles = [];
    this.coconuts = []; this.logs = [];
    this.gemsCollected = 0;
    this.playerWorldX = 80; this.playerY = this.groundY;
    this.vx = 0; this.vy = 0; this.grounded = true; this.climbing = false; this.facing = 1;
    this.doubleJumpUsed = false; this.throwCooldown = 0;
    this.clearedThisRun = false;
    this.chaseWorldX = -600; this.nextCoconutT = 1.4;

    let x = 320;
    let enemyCursor = 460;
    let gemCursor = 220;
    while (x < cfg.length - 220) {
      if (Math.random() < 0.55) {
        const pw = 70 + Math.random() * 55;
        this.pits.push({ x, width: pw });
        x += pw + 130 + Math.random() * 80;
      } else {
        x += 260 + Math.random() * 180;
      }
      if (Math.random() < 0.45) {
        const platY = this.groundY - (90 + Math.random() * 70);
        const plat = { x: x + 50, width: 130, y: platY };
        this.platforms.push(plat);
        this.vines.push({ x: plat.x + 24, topY: plat.y, bottomY: this.groundY });
        this.gems.push({ x: plat.x + plat.width / 2, y: plat.y - 26, taken: false });
      }
      if (cfg.hazardType === 'log' && Math.random() < 0.4) {
        this.logs.push({ anchorX: x + 30, y: this.groundY - 90, swingLen: 85, t0: Math.random() * 3 });
      }
    }
    while (this.enemies.length < cfg.enemyCount) {
      this.enemies.push({
        x: enemyCursor, baseX: enemyCursor, range: 60 + Math.random() * 60, dir: 1, alive: true,
        type: cfg.hazardType === 'croc' && Math.random() < 0.5 ? 'croc' : 'crawler', groundY: this.groundY,
      });
      enemyCursor += cfg.length / (cfg.enemyCount + 1);
    }
    while (this.gems.length < cfg.gemCount) {
      this.gems.push({ x: gemCursor, y: this.groundY - 40, taken: false });
      gemCursor += cfg.length / cfg.gemCount;
    }

    this.camera = 0;
    this.scene = 'playing';
    this.callbacks.playTone(500, 'square', 0.07, 0.15, 760);
  };

  groundLevelAt = (x: number): number | null => {
    for (const p of this.platforms) if (x > p.x && x < p.x + p.width) return p.y;
    for (const pit of this.pits) if (x > pit.x && x < pit.x + pit.width) return null;
    return this.groundY;
  };

  hitButton = (x: number, y: number): ButtonId | null => {
    const dist = (b: Btn) => Math.hypot(x - b.x, y - b.y);
    if (dist(this.btnLeft) <= this.btnLeft.r) return 'left';
    if (dist(this.btnRight) <= this.btnRight.r) return 'right';
    if (dist(this.btnJump) <= this.btnJump.r) return 'jump';
    if (dist(this.btnAction) <= this.btnAction.r) return 'action';
    return null;
  };

  pointerDown = (e: PointerEvent) => {
    if (this.scene === 'select') {
      for (let i = 0; i < STAGES.length; i++) {
        const r = this.stageNodeRect(i);
        if (e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) {
          this.beginStage(i);
          return;
        }
      }
      return;
    }
    if (!this.landscape || this.scene !== 'playing') return;
    const hit = this.hitButton(e.clientX, e.clientY);
    if (!hit) return;
    this.activePointers.set(e.pointerId, hit);
    if (hit === 'left') this.heldLeft = true;
    if (hit === 'right') this.heldRight = true;
    if (hit === 'jump') { this.jumpHeld = true; this.onJumpPress(); }
    if (hit === 'action') this.onActionPress();
  };
  pointerUp = (e: PointerEvent) => {
    const hit = this.activePointers.get(e.pointerId);
    this.activePointers.delete(e.pointerId);
    if (!hit) return;
    const still = (id: ButtonId) => [...this.activePointers.values()].includes(id);
    if (hit === 'left') this.heldLeft = still('left');
    if (hit === 'right') this.heldRight = still('right');
    if (hit === 'jump') this.jumpHeld = still('jump');
  };

  onJumpPress = () => {
    const skills = this.progress.skills;
    if (this.grounded && !this.climbing) {
      this.vy = -680; this.grounded = false;
      this.callbacks.playTone(340, 'square', 0.06, 0.15, 520);
    } else if (skills.doubleJump && !this.doubleJumpUsed && !this.grounded && !this.climbing) {
      this.doubleJumpUsed = true; this.vy = -560;
      this.callbacks.playTone(560, 'square', 0.06, 0.15, 880);
    }
  };
  onActionPress = () => {
    if (this.throwCooldown > 0) return;
    this.throwCooldown = this.progress.skills.quickThrow ? 0.17 : 0.35;
    this.projectiles.push({ x: this.playerWorldX + this.facing * 22, y: this.playerY - 28, dir: this.facing });
    this.callbacks.playTone(1300, 'sawtooth', 0.05, 0.13, 650);
  };

  update = (dt: number) => {
    if (this.gameOver || !this.landscape) return;
    this.time += dt;
    if (this.scene === 'cleared' || this.scene === 'failed') {
      this.sceneTimer -= dt;
      if (this.sceneTimer <= 0) {
        if (this.clearedThisRun && this.stageIdx === STAGES.length - 1) {
          this.gameOver = true;
          this.callbacks.onGameOver(this.totalScore);
          return;
        }
        this.scene = 'select';
      }
      return;
    }
    if (this.scene !== 'playing') return;

    const cfg = STAGES[this.stageIdx];
    const skills = this.progress.skills;
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    const runSpeed = 210 * (skills.sprint ? 1.3 : 1);

    const onVine = this.vines.find(v => Math.abs(this.playerWorldX - v.x) < 20 && this.playerY >= v.topY - 12 && this.playerY <= v.bottomY + 12);
    if (onVine && (this.jumpHeld || this.climbing)) {
      this.climbing = true; this.vy = 0;
      if (this.jumpHeld) this.playerY -= 165 * dt;
      if (this.playerY <= onVine.topY) { this.playerY = onVine.topY; this.climbing = false; this.grounded = true; this.doubleJumpUsed = false; }
    } else {
      this.climbing = false;
    }

    if (this.climbing) {
      if (this.heldLeft) { this.playerWorldX -= runSpeed * 0.55 * dt; this.facing = -1; }
      if (this.heldRight) { this.playerWorldX += runSpeed * 0.55 * dt; this.facing = 1; }
    } else {
      this.vx = this.heldLeft ? -runSpeed : this.heldRight ? runSpeed : 0;
      if (this.heldLeft) this.facing = -1; else if (this.heldRight) this.facing = 1;
      this.playerWorldX += this.vx * dt;
      this.playerWorldX = Math.max(40, this.playerWorldX);

      this.vy += 1550 * dt;
      this.playerY += this.vy * dt;
      const groundAt = this.groundLevelAt(this.playerWorldX);
      if (groundAt !== null && this.playerY >= groundAt && this.vy >= 0) {
        this.playerY = groundAt; this.vy = 0;
        if (!this.grounded) { this.grounded = true; this.doubleJumpUsed = false; }
      } else {
        this.grounded = false;
      }
      if (this.playerY > this.groundY + 260) { this.failStage(); return; }
    }

    this.camera = Math.max(0, Math.min(this.playerWorldX - this.w * 0.32, Math.max(0, cfg.length - this.w)));

    for (const g of this.gems) {
      if (!g.taken && Math.abs(g.x - this.playerWorldX) < 24 && Math.abs(g.y - this.playerY) < 34) {
        g.taken = true; this.gemsCollected++;
        this.callbacks.playTone(1180, 'square', 0.05, 0.16, 1660);
      }
    }

    for (const pr of this.projectiles) pr.x += pr.dir * 620 * dt;
    this.projectiles = this.projectiles.filter(pr => Math.abs(pr.x - this.playerWorldX) < this.w);

    for (const en of this.enemies) {
      if (!en.alive) continue;
      en.x += 70 * en.dir * dt;
      if (en.x > en.baseX + en.range) en.dir = -1;
      if (en.x < en.baseX - en.range) en.dir = 1;

      for (const pr of this.projectiles) {
        if (Math.abs(pr.x - en.x) < 20) {
          en.alive = false;
          this.totalScore += 15; this.callbacks.onScoreUpdate(this.totalScore);
          this.callbacks.playTone(150, 'sawtooth', 0.12, 0.15, 50);
          pr.x = -999999;
        }
      }
      if (!en.alive) continue;

      const dx = Math.abs(en.x - this.playerWorldX);
      if (dx < 22) {
        const playerAbove = this.playerY < en.groundY - 16 && this.vy > 40;
        if (playerAbove && en.type === 'crawler') {
          en.alive = false; this.vy = -420;
          this.totalScore += 12; this.callbacks.onScoreUpdate(this.totalScore);
          this.callbacks.playTone(150, 'sawtooth', 0.1, 0.15, 60);
        } else if (Math.abs(en.groundY - this.playerY) < 30) {
          this.failStage(); return;
        }
      }
    }

    if (cfg.hazardType === 'coconut') {
      this.nextCoconutT -= dt;
      if (this.nextCoconutT <= 0) {
        this.coconuts.push({ x: this.camera + this.w * (0.6 + Math.random() * 0.3), y: 0, alive: true });
        this.nextCoconutT = 1.5 + Math.random() * 1.1;
      }
      for (const co of this.coconuts) {
        if (!co.alive) continue;
        co.y += 300 * dt;
        if (co.y > this.groundY) co.alive = false;
        if (Math.abs(co.x - this.playerWorldX) < 22 && Math.abs(co.y - this.playerY) < 26) { this.failStage(); return; }
      }
    } else if (cfg.hazardType === 'log') {
      for (const lg of this.logs) {
        const logX = lg.anchorX + Math.sin((this.time - lg.t0) * 1.6) * lg.swingLen;
        if (Math.abs(logX - this.playerWorldX) < 28 && Math.abs(lg.y - this.playerY) < 24) { this.failStage(); return; }
      }
    } else if (cfg.hazardType === 'chase') {
      if (this.chaseWorldX < 0) this.chaseWorldX = this.playerWorldX - 460;
      this.chaseWorldX += 105 * dt;
      if (this.chaseWorldX > this.playerWorldX - 36) { this.failStage(); return; }
    }

    if (this.playerWorldX >= cfg.length) { this.clearStage(); return; }
  };

  clearStage = () => {
    const cfg = STAGES[this.stageIdx];
    const bonus = 60 + this.gemsCollected * 12;
    this.totalScore += bonus;
    this.callbacks.onScoreUpdate(this.totalScore);
    this.clearedThisRun = true;
    if (this.gemsCollected > this.progress.bestGems[this.stageIdx]) this.progress.bestGems[this.stageIdx] = this.gemsCollected;
    if (this.stageIdx + 1 === this.progress.unlockedStage && this.progress.unlockedStage < STAGES.length) {
      this.progress.unlockedStage = this.stageIdx + 2;
    }
    if (cfg.unlocksSkill) this.progress.skills[cfg.unlocksSkill] = true;
    saveProgress(this.progress);
    this.scene = 'cleared';
    this.sceneTimer = 1.7;
    this.callbacks.playTone(523, 'square', 0.09, 0.16, 0);
    this.callbacks.playTone(659, 'square', 0.09, 0.16, 0);
    this.callbacks.playTone(784, 'square', 0.11, 0.17, 0);
  };
  failStage = () => {
    this.scene = 'failed';
    this.sceneTimer = 1.1;
    this.callbacks.playTone(170, 'sawtooth', 0.2, 0.15, 55);
  };

  draw = () => {
    const c = this.ctx;
    if (!this.landscape) { this.drawRotatePrompt(); return; }
    if (this.scene === 'select') { this.drawSelect(); return; }

    const cfg = STAGES[this.stageIdx];
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, cfg.sky[0]); g.addColorStop(1, cfg.sky[1]);
    c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);

    c.fillStyle = '#1c1210';
    c.fillRect(0, this.groundY, this.w, this.h - this.groundY);
    for (const pit of this.pits) {
      const sx = pit.x - this.camera;
      if (sx < -this.w || sx > this.w * 2) continue;
      c.fillStyle = cfg.sky[1];
      c.fillRect(sx, this.groundY, pit.width, this.h - this.groundY);
    }
    c.fillStyle = '#3f6212';
    c.fillRect(0, this.groundY, this.w, 6);

    for (const v of this.vines) {
      const sx = v.x - this.camera;
      if (sx < -30 || sx > this.w + 30) continue;
      c.strokeStyle = '#4d7c0f'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(sx, v.topY); c.lineTo(sx, v.bottomY); c.stroke();
    }
    for (const p of this.platforms) {
      const sx = p.x - this.camera;
      if (sx < -p.width || sx > this.w + p.width) continue;
      c.fillStyle = '#57534e'; c.fillRect(sx, p.y, p.width, 16);
      c.fillStyle = '#3f6212'; c.fillRect(sx, p.y - 4, p.width, 4);
    }
    for (const gm of this.gems) {
      if (gm.taken) continue;
      const sx = gm.x - this.camera;
      if (sx < -20 || sx > this.w + 20) continue;
      const bob = Math.sin(this.time * 4 + gm.x) * 4;
      c.fillStyle = '#f472b6';
      c.beginPath(); c.arc(sx, gm.y + bob, 7, 0, Math.PI * 2); c.fill();
    }
    for (const en of this.enemies) {
      if (!en.alive) continue;
      const sx = en.x - this.camera;
      if (sx < -30 || sx > this.w + 30) continue;
      const tint = en.type === 'croc' ? { o: '#0f766e', m: '#022c22' } : { o: '#65a30d', m: '#1c1917' };
      drawSprite(c, CRAWLER_ROWS, tint as any, sx - 16, en.groundY - 20, 4, en.dir < 0);
    }
    for (const pr of this.projectiles) {
      const sx = pr.x - this.camera;
      if (sx < -20 || sx > this.w + 20) continue;
      c.fillStyle = '#fde047';
      c.beginPath(); c.arc(sx, this.playerY - 28, 4, 0, Math.PI * 2); c.fill();
    }
    for (const co of this.coconuts) {
      if (!co.alive) continue;
      const sx = co.x - this.camera;
      if (sx < -20 || sx > this.w + 20) continue;
      c.fillStyle = '#78350f'; c.beginPath(); c.arc(sx, co.y, 10, 0, Math.PI * 2); c.fill();
    }
    for (const lg of this.logs) {
      const logX = lg.anchorX + Math.sin((this.time - lg.t0) * 1.6) * lg.swingLen - this.camera;
      if (logX < -50 || logX > this.w + 50) continue;
      c.fillStyle = '#92400e'; c.fillRect(logX - 26, lg.y - 8, 52, 16);
    }
    if (cfg.hazardType === 'chase' && this.chaseWorldX > -500) {
      const sx = this.chaseWorldX - this.camera;
      c.fillStyle = '#dc2626'; c.shadowBlur = 10; c.shadowColor = '#dc2626';
      c.beginPath(); c.arc(sx, this.groundY - 30, 26, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
    }

    const goalSx = cfg.length - this.camera;
    if (goalSx > -60 && goalSx < this.w + 60) {
      c.fillStyle = '#facc15'; c.fillRect(goalSx, this.groundY - 140, 6, 140);
      c.fillStyle = '#fde047'; c.fillRect(goalSx, this.groundY - 140, 42, 26);
    }

    const psx = this.playerWorldX - this.camera;
    drawSprite(c, PLAYER_ROWS, PLAYER_COLORS, psx - 20, this.playerY - 44, 4, this.facing < 0);

    c.fillStyle = 'rgba(255,255,255,.75)';
    c.font = 'bold 12px sans-serif';
    c.fillText(`${cfg.name.toUpperCase()}  ·  GEMS ${this.gemsCollected}/${cfg.gemCount}`, 16, 24);

    this.drawControls();

    if (this.scene === 'cleared') this.drawOverlay('STAGE CLEAR', '#84cc16');
    if (this.scene === 'failed') this.drawOverlay('LOST YOUR NERVE', '#ef4444');
  };

  drawControls = () => {
    const c = this.ctx;
    const drawBtn = (b: Btn, label: string, active: boolean) => {
      c.fillStyle = active ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.10)';
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.85)';
      c.font = `bold ${Math.round(b.r * 0.55)}px sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, b.x, b.y);
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    };
    drawBtn(this.btnLeft, '◀', this.heldLeft);
    drawBtn(this.btnRight, '▶', this.heldRight);
    drawBtn(this.btnJump, '▲', this.jumpHeld);
    drawBtn(this.btnAction, '●', this.throwCooldown > 0.2);
  };

  drawOverlay = (text: string, color: string) => {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.fillRect(0, 0, this.w, this.h);
    c.fillStyle = color;
    c.font = 'bold 30px sans-serif';
    c.textAlign = 'center';
    c.fillText(text, this.w / 2, this.h / 2);
    c.textAlign = 'left';
  };

  drawRotatePrompt = () => {
    const c = this.ctx;
    c.fillStyle = '#04140b'; c.fillRect(0, 0, this.w, this.h);
    c.fillStyle = '#84cc16';
    c.font = 'bold 20px sans-serif';
    c.textAlign = 'center';
    c.fillText('Rotate your phone', this.w / 2, this.h / 2 - 12);
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.font = '13px sans-serif';
    c.fillText('Jungle Swing plays in landscape', this.w / 2, this.h / 2 + 14);
    c.textAlign = 'left';
  };

  drawSelect = () => {
    const c = this.ctx;
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#0c2e1a'); g.addColorStop(1, '#04140b');
    c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);

    c.fillStyle = '#e5e7eb';
    c.font = 'bold 22px sans-serif';
    c.textAlign = 'center';
    c.fillText('JUNGLE SWING', this.w / 2, this.h * 0.14);
    c.fillStyle = '#84cc16';
    c.font = '12px sans-serif';
    c.fillText('Tap a stage to begin', this.w / 2, this.h * 0.14 + 22);

    for (let i = 0; i < STAGES.length; i++) {
      const cfg = STAGES[i];
      const r = this.stageNodeRect(i);
      const unlocked = i + 1 <= this.progress.unlockedStage;
      const cleared = this.progress.bestGems[i] > 0 || (i + 1 < this.progress.unlockedStage);
      c.fillStyle = unlocked ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.02)';
      c.strokeStyle = unlocked ? (cleared ? '#84cc16' : 'rgba(255,255,255,.25)') : 'rgba(255,255,255,.08)';
      c.lineWidth = 2;
      c.beginPath();
      const rad = 12;
      c.moveTo(r.x + rad, r.y);
      c.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad);
      c.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad);
      c.arcTo(r.x, r.y + r.h, r.x, r.y, rad);
      c.arcTo(r.x, r.y, r.x + r.w, r.y, rad);
      c.closePath();
      c.fill(); c.stroke();

      c.fillStyle = unlocked ? '#e5e7eb' : '#52525b';
      c.font = 'bold 12px sans-serif';
      c.textAlign = 'center';
      c.fillText(`${i + 1}`, r.x + r.w / 2, r.y + 22);
      c.font = '9px sans-serif';
      const words = cfg.name.split(' ');
      c.fillText(words[0], r.x + r.w / 2, r.y + 42);
      if (words[1]) c.fillText(words[1], r.x + r.w / 2, r.y + 53);

      c.fillStyle = unlocked ? '#84cc16' : '#52525b';
      c.font = '9px sans-serif';
      c.fillText(unlocked ? `BEST ${this.progress.bestGems[i]}/${cfg.gemCount}` : 'LOCKED', r.x + r.w / 2, r.y + r.h - 12);
    }
    c.textAlign = 'left';

    const skills = this.progress.skills;
    const labels: string[] = [];
    if (skills.doubleJump) labels.push('Double Jump');
    if (skills.quickThrow) labels.push('Quick Throw');
    if (skills.sprint) labels.push('Sprint');
    c.fillStyle = '#a3e635';
    c.font = '11px sans-serif';
    c.textAlign = 'center';
    c.fillText(labels.length ? `Skills unlocked: ${labels.join(' · ')}` : 'Clear stages to unlock skills', this.w / 2, this.h * 0.9);
    c.textAlign = 'left';
  };

  loop = (t: number) => {
    if (!this.running) return;
    const dt = Math.min(0.032, (t - this.last) / 1000);
    this.last = t;
    this.update(dt);
    if (!this.running) return;
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  };
  start = () => { if (this.running || this.gameOver) return; this.running = true; this.last = performance.now(); this.frame = requestAnimationFrame(this.loop); };
  stop = () => {
    this.running = false; cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    this.canvas.removeEventListener('pointerup', this.pointerUp);
    this.canvas.removeEventListener('pointercancel', this.pointerUp);
    try { (screen.orientation as any)?.unlock?.(); } catch { /* best-effort only */ }
  };
}
