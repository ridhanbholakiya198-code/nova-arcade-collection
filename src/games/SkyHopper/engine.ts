import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

type Platform={x:number;y:number;width:number;moving:boolean;dir:number};
export class SkyHopperEngine implements GameEngine {
  canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;callbacks:GameEngineCallbacks;w=0;h=0;frame=0;last=0;running=false;gameOver=false;score=0;
  px=.5;py=0;vy=-640;targetX=.5;camera=0;highest=0;platforms:Platform[]=[];
  constructor(c:HTMLCanvasElement,cb:GameEngineCallbacks){this.canvas=c;this.ctx=c.getContext('2d')!;this.callbacks=cb;this.resize();window.addEventListener('resize',this.resize);this.canvas.addEventListener('pointerdown',this.tap);this.canvas.addEventListener('pointermove',this.move);this.reset();}
  resize=()=>{this.w=innerWidth;this.h=innerHeight;this.canvas.width=this.w;this.canvas.height=this.h;};
  reset=()=>{this.score=0;this.gameOver=false;this.px=.5;this.py=-20;this.vy=-640;this.targetX=.5;this.camera=0;this.highest=0;this.platforms=[{x:.5,y:0,width:.32,moving:false,dir:1}];let y=-110;while(y>-7000){this.platforms.push({x:.15+Math.random()*.7,y,width:.18,moving:y<-700&&Math.random()>.4,dir:Math.random()>.5?1:-1});y-=95+Math.random()*55;}this.last=performance.now();};
  start=()=>{if(this.running||this.gameOver)return;this.running=true;this.last=performance.now();this.frame=requestAnimationFrame(this.loop);};
  stop=()=>{this.running=false;cancelAnimationFrame(this.frame);window.removeEventListener('resize',this.resize);this.canvas.removeEventListener('pointerdown',this.tap);this.canvas.removeEventListener('pointermove',this.move);};
  tap=(e:PointerEvent)=>{this.targetX=Math.max(.08,Math.min(.92,e.clientX/this.w));};
  move=(e:PointerEvent)=>{if(e.buttons)this.targetX=Math.max(.08,Math.min(.92,e.clientX/this.w));};
  update=(dt:number)=>{if(this.gameOver)return;for(const p of this.platforms)if(p.moving){p.x+=p.dir*.25*dt;if(p.x<.12||p.x>.88)p.dir*=-1;}this.px+=(this.targetX-this.px)*Math.min(1,dt*12);this.vy+=1500*dt;const oldY=this.py;this.py+=this.vy*dt;const desired=this.py-this.h*.45;if(desired<this.camera)this.camera=desired;if(this.camera<this.highest){const gain=Math.floor((this.highest-this.camera)/8);if(gain>0){this.score+=gain;this.callbacks.onScoreUpdate(this.score);this.highest=this.camera;}}
    if(this.vy>0){for(const p of this.platforms){const xOk=Math.abs(p.x-this.px)<p.width/2+.035;const yOk=this.py>=p.y-8&&oldY<=p.y+10;if(xOk&&yOk){this.py=p.y-16;this.vy=-640;this.callbacks.playTone(540,'triangle',.07,.14,820);break;}}}
    if(this.py-this.camera>this.h+100)this.end();
  };
  end=()=>{if(this.gameOver)return;this.gameOver=true;this.callbacks.onGameOver(this.score);};
  draw=()=>{const c=this.ctx;c.fillStyle='#000';c.fillRect(0,0,this.w,this.h);const scale=Math.min(this.w,500);for(const p of this.platforms){const sy=p.y-this.camera+this.h*.45;if(sy<-40||sy>this.h+40)continue;const x=p.x*this.w,w=p.width*this.w;c.fillStyle='#fde047';c.shadowBlur=12;c.shadowColor='#fde047';c.fillRect(x-w/2,sy,w,10);}const py=this.py-this.camera+this.h*.45,px=this.px*this.w;c.fillStyle='#fff';c.shadowBlur=18;c.shadowColor='#fde047';c.beginPath();c.arc(px,py,14,0,Math.PI*2);c.fill();c.shadowBlur=0;};
  loop=(t:number)=>{if(!this.running)return;const dt=Math.min(.032,(t-this.last)/1000);this.last=t;this.update(dt);if(!this.running)return;this.draw();this.frame=requestAnimationFrame(this.loop);};
}
