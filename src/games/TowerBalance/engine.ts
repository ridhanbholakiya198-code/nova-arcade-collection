import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

type Block={center:number;width:number};
export class TowerBalanceEngine implements GameEngine {
  canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;callbacks:GameEngineCallbacks;w=0;h=0;frame=0;last=0;running=false;gameOver=false;score=0;movingX=.2;dir=1;speed=.55;currentWidth=.32;tower:Block[]=[];
  constructor(c:HTMLCanvasElement,cb:GameEngineCallbacks){this.canvas=c;this.ctx=c.getContext('2d')!;this.callbacks=cb;this.resize();window.addEventListener('resize',this.resize);this.canvas.addEventListener('pointerdown',this.drop);this.reset();}
  resize=()=>{this.w=innerWidth;this.h=innerHeight;this.canvas.width=this.w;this.canvas.height=this.h;};
  reset=()=>{this.score=0;this.gameOver=false;this.movingX=.2;this.dir=1;this.speed=.55;this.currentWidth=.32;this.tower=[{center:.5,width:.32}];this.last=performance.now();};
  start=()=>{if(this.running||this.gameOver)return;this.running=true;this.last=performance.now();this.frame=requestAnimationFrame(this.loop);};
  stop=()=>{this.running=false;cancelAnimationFrame(this.frame);window.removeEventListener('resize',this.resize);this.canvas.removeEventListener('pointerdown',this.drop);};
  drop=()=>{if(this.gameOver)return;const last=this.tower[this.tower.length-1];const left=Math.max(this.movingX-this.currentWidth/2,last.center-last.width/2);const right=Math.min(this.movingX+this.currentWidth/2,last.center+last.width/2);const overlap=right-left;if(overlap<=.015){this.end();return;}const width=overlap,center=(left+right)/2;this.tower.push({center,width});this.currentWidth=Math.max(.055,width*.98);this.score++;this.callbacks.onScoreUpdate(this.score);this.callbacks.playTone(480+this.score*8,'triangle',.08,.15,700);this.speed=Math.min(1.4,this.speed+.02);this.movingX=this.dir>0?.05:.95;};
  update=(dt:number)=>{if(this.gameOver)return;this.movingX+=this.dir*this.speed*dt;const half=this.currentWidth/2;if(this.movingX-half<0){this.movingX=half;this.dir=1;}if(this.movingX+half>1){this.movingX=1-half;this.dir=-1;}};
  end=()=>{if(this.gameOver)return;this.gameOver=true;this.callbacks.onGameOver(this.score);};
  draw=()=>{const c=this.ctx;c.fillStyle='#000';c.fillRect(0,0,this.w,this.h);const baseY=this.h-90,blockH=26,viewCount=Math.min(this.tower.length,18);const start=Math.max(0,this.tower.length-viewCount);for(let i=start;i<this.tower.length;i++){const b=this.tower[i],idx=i-start;const y=baseY-(i-start)*blockH;c.fillStyle=i===this.tower.length-1?'#fcd34d':'#a16207';c.shadowBlur=i===this.tower.length-1?14:4;c.shadowColor='#fcd34d';c.fillRect(b.center*this.w-b.width*this.w/2,y-blockH,b.width*this.w,blockH-3);}const movingY=baseY-viewCount*blockH-5;c.fillStyle='#fff';c.shadowBlur=9;c.shadowColor='#fcd34d';c.fillRect(this.movingX*this.w-this.currentWidth*this.w/2,movingY-this.currentWidth*0+0,this.currentWidth*this.w,blockH-3);c.shadowBlur=0;};
  loop=(t:number)=>{if(!this.running)return;const dt=Math.min(.04,(t-this.last)/1000);this.last=t;this.update(dt);if(!this.running)return;this.draw();this.frame=requestAnimationFrame(this.loop);};
}
