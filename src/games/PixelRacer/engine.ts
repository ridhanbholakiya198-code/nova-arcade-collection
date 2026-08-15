import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

type Car={lane:number;y:number;speed:number;scored:boolean};
export class PixelRacerEngine implements GameEngine {
  canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;callbacks:GameEngineCallbacks;w=0;h=0;frame=0;last=0;running=false;gameOver=false;score=0;lane=1;targetLane=1;speed=330;spawn=0;cars:Car[]=[];
  constructor(c:HTMLCanvasElement,cb:GameEngineCallbacks){this.canvas=c;this.ctx=c.getContext('2d')!;this.callbacks=cb;this.resize();window.addEventListener('resize',this.resize);this.canvas.addEventListener('pointerdown',this.tap);this.canvas.addEventListener('pointermove',this.swipe);window.addEventListener('keydown',this.key);this.reset();}
  resize=()=>{this.w=innerWidth;this.h=innerHeight;this.canvas.width=this.w;this.canvas.height=this.h;};
  reset=()=>{this.score=0;this.gameOver=false;this.lane=1;this.targetLane=1;this.speed=330;this.spawn=0;this.cars=[];this.last=performance.now();};
  start=()=>{if(this.running||this.gameOver)return;this.running=true;this.last=performance.now();this.frame=requestAnimationFrame(this.loop);};
  stop=()=>{this.running=false;cancelAnimationFrame(this.frame);window.removeEventListener('resize',this.resize);this.canvas.removeEventListener('pointerdown',this.tap);this.canvas.removeEventListener('pointermove',this.swipe);window.removeEventListener('keydown',this.key);};
  setLane=(n:number)=>{this.targetLane=Math.max(0,Math.min(2,n));this.callbacks.playTone(330,'square',.04,.09);};
  tap=(e:PointerEvent)=>{this.setLane(Math.round((e.clientX/this.w)*2));};
  startX=0;
  swipe=(e:PointerEvent)=>{if(e.buttons===0)return;if(!this.startX)this.startX=e.clientX;const dx=e.clientX-this.startX;if(Math.abs(dx)>30){this.setLane(this.targetLane+(dx>0?1:-1));this.startX=e.clientX;}};
  key=(e:KeyboardEvent)=>{if(e.key==='ArrowLeft')this.setLane(this.targetLane-1);if(e.key==='ArrowRight')this.setLane(this.targetLane+1);};
  update=(dt:number)=>{if(this.gameOver)return;this.lane+=(this.targetLane-this.lane)*Math.min(1,dt*14);this.speed+=dt*7;this.spawn+=dt;if(this.spawn>.75){this.spawn=0;const lane=Math.floor(Math.random()*3);this.cars.push({lane,y:-90,speed:this.speed*(.8+Math.random()*.35),scored:false});}
    const playerY=this.h-130;for(const car of this.cars){car.y+=car.speed*dt;if(!car.scored&&car.y>playerY+30){car.scored=true;this.score++;this.callbacks.onScoreUpdate(this.score);}if(Math.abs(car.lane-this.lane)<.34&&Math.abs(car.y-playerY)<54)this.end();}this.cars=this.cars.filter(c=>c.y<this.h+120);
  };
  end=()=>{if(this.gameOver)return;this.gameOver=true;this.callbacks.onGameOver(this.score);};
  draw=()=>{const c=this.ctx;c.fillStyle='#000';c.fillRect(0,0,this.w,this.h);const roadW=Math.min(this.w-30,420),left=(this.w-roadW)/2,laneW=roadW/3;c.fillStyle='#09090b';c.fillRect(left,0,roadW,this.h);c.strokeStyle='#27272a';c.lineWidth=3;for(let i=1;i<3;i++){for(let y=(this.frame%50)-50;y<this.h;y+=50){c.beginPath();c.moveTo(left+i*laneW,y);c.lineTo(left+i*laneW,y+25);c.stroke();}}for(const car of this.cars){const x=left+(car.lane+.5)*laneW;c.fillStyle='#c084fc';c.shadowBlur=14;c.shadowColor='#a78bfa';c.fillRect(x-22,car.y-34,44,68);}const px=left+(this.lane+.5)*laneW,py=this.h-130;c.fillStyle='#fff';c.shadowBlur=18;c.shadowColor='#a78bfa';c.fillRect(px-22,py-34,44,68);c.fillStyle='#000';c.fillRect(px-12,py-25,24,14);c.shadowBlur=0;};
  loop=(t:number)=>{if(!this.running)return;const dt=Math.min(.05,(t-this.last)/1000);this.last=t;this.frame+=dt*60;this.update(dt);if(!this.running)return;this.draw();this.frame=requestAnimationFrame(this.loop);};
}
