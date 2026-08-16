import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

const COLORS=['#ec4899','#22d3ee','#fde047','#4ade80','#a78bfa','#fb923c'];

export class ColorMatchEngine implements GameEngine {
  canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;callbacks:GameEngineCallbacks;w=0;h=0;frame=0;last=0;running=false;gameOver=false;score=0;timeLeft=3;maxTime=3;target='';options:string[]=[];buttons:{x:number;y:number;r:number;color:string}[]=[];
  constructor(c:HTMLCanvasElement,cb:GameEngineCallbacks){this.canvas=c;this.ctx=c.getContext('2d')!;this.callbacks=cb;this.resize();window.addEventListener('resize',this.resize);this.canvas.addEventListener('pointerdown',this.tap);this.reset();}
  resize=()=>{this.w=innerWidth;this.h=innerHeight;this.canvas.width=this.w;this.canvas.height=this.h;this.layout();};
  reset=()=>{this.score=0;this.gameOver=false;this.maxTime=3;this.timeLeft=3;this.newRound();this.last=performance.now();};
  start=()=>{if(this.running||this.gameOver)return;this.running=true;this.last=performance.now();this.frame=requestAnimationFrame(this.loop);};
  stop=()=>{this.running=false;cancelAnimationFrame(this.frame);window.removeEventListener('resize',this.resize);this.canvas.removeEventListener('pointerdown',this.tap);};
  newRound=()=>{this.target=COLORS[Math.floor(Math.random()*COLORS.length)];const count=Math.min(6,4+Math.floor(this.score/40));const set=new Set([this.target]);while(set.size<count)set.add(COLORS[Math.floor(Math.random()*COLORS.length)]);this.options=[...set].sort(()=>Math.random()-.5);this.maxTime=Math.max(.9,3-this.score*.02);this.timeLeft=this.maxTime;this.layout();};
  layout=()=>{const gap=Math.min(22,this.w*.04),r=Math.min(58,(this.w-gap*3)/8);this.buttons=[];this.options.forEach((color,i)=>{const cols=this.options.length<=4?2:3,row=Math.floor(i/cols),col=i%cols;const total=cols*r*2+(cols-1)*gap;const x=this.w/2-total/2+r+col*(2*r+gap);const y=this.h*.58+row*(2*r+gap);this.buttons.push({x,y,r,color});});};
  tap=(e:PointerEvent)=>{if(this.gameOver)return;const hit=this.buttons.find(b=>Math.hypot(e.clientX-b.x,e.clientY-b.y)<=b.r);if(!hit)return;if(hit.color===this.target){this.score+=10;this.callbacks.onScoreUpdate(this.score);this.callbacks.playTone(620,'triangle',.08,.17,980);this.newRound();}else this.end();};
  end=()=>{if(this.gameOver)return;this.gameOver=true;this.callbacks.onGameOver(this.score);};
  update=(dt:number)=>{if(this.gameOver)return;this.timeLeft-=dt;if(this.timeLeft<=0)this.end();};
  draw=()=>{const c=this.ctx;c.fillStyle='#000';c.fillRect(0,0,this.w,this.h);c.textAlign='center';c.fillStyle='#71717a';c.font='700 13px system-ui';c.fillText('MATCH THIS COLOR',this.w/2,this.h*.28);c.fillStyle=this.target;c.shadowBlur=13;c.shadowColor=this.target;c.beginPath();c.arc(this.w/2,this.h*.39,58,0,Math.PI*2);c.fill();c.shadowBlur=0;c.strokeStyle='#27272a';c.lineWidth=8;c.beginPath();c.arc(this.w/2,this.h*.39,76,-Math.PI/2,-Math.PI/2+(this.timeLeft/this.maxTime)*Math.PI*2);c.stroke();for(const b of this.buttons){c.fillStyle=b.color;c.shadowBlur=9;c.shadowColor=b.color;c.beginPath();c.arc(b.x,b.y,b.r,0,Math.PI*2);c.fill();}c.shadowBlur=0;};
  loop=(t:number)=>{if(!this.running)return;const dt=Math.min(.05,(t-this.last)/1000);this.last=t;this.update(dt);if(!this.running)return;this.draw();this.frame=requestAnimationFrame(this.loop);};
}
