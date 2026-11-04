type Draw=(now:number)=>boolean;
const drawings=new Map<Draw,boolean>();
let raf=0,last=0,windowStart=0,frames=0,totalCost=0;
function tick(timestamp:number) {
 raf=0;if(document.hidden)return;
 if(timestamp-last<32){raf=requestAnimationFrame(tick);return;}
 last=timestamp;const started=performance.now();let active=false,drawCount=0;
 for(const[draw,wasActive]of drawings)if(wasActive){const running=draw(Date.now());drawings.set(draw,running);active=running||active;drawCount++;}
 totalCost+=performance.now()-started;frames++;
 if(!windowStart)windowStart=timestamp;
 if(timestamp-windowStart>=1500){
  const scene=document.querySelector<HTMLElement>('.room-painting');
  if(scene){scene.dataset.sceneFps=(frames*1000/(timestamp-windowStart)).toFixed(1);scene.dataset.sceneDrawMs=(totalCost/frames).toFixed(3);scene.dataset.sceneDrawCount=String(drawCount);}
  windowStart=timestamp;frames=0;totalCost=0;
 }
 if(active)raf=requestAnimationFrame(tick);else{windowStart=0;frames=0;totalCost=0;}
}
const wake=()=>{if(!raf&&!document.hidden){windowStart=0;frames=0;totalCost=0;raf=requestAnimationFrame(tick);}};
const visible=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;return;}for(const[draw]of drawings)drawings.set(draw,draw(Date.now()));wake();};
export function subscribeSceneAnimation(draw:Draw){
 drawings.set(draw,draw(Date.now()));wake();if(drawings.size===1)document.addEventListener('visibilitychange',visible);
 return()=>{drawings.delete(draw);if(!drawings.size){cancelAnimationFrame(raf);raf=0;document.removeEventListener('visibilitychange',visible);}};
}
