import { GameEngine, GameEngineCallbacks } from '../../components/GameContainer';

type Cell={x:number;y:number};
type Dir={x:number;y:number};

export class NeonSnakeEngine implements GameEngine {
  canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;callbacks:GameEngineCallbacks;
  width=0;height=0;frame=0;lastTime=0;acc=0;running=false;gameOver=false;score=0;
  cols=18;rows=28;stepMs=150;snake:Cell[]=[];food:Cell={x:0,y:0};dir:Dir={x:1,y:0};queued:Dir={x:1,y:0};portalA:Cell|null=null;portalB:Cell|null=null;
  constructor(canvas:HTMLCanvasElement,callbacks:GameEngineCallbacks){this.canvas=canvas;this.ctx=canvas.getContext('2d')!;this.callbacks=callbacks;this.resize();window.addEventListener('resize',this.resize);this.canvas.addEventListener('pointerdown',this.onPointer);this.canvas.addEventListener('pointermove',this.onSwipeMove);window.addEventListener('keydown',this.onKey);this.reset();}
  resize=()=>{this.width=innerWidth;this.height=innerHeight;this.canvas.width=this.width;this.canvas.height=this.height;};
  reset=()=>{this.score=0;this.stepMs=150;this.gameOver=false;this.snake=[{x:8,y:14},{x:7,y:14},{x:6,y:14}];this.dir={x:1,y:0};this.queued={x:1,y:0};this.portalA=null;this.portalB=null;this.placeFood();this.placePortals();this.acc=0;this.lastTime=performance.now();};
  start=()=>{if(this.running||this.gameOver)return;this.running=true;this.lastTime=performance.now();this.frame=requestAnimationFrame(this.loop);};
  stop=()=>{this.running=false;cancelAnimationFrame(this.frame);window.removeEventListener('resize',this.resize);this.canvas.removeEventListener('pointerdown',this.onPointer);this.canvas.removeEventListener('pointermove',this.onSwipeMove);window.removeEventListener('keydown',this.onKey);};
  placeFood=()=>{do{this.food={x:Math.floor(Math.random()*this.cols),y:Math.floor(Math.random()*this.rows)}}while(this.snake.some(s=>s.x===this.food.x&&s.y===this.food.y));};
  placePortals=()=>{if(Math.random()<.55){const pick=()=>({x:Math.floor(Math.random()*this.cols),y:Math.floor(Math.random()*this.rows)});let a=pick(),b=pick();let tries=0;while((this.snake.some(s=>s.x===a.x&&s.y===a.y)||a.x===this.food.x&&a.y===this.food.y)&&tries++<30)a=pick();tries=0;while((this.snake.some(s=>s.x===b.x&&s.y===b.y)||b.x===this.food.x&&b.y===this.food.y||(a.x===b.x&&a.y===b.y))&&tries++<30)b=pick();this.portalA=a;this.portalB=b;}};
  setDir=(d:Dir)=>{if(d.x===-this.dir.x&&d.y===-this.dir.y)return;this.queued=d;};
  onKey=(e:KeyboardEvent)=>{if(e.key==='ArrowUp')this.setDir({x:0,y:-1});else if(e.key==='ArrowDown')this.setDir({x:0,y:1});else if(e.key==='ArrowLeft')this.setDir({x:-1,y:0});else if(e.key==='ArrowRight')this.setDir({x:1,y:0});};
  touchStart={x:0,y:0};
  onPointer=(e:PointerEvent)=>{this.touchStart={x:e.clientX,y:e.clientY};};
  onSwipeMove=(e:PointerEvent)=>{if(e.buttons===0)return;const dx=e.clientX-this.touchStart.x,dy=e.clientY-this.touchStart.y;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;if(Math.abs(dx)>Math.abs(dy))this.setDir({x:Math.sign(dx),y:0});else this.setDir({x:0,y:Math.sign(dy)});this.touchStart={x:e.clientX,y:e.clientY};};
  tick=()=>{this.dir=this.queued;let head={x:this.snake[0].x+this.dir.x,y:this.snake[0].y+this.dir.y};head.x=(head.x+this.cols)%this.cols;head.y=(head.y+this.rows)%this.rows;if(this.portalA&&this.portalB){if(head.x===this.portalA.x&&head.y===this.portalA.y)head={...this.portalB};else if(head.x===this.portalB.x&&head.y===this.portalB.y)head={...this.portalA};}
    if(this.snake.some((s,i)=>i>0&&s.x===head.x&&s.y===head.y)){this.gameOver=true;this.callbacks.onGameOver(this.score);return;}
    this.snake.unshift(head);
    if(head.x===this.food.x&&head.y===this.food.y){this.score+=10;this.callbacks.onScoreUpdate(this.score);this.callbacks.playTone(700,'square',.08,.16,1050);this.placeFood();if(this.score%50===0)this.stepMs=Math.max(70,this.stepMs-10);if(Math.random()>.6)this.placePortals();}else this.snake.pop();
  };
  update=(dt:number)=>{this.acc+=dt*1000;while(this.acc>=this.stepMs&&!this.gameOver){this.acc-=this.stepMs;this.tick();}};
  draw=()=>{const c=this.ctx;c.fillStyle='#000';c.fillRect(0,0,this.width,this.height);const cell=Math.min((this.width-36)/this.cols,(this.height-120)/this.rows),ox=(this.width-cell*this.cols)/2,oy=(this.height-cell*this.rows)/2+25;
    c.strokeStyle='#151515';c.lineWidth=1;for(let x=0;x<=this.cols;x++){c.beginPath();c.moveTo(ox+x*cell,oy);c.lineTo(ox+x*cell,oy+this.rows*cell);c.stroke();}for(let y=0;y<=this.rows;y++){c.beginPath();c.moveTo(ox,oy+y*cell);c.lineTo(ox+this.cols*cell,oy+y*cell);c.stroke();}
    const drawCell=(p:Cell,color:string,glow:number)=>{c.fillStyle=color;c.shadowBlur=glow;c.shadowColor=color;c.fillRect(ox+p.x*cell+2,oy+p.y*cell+2,cell-4,cell-4);}; 
    if(this.portalA&&this.portalB){drawCell(this.portalA,'#a78bfa',10);drawCell(this.portalB,'#a78bfa',10);}
    drawCell(this.food,'#facc15',12);this.snake.forEach((s,i)=>drawCell(s,i===0?'#22d3ee':'#0e7490',i===0?14:4));c.shadowBlur=0;
  };
  loop=(t:number)=>{if(!this.running)return;const dt=Math.min(.05,(t-this.lastTime)/1000);this.lastTime=t;this.update(dt);if(!this.running)return;this.draw();this.frame=requestAnimationFrame(this.loop);};
}
