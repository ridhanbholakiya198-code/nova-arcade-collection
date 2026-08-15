import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

type Obstacle = { x: number; top: boolean; width: number; height: number; scored: boolean };

export class GravityFlipEngine implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameEngineCallbacks;
  width = 0; height = 0; frame = 0; lastTime = 0;
  score = 0; isGameOver = false; running = false;
  gravityDown = true; playerY = 0.5; speed = 260; spawnTimer = 0; nextSpawn = 1;
  obstacles: Obstacle[] = [];
  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d')!; this.callbacks=callbacks;
    this.resize(); window.addEventListener('resize',this.resize); this.canvas.addEventListener('pointerdown',this.flip); this.reset();
  }
  resize=()=>{this.width=window.innerWidth;this.height=window.innerHeight;this.canvas.width=this.width;this.canvas.height=this.height;};
  reset=()=>{this.score=0;this.isGameOver=false;this.gravityDown=true;this.playerY=.5;this.speed=260;this.spawnTimer=0;this.nextSpawn=.9;this.obstacles=[];this.lastTime=performance.now();};
  start=()=>{if(this.running||this.isGameOver)return;this.running=true;this.lastTime=performance.now();this.frame=requestAnimationFrame(this.loop);};
  stop=()=>{this.running=false;cancelAnimationFrame(this.frame);window.removeEventListener('resize',this.resize);this.canvas.removeEventListener('pointerdown',this.flip);};
  flip=(e:PointerEvent)=>{e.preventDefault();if(this.isGameOver)return;this.gravityDown=!this.gravityDown;this.callbacks.playTone(420,'triangle',.08,.18,this.gravityDown?260:620);};
  end=()=>{if(this.isGameOver)return;this.isGameOver=true;this.callbacks.onGameOver(this.score);};
  update=(dt:number)=>{
    if(this.isGameOver)return;
    this.speed+=dt*6; this.spawnTimer+=dt;
    if(this.spawnTimer>=this.nextSpawn){this.spawnTimer=0;this.nextSpawn=.8+Math.random()*.65;this.obstacles.push({x:this.width+50,top:Math.random()>.5,width:36,height:45+Math.random()*65,scored:false});}
    const railTop=70,railBottom=this.height-70;
    const target=this.gravityDown?railBottom:railTop;
    this.playerY+=(target-this.playerY)*Math.min(1,dt*15);
    for(const o of this.obstacles)o.x-=this.speed*dt;
    const px=this.width*.22, py=this.playerY;
    for(const o of this.obstacles){
      const oy=o.top?railTop+o.height/2:railBottom-o.height/2;
      if(Math.abs(o.x-px)<(o.width+26)/2 && Math.abs(oy-py)<(o.height+26)/2){this.end();return;}
      if(!o.scored&&o.x+o.width<px){o.scored=true;this.score++;this.callbacks.onScoreUpdate(this.score);}
    }
    this.obstacles=this.obstacles.filter(o=>o.x>-80);
  };
  draw=()=>{
    const c=this.ctx;c.fillStyle='#000';c.fillRect(0,0,this.width,this.height);
    const top=70,bottom=this.height-70,px=this.width*.22;
    c.strokeStyle='#27272a';c.lineWidth=2;c.beginPath();c.moveTo(0,top);c.lineTo(this.width,top);c.moveTo(0,bottom);c.lineTo(this.width,bottom);c.stroke();
    c.fillStyle='#ec4899';c.shadowBlur=16;c.shadowColor='#ec4899';
    for(const o of this.obstacles){c.fillRect(o.x-o.width/2,o.top?top:bottom-o.height,o.width,o.height);}
    c.fillStyle='#fff';c.shadowColor='#ec4899';c.beginPath();c.arc(px,this.playerY,14,0,Math.PI*2);c.fill();
    c.shadowBlur=0;
  };
  loop=(time:number)=>{if(!this.running)return;const dt=Math.min(.05,(time-this.lastTime)/1000);this.lastTime=time;this.update(dt);if(!this.running)return;this.draw();this.frame=requestAnimationFrame(this.loop);};
}
