import {useEffect,useRef} from 'react';
import type {RoomSnapshot,PlacedOffering,OfferingKind,SharedAction} from './protocol';
import type {SceneLayoutId} from '../config/sceneLayout';
import {roomAssets,stationAnchor,altarPoint} from './layout';
import {interactionTime} from './ritual';
import {subscribeSceneAnimation} from './sceneAnimation';
import {offeringCandidates,visibleOfferings} from './placedOfferings';
function Station({slot,kind,action,layout,offset,reduced}:{slot:number;kind:OfferingKind;action?:SharedAction;layout:SceneLayoutId;offset:number;reduced:boolean}) {
 const bell=useRef<HTMLImageElement>(null);
 const anchor=stationAnchor(slot,layout,kind==='bell'?'bell':'incense'),floor=altarPoint(slot,layout);
 const pivot=kind==='lotus'?0.06:kind==='bell'?0.17:0.10;
 const height=(anchor.floorY-anchor.y)/(0.98-pivot);
 const image=kind==='lotus'?'flower-station':kind==='bell'?'bell-station':'urn';
 const style={left:`${anchor.x}%`,top:`${anchor.y}%`,height:`${height}%`,transform:`translate(-50%,-${pivot*100}%)`};
 useEffect(()=>{
  if(kind!=='bell'||!action||!bell.current)return;
  const at=interactionTime(action)!;
  return subscribeSceneAnimation(now=>{const age=now+offset-at;if(!bell.current)return false;
   bell.current.style.rotate=!reduced&&age>=0&&age<650?`${Math.sin(age/33)*2*(1-age/650)}deg`:'0deg';
   bell.current.dataset.struck=String(age>=0);return age<650;
  });
 },[kind,action?.id,layout,offset,reduced]);
 return <><img className="offering-station station-back" src={roomAssets.effect(image)} alt="" style={{...style,zIndex:Math.round(floor.y*100)-2,...(kind==='bell'?{clipPath:'inset(27% 0 0 0)'}:{})}}/>
 <img ref={kind==='bell'?bell:undefined} className={`offering-station station-front station-${kind}`} src={roomAssets.effect(image)} alt="" style={{...style,zIndex:Math.round(floor.y*100)+4,clipPath:kind==='bell'?'inset(0 0 73% 0)':kind==='lotus'?'inset(6% 0 0 0)':'inset(10% 0 0 0)'}}/>
 </>;
}
function ResultVisual({item,index,candidates,layout,offset,reduced}:{item:PlacedOffering;index:number;candidates:PlacedOffering[];layout:SceneLayoutId;offset:number;reduced:boolean}) {
 const root=useRef<HTMLDivElement>(null),wisps=useRef<HTMLDivElement>(null),petals=useRef<HTMLDivElement>(null);
 const current=useRef({item,index,candidates,layout,offset,reduced});current.current={item,index,candidates,layout,offset,reduced};
 useEffect(()=>subscribeSceneAnimation(localNow=>{
  const{item,index,candidates,layout,offset,reduced}=current.current;
  if(!root.current||!wisps.current||!petals.current)return false;
  const now=localNow+offset,age=now-item.placedAt,anchor=stationAnchor(item.slot,layout,item.kind),floor=altarPoint(item.slot,layout);
  const visible=visibleOfferings(candidates,now).some(candidate=>candidate.id===item.id);
  root.current.style.display=visible?'block':'none';
  root.current.dataset.placed=String(visible);
  root.current.style.left=`${anchor.x+(item.kind==='incense'?(index%3-1)*0.12:0)}%`;root.current.style.top=`${anchor.y}%`;root.current.style.zIndex=String(Math.round(floor.y*100)+3);
  root.current.style.opacity=String(Math.min(1,(item.expiresAt-now)/1200));
  wisps.current.style.display=reduced||item.kind!=='incense'?'none':'block';
  for(const[w,child]of Array.from(wisps.current.children).entries()) {
   const element=child as HTMLElement;const p=((Math.max(0,age)/2800+w/3)%1);
   element.style.transform=`translate(${Math.sin(p*5+w)*4}px,${-p*25}px) scale(${0.5+p})`;element.style.opacity=String((1-p)*0.18);
  }
  for(const[i,child]of Array.from(petals.current.children).entries()) {
   const element=child as HTMLElement;const p=Math.min(1,Math.max(0,(age-i*70)/1700));
   const fall=(floor.y-anchor.y)/100*(root.current.parentElement?.getBoundingClientRect().height??500);
   element.style.display=reduced?'none':'block';element.style.transform=`translate(${(i-3.5)*3*p}px,${p*p*fall}px) rotate(${i*42+p*35}deg)`;
  }
  return now<item.expiresAt;
 }),[item.id,layout,reduced]);
 return <div ref={root} className={`placed-offering placed-${item.kind}`} data-offering-id={item.id} data-action-id={item.actionId} data-effect={item.kind}>
  {item.kind!=='petal'&&<img className="placed-object" src={roomAssets.effect(item.kind)} alt=""/>}
  <div ref={wisps} className="incense-smoke">{[0,1,2].map(i=><i key={i}/>)}</div>
  <div ref={petals} className="released-petals">{item.kind==='petal'&&Array.from({length:8},(_,i)=><img key={i} src={roomAssets.effect('petal')} alt=""/>)}</div>
 </div>;
}
export function OfferingLayer({room,layout,offset,reduced}:{room:RoomSnapshot;layout:SceneLayoutId;offset:number;reduced:boolean}) {
 const results=offeringCandidates(room);
 return <div className="offering-layer" aria-hidden="true">{[0,1,2,3].map(slot=>{const action=room.people.find(p=>p.action?.slot===slot)?.action??undefined;const previous=room.offerings.filter(item=>item.slot===slot&&item.kind!=='petal').at(-1)?.kind??'incense';const kind=action?.offering&&action.offering!=='petal'?action.offering:previous;return <Station key={slot} slot={slot} kind={kind} action={action} layout={layout} offset={offset} reduced={reduced}/>;})}
 {results.map((item,index)=><ResultVisual key={item.id} item={item} index={index} candidates={results} layout={layout} offset={offset} reduced={reduced}/>)}</div>;
}
